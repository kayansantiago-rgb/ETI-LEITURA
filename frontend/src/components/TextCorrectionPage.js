import { useEffect, useState } from 'react';
import { PageSkeleton } from '@/components/Skeleton';
import { Clock3, CheckCircle2, TrendingUp, Users } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import TextCorrectionWorkspace from '@/components/TextCorrectionWorkspace';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

const num = value => (value == null ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

// Página de correção compartilhada por resumos e produções textuais.
export default function TextCorrectionPage({ kind, path, section, title, description, testId }) {
  const user = getUser();
  const [turma, setTurma] = useState('');
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    setItems(null);
    api
      .get(path, { params: turma ? { turma } : {} })
      .then(r => setItems(r.data))
      .catch(() => setFailed(true));
  };

  useEffect(load, [turma, path]);

  const graded = (items || []).filter(i => i.nota != null);
  const average = graded.length ? graded.reduce((s, i) => s + i.nota, 0) / graded.length : null;
  const students = new Set((items || []).map(i => i.user_id)).size;

  return (
    <DashboardLayout>
      <div data-testid={testId}>
        <PageIntro section={section} title={title} description={description}>
          <select aria-label="Filtrar por turma" className="rp-select" value={turma} onChange={e => setTurma(e.target.value)}>
            <option value="">Todas as turmas</option>
            {TURMAS.filter(t => user?.role === 'admin' || user?.turmas?.includes(t.value)).map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </PageIntro>

        {failed ? (
          <div className="ws-card ws-empty" role="alert">
            <h3>Não foi possível carregar os textos</h3>
            <button className="underline font-semibold" onClick={load}>
              Tentar novamente
            </button>
          </div>
        ) : !items ? (
          <PageSkeleton cards={3} rows={4} label="Carregando textos…" />
        ) : (
          <>
            <section className="ws-kpis tc-kpis">
              <article className="ws-card ws-kpi is-featured">
                <span className="ws-kpi-icon">
                  <Clock3 size={18} />
                </span>
                <span>Aguardando correção</span>
                <strong>{items.length - graded.length}</strong>
              </article>
              <article className="ws-card ws-kpi">
                <span className="ws-kpi-icon">
                  <CheckCircle2 size={18} />
                </span>
                <span>Corrigidos</span>
                <strong>{graded.length}</strong>
              </article>
              <article className="ws-card ws-kpi">
                <span className="ws-kpi-icon">
                  <TrendingUp size={18} />
                </span>
                <span>Média das notas</span>
                <strong>
                  {num(average)}
                  <small> /10</small>
                </strong>
              </article>
              <article className="ws-card ws-kpi">
                <span className="ws-kpi-icon">
                  <Users size={18} />
                </span>
                <span>Alunos</span>
                <strong>{students}</strong>
              </article>
            </section>
            <TextCorrectionWorkspace
              key={turma}
              items={items}
              kind={kind}
              canDelete={user?.role === 'admin'}
              onSaved={updated => setItems(list => list.map(i => (i.id === updated.id ? { ...i, ...updated } : i)))}
              onDeleted={id => setItems(list => list.filter(i => i.id !== id))}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
