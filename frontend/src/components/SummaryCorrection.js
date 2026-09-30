import { useState } from 'react';
import { DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Check, MessageSquare, Sparkles } from 'lucide-react';
import RubricPicker from '@/components/RubricPicker';
import AIReview from '@/components/AIReview';
import QuickComments from '@/components/QuickComments';
import '@/summary-correction.css';

export default function SummaryCorrection({ summary, nota, feedback, setNota, setFeedback, loading, onSubmit, onCancel }) {
  const [tab, setTab] = useState('text');
  const [helpers, setHelpers] = useState(false);
  const apply = result => { setNota(String(result.nota)); setFeedback(result.feedback); };

  return (
    <div className="dark-correction-modal-inner">
      <header className="summary-desk-header">
        <div className="flex items-center gap-3 mb-2">
          <span className="dark-kpi-pill cyan">
            TURMA {summary.user_turma || 'GERAL'}
          </span>
          <span className="text-xs font-bold text-slate-400">
            Aluno: <strong className="text-slate-200">{summary.user_nome}</strong>
          </span>
        </div>
        <DialogTitle className="text-2xl font-black text-white tracking-tight">
          Correção do Resumo
        </DialogTitle>
      </header>

      <div className="summary-desk-tabs" role="group" aria-label="Área de correção">
        <button aria-pressed={tab === 'text'} onClick={() => setTab('text')}>
          <BookOpen size={16}/> Resposta do aluno
        </button>
        <button aria-pressed={tab === 'grade'} onClick={() => setTab('grade')}>
          <MessageSquare size={16}/> Avaliação & Nota
        </button>
      </div>

      <div className="summary-desk-columns">
        <section className={`summary-desk-reading ${tab === 'text' ? 'is-selected' : ''}`} aria-label="Texto do aluno">
          <span className="dark-section-header mb-3">
            ✍️ RESPOSTA DO ESTUDANTE:
          </span>
          <div className="summary-desk-book">
            <BookOpen size={18} className="text-cyan-400"/>
            <h3 className="text-white font-bold">{summary.book_titulo}</h3>
          </div>
          <article className="summary-desk-paper">
            <p>{summary.conteudo || 'O aluno não enviou um texto.'}</p>
          </article>
        </section>

        <section className={`summary-desk-grading ${tab === 'grade' ? 'is-selected' : ''}`} aria-label="Avaliar resumo">
          <span className="dark-section-header mb-4">
            📝 AVALIAÇÃO & NOTA:
          </span>

          <form id={`summary-grade-${summary.id}`} onSubmit={onSubmit}>
            <fieldset disabled={loading} className="space-y-4">
              <div>
                <label htmlFor={`summary-score-${summary.id}`} className="block text-xs font-bold text-slate-200 mb-2 uppercase tracking-wide">
                  Nota (0 a 10) *
                </label>
                <div className="summary-score-input">
                  <input
                    id={`summary-score-${summary.id}`}
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    required
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    placeholder="—"
                    className="dark-modal-input"
                    data-testid="input-nota"
                  />
                  <span className="text-sm font-bold text-slate-400">/ 10 pts</span>
                </div>
              </div>

              <div>
                <label htmlFor={`summary-feedback-${summary.id}`} className="block text-xs font-bold text-slate-200 mb-2 uppercase tracking-wide">
                  Feedback Pedagógico & Comentários:
                </label>
                <textarea
                  id={`summary-feedback-${summary.id}`}
                  required
                  maxLength={10000}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Escreva orientações ou pontos fortes do resumo…"
                  className="dark-modal-textarea"
                  data-testid="input-feedback"
                />
              </div>
            </fieldset>
          </form>

          <button
            type="button"
            className="summary-helper-toggle"
            disabled={loading}
            onClick={() => setHelpers(v => !v)}
            aria-expanded={helpers}
            aria-controls={`summary-helpers-${summary.id}`}
          >
            <Sparkles size={16} className="text-purple-400" />
            <span>🤖 Assistente de IA & Ferramentas</span>
            <span className="ml-auto text-xs">{helpers ? '− Ocultar' : '+ Expandir'}</span>
          </button>

          {helpers && (
            <div id={`summary-helpers-${summary.id}`} className="summary-helper-content mt-3">
              <RubricPicker onApply={apply}/>
              <AIReview kind="summary" id={summary.id} onApply={apply}/>
              <QuickComments onUse={text => setFeedback(value => [value, text].filter(Boolean).join('\n\n').slice(0, 10000))}/>
            </div>
          )}
        </section>
      </div>

      <footer className="summary-desk-footer">
        <button type="button" className="dark-footer-btn-secondary" disabled={loading} onClick={onCancel}>
          CANCELAR
        </button>
        <button
          type="submit"
          form={`summary-grade-${summary.id}`}
          disabled={loading || nota === '' || Number(nota) < 0 || Number(nota) > 10 || !feedback.trim()}
          className="dark-footer-btn-primary"
          data-testid="submit-correction"
        >
          <Check size={18}/>
          {loading ? 'SALVANDO…' : 'SALVAR CORREÇÃO'}
        </button>
      </footer>
    </div>
  );
}
