import { useState } from 'react';
import { DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Check, MessageSquare } from 'lucide-react';
import RubricPicker from '@/components/RubricPicker';
import AIReview from '@/components/AIReview';
import QuickComments from '@/components/QuickComments';
import '@/summary-correction.css';

export default function SummaryCorrection({ summary, nota, feedback, setNota, setFeedback, loading, onSubmit, onCancel }) {
  const [tab, setTab] = useState('text');
  const [helpers, setHelpers] = useState(false);
  const apply = result => { setNota(String(result.nota)); setFeedback(result.feedback); };
  return <>
    <header className="summary-desk-header">
      <div><span className="summary-desk-eyebrow">LEITURA E DEVOLUTIVA</span><DialogTitle>Corrigir resumo</DialogTitle><p>{summary.user_nome} <span>· {summary.user_turma || 'Sem turma'}</span></p></div>
    </header>
    <div className="summary-desk-tabs" role="group" aria-label="Área de correção">
      <button aria-pressed={tab === 'text'} onClick={() => setTab('text')}><BookOpen size={16}/> Texto do aluno</button>
      <button aria-pressed={tab === 'grade'} onClick={() => setTab('grade')}><MessageSquare size={16}/> Nota e comentário</button>
    </div>
    <div className="summary-desk-columns">
      <section className={`summary-desk-reading ${tab === 'text' ? 'is-selected' : ''}`} aria-label="Texto do aluno">
        <div className="summary-desk-book"><BookOpen size={18}/><h3>{summary.book_titulo}</h3></div>
        <article className="summary-desk-paper"><p>{summary.conteudo || 'O aluno não enviou um texto.'}</p></article>
      </section>
      <section className={`summary-desk-grading ${tab === 'grade' ? 'is-selected' : ''}`} aria-label="Avaliar resumo">
        <form id={`summary-grade-${summary.id}`} onSubmit={onSubmit}>
          <fieldset disabled={loading}>
            <label htmlFor={`summary-score-${summary.id}`}>Nota do resumo <span>de 0 a 10</span></label>
            <div className="summary-score-input"><input id={`summary-score-${summary.id}`} type="number" min="0" max="10" step="0.1" required value={nota} onChange={e => setNota(e.target.value)} placeholder="—" data-testid="input-nota"/><span>/ 10</span></div>
            <label htmlFor={`summary-feedback-${summary.id}`}>Comentário para o aluno</label>
            <p className="summary-field-hint">Destaque um acerto e indique o próximo passo.</p>
            <textarea id={`summary-feedback-${summary.id}`} required maxLength={10000} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Seu texto apresenta… Para melhorar, tente…" data-testid="input-feedback"/>
          </fieldset>
        </form>
        <button type="button" className="summary-helper-toggle" disabled={loading} onClick={() => setHelpers(v => !v)} aria-expanded={helpers} aria-controls={`summary-helpers-${summary.id}`}>{helpers ? '−' : '+'} Ferramentas de apoio <span>opcional</span></button>
        {helpers && <div id={`summary-helpers-${summary.id}`} className="summary-helper-content"><RubricPicker onApply={apply}/><AIReview kind="summary" id={summary.id} onApply={apply}/><QuickComments onUse={text=>setFeedback(value=>[value,text].filter(Boolean).join('\n\n').slice(0,10000))}/></div>}
      </section>
    </div>
    <footer className="summary-desk-footer"><p>A nota e o comentário ficam visíveis para o aluno ao salvar.</p><div><button type="button" disabled={loading} onClick={onCancel}>Cancelar</button><button type="submit" form={`summary-grade-${summary.id}`} disabled={loading || nota === '' || Number(nota)<0 || Number(nota)>10 || !feedback.trim()} data-testid="submit-correction"><Check size={17}/>{loading ? 'Salvando…' : 'Salvar correção'}</button></div></footer>
  </>;
}
