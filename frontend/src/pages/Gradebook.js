import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Download,
  Search,
  TrendingUp,
  Users,
  ClipboardCheck,
  AlertTriangle,
  ChevronRight,
  Printer,
  X,
  Pencil,
  History,
  ExternalLink,
  Award,
  BookOpen,
  MessageSquareText
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import SubjectBadge from '@/components/SubjectBadge';
import { Button } from '@/components/ui/button';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

const errorText = e => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Confira os campos e tente novamente.');
const normalize = text => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const initials = name =>
  (name || 'Aluno')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
const num = (value, digits = 1) => (value == null ? '—' : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
const dateBR = value => (value ? value.slice(0, 10).split('-').reverse().join('/') : '');
const tone = value => (value == null ? 'is-none' : value >= 7 ? 'is-high' : value >= 5 ? 'is-mid' : 'is-low');
const emptyForm = () => ({ user_id: '', titulo: '', disciplina: '', data: new Date().toLocaleDateString('en-CA'), bimestre: 1, nota: '', peso: 1, feedback: '' });

// Média ponderada; avaliações sem nota não contam como zero.
export const gradeAverage = rows => {
  const graded = rows.filter(r => r.nota != null && Number.isFinite(Number(r.nota)) && r.peso > 0);
  const weight = graded.reduce((sum, r) => sum + r.peso, 0);
  return weight ? graded.reduce((sum, r) => sum + Number(r.nota) * r.peso, 0) / weight : null;
};

function Score({ value }) {
  return <span className={`ws-score ${tone(value)}`}>{num(value)}</span>;
}

function SubjectTable({ rows }) {
  const subjects = [...new Set(rows.map(r => r.disciplina || 'Sem disciplina'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (!subjects.length) return null;
  return (
    <div className="ws-card ws-table-wrap gb-subjects">
      <table className="ws-table">
        <thead>
          <tr>
            <th>Disciplina</th>
            {[1, 2, 3, 4].map(p => (
              <th key={p} className="is-center">
                {p}º bim.
              </th>
            ))}
            <th className="is-center">Média</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map(subject => {
            const entries = rows.filter(r => (r.disciplina || 'Sem disciplina') === subject);
            return (
              <tr key={subject}>
                <td>
                  <SubjectBadge subject={subject} />
                </td>
                {[1, 2, 3, 4].map(p => {
                  const value = gradeAverage(entries.filter(r => Number(r.bimestre) === p));
                  return (
                    <td key={p} className="is-center gb-period">
                      {value == null ? <span className="gb-dash">—</span> : num(value)}
                    </td>
                  );
                })}
                <td className="is-center">
                  <Score value={gradeAverage(entries)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EvaluationList({ rows, staff, onEdit, onHistory }) {
  if (!rows.length)
    return (
      <div className="ws-card ws-empty">
        <ClipboardCheck size={28} />
        <h3>Nenhuma avaliação encontrada</h3>
        <p>As correções feitas na plataforma aparecem aqui automaticamente.</p>
      </div>
    );
  return (
    <ul className="gb-evals">
      {rows.map(r => (
        <li key={r.id} id={`grade-${r.id}`} className="ws-card">
          <div className="gb-eval-main">
            <div className="gb-eval-tags">
              <SubjectBadge subject={r.disciplina} />
              <span>{r.bimestre ? `${r.bimestre}º bimestre` : 'Sem bimestre'}</span>
              <span>· {dateBR(r.data)}</span>
              <span>· {r.origem === 'manual' ? 'Lançamento manual' : r.origem}</span>
            </div>
            <h3>{r.titulo}</h3>
            {staff && (
              <p className="gb-eval-student">
                {r.user_nome} · {r.turma}
              </p>
            )}
            {r.feedback && (
              <p className="gb-eval-feedback">
                <MessageSquareText size={14} /> {r.feedback}
              </p>
            )}
            {(r.link || r.editavel || (staff && r.origem === 'manual')) && (
              <div className="gb-eval-actions">
                {r.link && (
                  <Link to={r.link}>
                    <ExternalLink size={13} /> {staff ? 'Abrir avaliação' : 'Ver avaliação'}
                  </Link>
                )}
                {r.editavel && (
                  <button type="button" onClick={() => onEdit(r)}>
                    <Pencil size={13} /> Editar
                  </button>
                )}
                {staff && r.origem === 'manual' && (
                  <button type="button" onClick={() => onHistory(r)}>
                    <History size={13} /> Histórico
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="gb-eval-score">
            <Score value={r.nota} />
            <small>{r.valor_maximo && r.valor_maximo !== 10 ? `${num(r.nota_original)} de ${num(r.valor_maximo, 0)} pts` : `peso ${r.peso}`}</small>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReportCard({ student, rows, onClose, staff, onEdit, onHistory }) {
  const average = gradeAverage(rows);
  const bySubject = [...new Set(rows.map(r => r.disciplina || 'Sem disciplina'))].map(s => [s, gradeAverage(rows.filter(r => (r.disciplina || 'Sem disciplina') === s))]);
  const best = bySubject.filter(([, v]) => v != null).sort((a, b) => b[1] - a[1])[0];

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="ws-overlay gb-print-root" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="ws-sheet" role="dialog" aria-modal="true" aria-label={`Boletim de ${student.nome}`}>
        <header className="ws-sheet-head">
          <span className="ws-avatar gb-avatar-lg">{initials(student.nome)}</span>
          <div className="flex-1 min-w-0">
            <p className="ws-eyebrow">Boletim individual</p>
            <h2>{student.nome}</h2>
            <p>
              {student.turma || 'Sem turma'}
              {student.email ? ` · ${student.email}` : ''}
            </p>
          </div>
          <button type="button" className="ws-icon-btn gb-no-print" onClick={() => window.print()} title="Imprimir boletim" aria-label="Imprimir boletim">
            <Printer size={18} />
          </button>
          <button type="button" className="ws-icon-btn gb-no-print" onClick={onClose} aria-label="Fechar boletim">
            <X size={19} />
          </button>
        </header>
        <div className="ws-sheet-body">
          <section className="ws-kpis gb-sheet-kpis">
            <article className="ws-card ws-kpi is-featured">
              <span>Média geral</span>
              <strong>
                {num(average)}
                <small> /10</small>
              </strong>
            </article>
            <article className="ws-card ws-kpi">
              <span>Avaliações</span>
              <strong>{rows.length}</strong>
            </article>
            <article className="ws-card ws-kpi">
              <span>Melhor disciplina</span>
              <strong className="gb-kpi-text">{best ? best[0] : '—'}</strong>
            </article>
          </section>
          <h3 className="gb-section-title">Médias por disciplina e bimestre</h3>
          <SubjectTable rows={rows} />
          <h3 className="gb-section-title">Avaliações</h3>
          <EvaluationList rows={rows} staff={false} onEdit={staff ? onEdit : undefined} onHistory={onHistory} />
          <p className="gb-footnote">Sem nota é diferente de nota zero. As médias exibidas não definem aprovação escolar.</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

function GradeForm({ form, setForm, students, busy, onSubmit }) {
  const field = (key, label, type, extra = {}) => (
    <label className="qz-field">
      <span>{label}</span>
      <input
        aria-label={label}
        required
        type={type}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value })}
        {...extra}
      />
    </label>
  );
  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && setForm(null)}>
      <form className="ws-modal gb-form" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-label={form.id ? 'Editar lançamento' : 'Lançar nota'}>
        <header>
          <div>
            <p className="ws-eyebrow">Banco de notas</p>
            <h2>{form.id ? 'Editar lançamento' : 'Lançar nota'}</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={() => setForm(null)} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <fieldset disabled={busy}>
          <label className="qz-field">
            <span>Aluno</span>
            <select aria-label="Aluno" required disabled={!!form.id} value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}>
              <option value="">Selecione o aluno</option>
              {students.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nome} · {a.turma}
                </option>
              ))}
            </select>
          </label>
          <div className="gb-form-grid">
            {field('titulo', 'Avaliação', 'text', { maxLength: 160, placeholder: 'Ex.: Prova de interpretação' })}
            {field('disciplina', 'Disciplina', 'text', { maxLength: 80, placeholder: 'Ex.: Língua Portuguesa' })}
            {field('nota', 'Nota (0 a 10)', 'number', { min: 0, max: 10, step: '0.1' })}
            {field('peso', 'Peso na média', 'number', { min: 0.1, max: 100, step: '0.1' })}
            {field('data', 'Data', 'date')}
            <label className="qz-field">
              <span>Bimestre</span>
              <select aria-label="Bimestre" value={form.bimestre} onChange={e => setForm({ ...form, bimestre: Number(e.target.value) })}>
                {[1, 2, 3, 4].map(p => (
                  <option key={p} value={p}>
                    {p}º bimestre
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="qz-field">
            <span>Comentário para o aluno</span>
            <textarea aria-label="Comentário para o aluno" className="cx-feedback" maxLength={10000} value={form.feedback} onChange={e => setForm({ ...form, feedback: e.target.value })} />
          </label>
          <p className="gb-footnote">A nota fica visível para o aluno ao salvar. Alterações em lançamentos manuais mantêm histórico.</p>
          <div className="gb-form-actions">
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button type="submit" className="qz-btn-primary">
              {busy ? 'Salvando…' : 'Salvar nota'}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>,
    document.body
  );
}

export function Gradebook() {
  const user = getUser();
  const staff = ['admin', 'teacher'].includes(user?.role);
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [turma, setTurma] = useState('');
  const [subject, setSubject] = useState('');
  const [period, setPeriod] = useState('');
  const [year, setYear] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('students');
  const [student, setStudent] = useState('');
  const [form, setForm] = useState(() => (staff && params.get('novo') === '1' ? emptyForm() : null));
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);

  const load = () => {
    setFailed(false);
    api
      .get('/gradebook', { params: turma ? { turma } : {} })
      .then(r => {
        setData(r.data);
        setTimeout(() => document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView(), 150);
      })
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    setData(null);
    load();
  }, [turma]);

  const students = data?.alunos || [];
  const all = data?.notas || [];
  const rows = useMemo(
    () =>
      all.filter(
        r =>
          (!subject || r.disciplina === subject) &&
          (!period || (period === 'none' ? !r.bimestre : String(r.bimestre) === period)) &&
          (!year || r.data?.startsWith(year))
      ),
    [all, subject, period, year]
  );
  const subjects = [...new Set(all.map(r => r.disciplina))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const years = [...new Set(all.map(r => r.data?.slice(0, 4)).filter(Boolean))].sort().reverse();

  const perStudent = students.map(s => {
    const entries = rows.filter(r => r.user_id === s.id);
    return {
      ...s,
      entries,
      average: gradeAverage(entries),
      periods: [1, 2, 3, 4].map(p => gradeAverage(entries.filter(r => Number(r.bimestre) === p)))
    };
  });
  const evaluated = perStudent.filter(s => s.average != null);
  const overall = gradeAverage(rows);
  const attention = evaluated.filter(s => s.average < 6).length;
  const matches = s => normalize(`${s.nome} ${s.email || ''} ${s.user_nome || ''} ${s.titulo || ''}`).includes(normalize(query));

  const save = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await (form.id ? api.put('/admin/grades/' + form.id, form) : api.post('/admin/grades', form));
      setForm(null);
      load();
      window.dispatchEvent(new Event('eti-notices'));
      toast.success('Nota salva no banco de notas.');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const exportCSV = () => {
    const cell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r\n]/, "'$&").replaceAll('"', '""') + '"';
    const content = [
      ['Aluno', 'Turma', 'Avaliação', 'Disciplina', 'Data', 'Bimestre', 'Nota (0 a 10)', 'Peso', 'Origem'],
      ...rows.map(r => [r.user_nome, r.turma, r.titulo, r.disciplina, r.data, r.bimestre || 'Não informado', r.nota, r.peso, r.origem])
    ]
      .map(r => r.map(cell).join(';'))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eti-notas.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const showHistory = async r => {
    try {
      setHistory({ title: r.titulo, items: (await api.get('/admin/grades/' + r.id + '/history')).data });
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const edit = r => {
    setStudent('');
    setForm({ ...r });
  };

  const selected = perStudent.find(s => s.id === student);
  const own = staff ? [] : rows;

  const filters = (
    <div className="ws-card ws-toolbar">
      {staff && (
        <select aria-label="Filtrar turma" value={turma} onChange={e => setTurma(e.target.value)}>
          <option value="">Todas as minhas turmas</option>
          {TURMAS.filter(t => user.role === 'admin' || user.turmas?.includes(t.value)).map(t => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      )}
      <select aria-label="Filtrar disciplina" value={subject} onChange={e => setSubject(e.target.value)}>
        <option value="">Todas as disciplinas</option>
        {subjects.map(s => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select aria-label="Filtrar bimestre" value={period} onChange={e => setPeriod(e.target.value)}>
        <option value="">Todos os bimestres</option>
        {[1, 2, 3, 4].map(p => (
          <option key={p} value={p}>
            {p}º bimestre
          </option>
        ))}
        <option value="none">Sem bimestre</option>
      </select>
      <select aria-label="Filtrar ano" value={year} onChange={e => setYear(e.target.value)}>
        <option value="">Todos os anos</option>
        {years.map(y => (
          <option key={y}>{y}</option>
        ))}
      </select>
      {staff && (
        <label className="ws-search">
          <Search size={16} />
          <input aria-label="Buscar aluno ou avaliação" placeholder={view === 'students' ? 'Buscar aluno…' : 'Buscar avaliação ou aluno…'} value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <PageIntro
        section={staff ? 'AVALIAÇÃO / BANCO DE NOTAS' : 'MEU DESEMPENHO'}
        title={staff ? 'Banco de notas' : 'Minhas notas'}
        description={staff ? 'Acompanhe médias por aluno, disciplina e bimestre, e lance notas de avaliações feitas fora da plataforma.' : 'Suas notas, médias por disciplina e os comentários dos professores.'}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!rows.length} onClick={exportCSV}>
            <Download size={16} /> Exportar CSV
          </Button>
          {staff && (
            <Button className="qz-btn-primary" disabled={!students.length} onClick={() => setForm(emptyForm())}>
              <Plus size={16} /> Lançar nota
            </Button>
          )}
        </div>
      </PageIntro>

      {failed ? (
        <div className="ws-card ws-empty" role="alert">
          <h3>Não foi possível carregar as notas</h3>
          <button className="underline font-semibold" onClick={load}>
            Tentar novamente
          </button>
        </div>
      ) : !data ? (
        <div className="ws-card ws-empty" role="status">
          Carregando notas…
        </div>
      ) : (
        <>
          <section className="ws-kpis">
            <article className="ws-card ws-kpi is-featured">
              <span className="ws-kpi-icon">
                <TrendingUp size={18} />
              </span>
              <span>{staff ? 'Média geral' : 'Minha média geral'}</span>
              <strong>
                {num(overall)}
                <small> /10</small>
              </strong>
              <p>Média ponderada dos filtros atuais</p>
            </article>
            {staff ? (
              <>
                <article className="ws-card ws-kpi">
                  <span className="ws-kpi-icon">
                    <Users size={18} />
                  </span>
                  <span>Alunos avaliados</span>
                  <strong>
                    {evaluated.length}
                    <small> /{students.length}</small>
                  </strong>
                  <p>Com pelo menos uma nota</p>
                </article>
                <article className="ws-card ws-kpi">
                  <span className="ws-kpi-icon">
                    <ClipboardCheck size={18} />
                  </span>
                  <span>Avaliações</span>
                  <strong>{rows.length}</strong>
                  <p>Lançadas e corrigidas</p>
                </article>
                <article className="ws-card ws-kpi">
                  <span className="ws-kpi-icon gb-warn">
                    <AlertTriangle size={18} />
                  </span>
                  <span>Em atenção</span>
                  <strong>{attention}</strong>
                  <p>Alunos com média abaixo de 6</p>
                </article>
              </>
            ) : (
              <>
                <article className="ws-card ws-kpi">
                  <span className="ws-kpi-icon">
                    <ClipboardCheck size={18} />
                  </span>
                  <span>Avaliações</span>
                  <strong>{rows.length}</strong>
                  <p>Com nota lançada</p>
                </article>
                <article className="ws-card ws-kpi">
                  <span className="ws-kpi-icon">
                    <BookOpen size={18} />
                  </span>
                  <span>Disciplinas</span>
                  <strong>{new Set(rows.map(r => r.disciplina)).size}</strong>
                  <p>Com avaliações</p>
                </article>
              </>
            )}
          </section>

          {filters}

          {staff ? (
            <>
              <div className="gb-viewbar">
                <div className="ws-segment" role="group" aria-label="Modo de visualização">
                  <button type="button" aria-pressed={view === 'students'} onClick={() => setView('students')}>
                    <Users size={15} /> Alunos <span>{students.length}</span>
                  </button>
                  <button type="button" aria-pressed={view === 'entries'} onClick={() => setView('entries')}>
                    <ClipboardCheck size={15} /> Lançamentos <span>{rows.length}</span>
                  </button>
                </div>
              </div>

              {view === 'students' ? (
                <div className="ws-card ws-table-wrap">
                  <table className="ws-table gb-table">
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>Turma</th>
                        {[1, 2, 3, 4].map(p => (
                          <th key={p} className="is-center gb-col-period">
                            {p}º bim.
                          </th>
                        ))}
                        <th className="is-center">Avaliações</th>
                        <th className="is-center">Média</th>
                        <th aria-label="Abrir boletim" />
                      </tr>
                    </thead>
                    <tbody>
                      {perStudent.filter(matches).map(s => (
                        <tr key={s.id} className="is-clickable" onClick={() => setStudent(s.id)}>
                          <td>
                            <div className="ws-person">
                              <span className="ws-avatar">{initials(s.nome)}</span>
                              <div className="min-w-0">
                                <strong>{s.nome}</strong>
                                <small>{s.email || 'Estudante'}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="ws-chip">{s.turma || 'Sem turma'}</span>
                          </td>
                          {s.periods.map((v, i) => (
                            <td key={i} className="is-center gb-period gb-col-period">
                              {v == null ? <span className="gb-dash">—</span> : num(v)}
                            </td>
                          ))}
                          <td className="is-center">{s.entries.length}</td>
                          <td className="is-center">
                            <Score value={s.average} />
                          </td>
                          <td>
                            <button type="button" className="ws-icon-btn" aria-label={`Ver boletim de ${s.nome}`} onClick={() => setStudent(s.id)}>
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!perStudent.filter(matches).length && (
                    <div className="ws-empty">
                      <Users size={26} />
                      <h3>Nenhum aluno encontrado</h3>
                      <p>Ajuste a turma ou a busca.</p>
                    </div>
                  )}
                </div>
              ) : (
                <EvaluationList rows={rows.filter(matches)} staff onEdit={edit} onHistory={showHistory} />
              )}
            </>
          ) : (
            <>
              <h3 className="gb-section-title">Médias por disciplina e bimestre</h3>
              {rows.length ? (
                <SubjectTable rows={own} />
              ) : null}
              <h3 className="gb-section-title">
                <Award size={17} /> Minhas avaliações
              </h3>
              <EvaluationList rows={own} staff={false} />
              <p className="gb-footnote">Sem nota é diferente de nota zero. As médias exibidas não definem aprovação escolar.</p>
            </>
          )}
        </>
      )}

      {selected && (
        <ReportCard student={selected} rows={selected.entries} staff onClose={() => setStudent('')} onEdit={edit} onHistory={showHistory} />
      )}
      {form && <GradeForm form={form} setForm={setForm} students={students} busy={busy} onSubmit={save} />}
      {history &&
        createPortal(
        <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && setHistory(null)}>
          <section className="ws-modal gb-form" role="dialog" aria-modal="true" aria-label="Histórico do lançamento">
            <header>
              <div>
                <p className="ws-eyebrow">Histórico</p>
                <h2>{history.title}</h2>
              </div>
              <button type="button" className="ws-icon-btn" onClick={() => setHistory(null)} aria-label="Fechar">
                <X size={18} />
              </button>
            </header>
            {!history.items.length ? (
              <p className="gb-footnote">Sem alterações após o lançamento.</p>
            ) : (
              <ol className="gb-history">
                {history.items.map((h, i) => (
                  <li key={i}>
                    <strong>{new Date(h.em).toLocaleString('pt-BR')}</strong> · {h.alterado_por}
                    <span>
                      Nota anterior {h.antes.nota} · peso {h.antes.peso} · {h.antes.disciplina} · {h.antes.bimestre}º bimestre
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>,
        document.body
      )}
    </DashboardLayout>
  );
}

export default Gradebook;
