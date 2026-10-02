import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, CalendarClock, AlertTriangle, Users, Plus, Sparkles, ImagePlus, BookPlus, ArrowRight, PenLine, FileText, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Owl } from '@/components/LoginScene';
import AttentionPanel from '@/components/AttentionPanel';
import StudentHistory from '@/components/StudentHistory';
import { Skeleton } from '@/components/Skeleton';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const plusDays = n => {
  const d = new Date(todayKey() + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const dueLabel = prazo => {
  const days = Math.round((new Date(prazo + 'T12:00:00') - new Date(todayKey() + 'T12:00:00')) / 864e5);
  return days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : new Date(prazo + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
};

// Início do professor: o que precisa da atenção dele hoje.
export default function TeacherHome() {
  const user = getUser();
  const [data, setData] = useState(null);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    Promise.allSettled([api.get('/workspace'), api.get('/admin/stats'), api.get('/admin/students/attention')]).then(([w, s, a]) =>
      setData({
        workspace: w.status === 'fulfilled' ? w.value.data : { atividades: [], correcoes: [] },
        stats: s.status === 'fulfilled' ? s.value.data : {},
        attention: a.status === 'fulfilled' ? a.value.data : []
      })
    );
  }, []);

  const first = (user?.nome || '').split(' ')[0];
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const actions = [
    [Plus, 'Criar atividade', '/admin/activities?nova=1'],
    [Sparkles, 'Novo quiz', '/quizzes'],
    [ImagePlus, 'Publicar no mural', '/admin/mural'],
    [BookPlus, 'Enviar livro', '/admin/books']
  ];

  const activities = data?.workspace.atividades || [];
  const toGrade = activities.filter(a => a.corrigir > 0).sort((a, b) => b.corrigir - a.corrigir);
  const texts = (data?.workspace.correcoes || []).filter(c => c.quantidade > 0);
  const gradeTotal = toGrade.reduce((s, a) => s + a.corrigir, 0) + texts.reduce((s, c) => s + c.quantidade, 0);
  const week = activities.filter(a => a.prazo && a.prazo.slice(0, 10) >= todayKey() && a.prazo.slice(0, 10) <= plusDays(7)).sort((a, b) => a.prazo.localeCompare(b.prazo));

  const summary = !data
    ? 'Organizando o seu dia…'
    : gradeTotal || week.length
      ? `Você tem ${gradeTotal} ${gradeTotal === 1 ? 'entrega' : 'entregas'} para corrigir e ${week.length} ${week.length === 1 ? 'prazo' : 'prazos'} nos próximos 7 dias.`
      : 'Tudo em dia por aqui. Que tal propor uma nova leitura para a turma?';

  return (
    <div className="th">
      <section className="th-hero">
        <div className="th-hero-copy">
          <p className="th-date">{date}</p>
          <h1>
            {greeting()}, <em>{first}</em>!
          </h1>
          <p>{summary}</p>
          <div className="th-actions">
            {actions.map(([Icon, label, to]) => (
              <Link key={to} to={to}>
                <Icon size={16} /> {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="th-owl" aria-hidden="true">
          <Owl size={120} />
        </div>
      </section>

      <section className="th-kpis" aria-label="Resumo do dia">
        {[
          [ClipboardCheck, 'Para corrigir', gradeTotal, '/workspace', 'is-violet'],
          [CalendarClock, 'Prazos em 7 dias', week.length, '/admin/calendar', 'is-amber'],
          [AlertTriangle, 'Precisam de atenção', data?.attention.length ?? 0, '/admin/classes', 'is-rose'],
          [Users, 'Alunos', data?.stats.total_users ?? '—', '/admin/classes', 'is-blue']
        ].map(([Icon, label, value, to, tone]) => (
          <Link key={label} to={to} className={`th-kpi ${tone}`}>
            <span className="th-kpi-icon">
              <Icon size={18} />
            </span>
            {data ? <strong>{value}</strong> : <Skeleton width={48} height={30} />}
            <span>{label}</span>
          </Link>
        ))}
      </section>

      <div className="th-grid">
        <section className="ws-card th-card">
          <header>
            <h2>
              <ClipboardCheck size={18} /> Para corrigir agora
            </h2>
            <Link to="/workspace">
              Ver tudo <ArrowRight size={14} />
            </Link>
          </header>
          {!data ? (
            <div className="th-list">
              <Skeleton lines={3} height={46} />
            </div>
          ) : toGrade.length || texts.length ? (
            <ul className="th-list">
              {toGrade.slice(0, 5).map(a => (
                <li key={a.id}>
                  <Link to={a.link}>
                    <span className="th-item-icon">
                      <ClipboardList size={16} />
                    </span>
                    <span className="th-item-copy">
                      <strong>{a.titulo}</strong>
                      <small>
                        {a.entregaram.length} de {a.entregaram.length + a.faltam.length} entregaram
                      </small>
                    </span>
                    <b className="th-count">{a.corrigir}</b>
                  </Link>
                </li>
              ))}
              {texts.map(c => (
                <li key={c.link}>
                  <Link to={c.link}>
                    <span className="th-item-icon is-pink">{c.titulo.startsWith('Resumo') ? <FileText size={16} /> : <PenLine size={16} />}</span>
                    <span className="th-item-copy">
                      <strong>{c.titulo}</strong>
                      <small>Aguardando nota e comentário</small>
                    </span>
                    <b className="th-count">{c.quantidade}</b>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="th-done">
              <CheckCircle2 size={18} /> Nenhuma entrega esperando correção.
            </p>
          )}
        </section>

        <section className="ws-card th-card">
          <header>
            <h2>
              <CalendarClock size={18} /> Prazos da semana
            </h2>
            <Link to="/admin/calendar">
              Calendário <ArrowRight size={14} />
            </Link>
          </header>
          {!data ? (
            <div className="th-list">
              <Skeleton lines={3} height={46} />
            </div>
          ) : week.length ? (
            <ul className="th-list">
              {week.slice(0, 5).map(a => {
                const total = a.entregaram.length + a.faltam.length;
                const rate = total ? Math.round((a.entregaram.length / total) * 100) : 0;
                return (
                  <li key={a.id}>
                    <Link to={a.link}>
                      <span className="th-due">{dueLabel(a.prazo.slice(0, 10))}</span>
                      <span className="th-item-copy">
                        <strong>{a.titulo}</strong>
                        <span className="th-meter">
                          <span className="ws-meter">
                            <span style={{ width: `${rate}%` }} />
                          </span>
                          <small>
                            {a.entregaram.length}/{total}
                          </small>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="th-done">
              <CheckCircle2 size={18} /> Nenhum prazo nos próximos 7 dias.
            </p>
          )}
        </section>
      </div>

      <AttentionPanel onOpen={setStudent} />
      {student && <StudentHistory studentId={student} onClose={() => setStudent(null)} />}
    </div>
  );
}
