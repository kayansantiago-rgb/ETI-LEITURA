import { confirmAction } from '@/components/ConfirmHost';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Trash2, X, Upload, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { toast } from 'sonner';

const blank = () => ({ texto: '', opcoes: ['', '', '', ''], correta: 0 });
const letter = i => String.fromCharCode(65 + i);
const message = e => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Confira as perguntas e tente novamente.');

// Professor cadastra o questionário que libera o certificado ao final do livro.
export default function BookQuizEditor({ book, onClose }) {
  const [questions, setQuestions] = useState(null);
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/books/${book.id}/quiz`)
      .then(r => {
        setExisting(!!r.data.perguntas?.length);
        setQuestions(r.data.perguntas?.length ? r.data.perguntas : [blank()]);
      })
      .catch(() => setQuestions([blank()]));
  }, [book.id]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const patch = (i, update) => setQuestions(list => list.map((q, n) => (n === i ? { ...q, ...update } : q)));

  const save = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/admin/books/${book.id}/quiz`, { perguntas: questions });
      toast.success('Questionário salvo. Os alunos que terminarem o livro já podem responder.');
      onClose(true);
    } catch (err) {
      toast.error(message(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirmAction({ title: 'Remover questionário?', message: 'Remover o questionário deste livro? Certificados já emitidos continuam válidos.', confirmLabel: 'Remover' }))) return;
    setBusy(true);
    try {
      await api.delete(`/admin/books/${book.id}/quiz`);
      toast.success('Questionário removido.');
      onClose(true);
    } catch (err) {
      toast.error(message(err));
    } finally {
      setBusy(false);
    }
  };

  const importFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const list = Array.isArray(parsed) ? parsed : parsed.perguntas;
      if (!Array.isArray(list) || !list.length || list.length > 30 || list.some(q => typeof q.texto !== 'string' || !Array.isArray(q.opcoes) || q.opcoes.length < 2 || q.opcoes.length > 4 || !Number.isInteger(q.correta) || q.correta < 0 || q.correta >= q.opcoes.length)) throw Error();
      setQuestions(list.map(({ texto, opcoes, correta }) => ({ texto, opcoes, correta })));
      toast.success('Perguntas importadas. Revise e salve.');
    } catch {
      toast.error('Use um arquivo JSON válido com até 30 perguntas.');
    }
  };

  return createPortal(
    <div className="ws-overlay" onMouseDown={e => e.target === e.currentTarget && onClose(false)}>
      <form className="ws-sheet bqe" onSubmit={save} role="dialog" aria-modal="true" aria-label={`Questionário de ${book.titulo}`}>
        <header className="ws-sheet-head">
          <span className="qz-settings-icon">
            <Award size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="ws-eyebrow">Questionário final do livro</p>
            <h2>{book.titulo}</h2>
            <p>Liberado quando o aluno chega à última página. Acertando 70% ou mais, ele recebe um certificado em PDF.</p>
          </div>
          <button type="button" className="ws-icon-btn" onClick={() => onClose(false)} aria-label="Fechar">
            <X size={19} />
          </button>
        </header>
        <div className="ws-sheet-body">
          {!questions ? (
            <div className="ws-empty">Carregando…</div>
          ) : (
            <fieldset disabled={busy} className="qz-questions">
              {questions.map((q, i) => (
                <section key={i} className="qz-q ws-card">
                  <header>
                    <span className="qz-q-number">{i + 1}</span>
                    <strong>Pergunta {i + 1}</strong>
                    {questions.length > 1 && (
                      <button type="button" className="ws-icon-btn" aria-label={`Remover pergunta ${i + 1}`} onClick={() => setQuestions(list => list.filter((_, n) => n !== i))}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </header>
                  <textarea
                    required
                    maxLength={2000}
                    className="qz-q-text"
                    aria-label={`Enunciado da pergunta ${i + 1}`}
                    placeholder="Ex.: Por que o personagem decide partir?"
                    value={q.texto}
                    onChange={e => patch(i, { texto: e.target.value })}
                  />
                  <p className="qz-q-help">Clique na letra para marcar a alternativa correta.</p>
                  <div className="qz-q-options">
                    {q.opcoes.map((o, j) => (
                      <div key={j} className={`qz-q-option ${q.correta === j ? 'is-correct' : ''}`}>
                        <button type="button" className="qz-q-letter" aria-pressed={q.correta === j} aria-label={`Alternativa ${letter(j)} correta`} onClick={() => patch(i, { correta: j })}>
                          {q.correta === j ? <Check size={15} /> : letter(j)}
                        </button>
                        <input
                          required
                          maxLength={500}
                          aria-label={`Pergunta ${i + 1}, alternativa ${letter(j)}`}
                          placeholder={`Alternativa ${letter(j)}`}
                          value={o}
                          onChange={e => patch(i, { opcoes: q.opcoes.map((v, k) => (k === j ? e.target.value : v)) })}
                        />
                        {q.opcoes.length > 2 && (
                          <button
                            type="button"
                            className="ws-icon-btn"
                            aria-label={`Remover alternativa ${letter(j)}`}
                            onClick={() => patch(i, { opcoes: q.opcoes.filter((_, k) => k !== j), correta: q.correta === j ? 0 : q.correta > j ? q.correta - 1 : q.correta })}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {q.opcoes.length < 4 && (
                      <button type="button" className="qz-add-option" onClick={() => patch(i, { opcoes: [...q.opcoes, ''] })}>
                        <Plus size={14} /> Adicionar alternativa
                      </button>
                    )}
                  </div>
                </section>
              ))}
              <button type="button" className="qz-add-question" disabled={questions.length >= 30} onClick={() => setQuestions(list => [...list, blank()])}>
                <Plus size={18} /> Adicionar pergunta
              </button>
            </fieldset>
          )}
        </div>
        <footer className="bqe-footer">
          <label className="qz-import bqe-import">
            <Upload size={15} /> Importar JSON
            <input type="file" accept=".json,application/json" onChange={importFile} />
          </label>
          {existing && (
            <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={remove}>
              <Trash2 size={15} /> Remover
            </Button>
          )}
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={() => onClose(false)}>
            Cancelar
          </Button>
          <Button type="submit" className="qz-btn-primary" disabled={busy || !questions}>
            {busy ? 'Salvando…' : `Salvar ${questions?.length || ''} pergunta(s)`}
          </Button>
        </footer>
      </form>
    </div>,
    document.body
  );
}
