import { useState } from 'react';
import { TrendingUp, Users, Award, ArrowRight, Search } from 'lucide-react';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';
import LoadingCards from '@/components/LoadingCards';
import '@/grade-students.css';

const normalized = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const number = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export default function GradeStudents({ data, failed, retry, turma, onTurma, onStudent }) {
  const [search, setSearch] = useState('');
  const user = getUser();
  if (failed) return <p role="alert">Não foi possível carregar as notas. <button onClick={retry}>Tentar novamente</button></p>;
  if (!data) return <LoadingCards label="Carregando alunos e notas…"/>;
  const grades = Array.isArray(data.notas) ? data.notas : [];
  const students = (Array.isArray(data.alunos) ? data.alunos : []).map(student => {
    const entries = grades.filter(g => g.user_id === student.id && g.nota != null && Number.isFinite(Number(g.nota)));
    return { ...student, entries, total: entries.reduce((sum, g) => sum + Number(g.nota), 0) };
  });
  const graded = students.filter(s => s.entries.length);
  const total = graded.reduce((sum, s) => sum + s.total, 0);
  const evaluations = graded.reduce((sum, s) => sum + s.entries.length, 0);
  const best = [...graded].sort((a, b) => b.total - a.total)[0];
  const visible = students.filter(s => normalized(`${s.nome} ${s.email || ''}`).includes(normalized(search)));
  return <div className="grade-students">
    <section className="grade-kpis" aria-label="Indicadores das turmas selecionadas">
      <article><TrendingUp/><span>MÉDIA DAS AVALIAÇÕES</span><strong>{evaluations ? number(total / evaluations) : '—'}<small> /10</small></strong><p>Média simples das avaliações com nota.</p></article>
      <article><Users/><span>ALUNOS COM NOTAS</span><strong>{graded.length}<small> /{students.length}</small></strong><p>Estudantes com pelo menos uma nota lançada.</p></article>
      <article><Award/><span>DESTAQUE ACADÊMICO</span><strong className="grade-best">{best?.nome || 'Ainda sem notas'}</strong><p>{best ? `${number(best.total)} pontos acumulados em ${best.entries.length} avaliações.` : 'As avaliações aparecerão após a correção.'}</p></article>
    </section>
    <section className="grade-directory-filters" aria-label="Encontrar aluno">
      <label>Selecionar turma<select value={turma} onChange={e => onTurma(e.target.value)}><option value="">Todas as turmas</option>{TURMAS.filter(t => user?.role === 'admin' || user?.turmas?.includes(t.value)).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
      <label>Buscar aluno<div className="grade-search"><Search size={20}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar estudante por nome ou e-mail…" aria-label="Buscar aluno por nome ou e-mail"/></div></label>
    </section>
    <div className="grade-student-grid">{visible.map(s => <article className="grade-student-card" key={s.id}>
      <header><span className="grade-avatar">{(s.nome || 'Aluno').split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('')}</span><div><h2 title={s.nome}>{s.nome}</h2><p title={s.email}>{s.email || 'Estudante'}</p></div></header>
      <span className="grade-class">{s.turma || 'Sem turma'}</span>
      <div className="grade-card-scores"><div><span>NOTA ACUMULADA</span><strong>{s.entries.length ? number(s.total) : '—'}<small> /{s.entries.length * 10}</small></strong></div><div><span>AVALIAÇÕES</span><b>{s.entries.length}</b></div></div>
      <button onClick={() => onStudent(s.id)}>VER BOLETIM <ArrowRight size={16}/></button>
    </article>)}</div>
    {!visible.length && <p className="empty-state">Nenhum aluno encontrado para esta busca.</p>}
  </div>;
}
