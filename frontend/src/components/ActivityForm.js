import { publicationInput } from '@/lib/publication';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

const question = () => ({ enunciado: '', tipo: 'texto', alternativas: ['', ''] });

export default function ActivityForm({ initial, draft, template = false, onSaved, onCancel }) {
  const user = getUser();
  const classes = TURMAS.filter(t => user.role === 'admin' || user.turmas?.includes(t.value));
  const source = initial || draft;

  const [form, setForm] = useState(
    source
      ? {
          ...source,
          valor_nota: source.valor_nota ?? 10,
          prazo: source.prazo || '',
          book_id: source.book_id || '',
          anexos: source.anexos || [],
          perguntas: source.perguntas.map(q => ({
            ...q,
            tipo: q.tipo || 'texto',
            alternativas: q.alternativas?.length ? q.alternativas : ['', '']
          }))
        }
      : {
          titulo: '',
          valor_nota: 10,
          descricao: '',
          turma: user.role === 'admin' ? 'TODAS' : classes[0]?.value || '',
          prazo: '',
          book_id: '',
          anexos: [],
          perguntas: [question()]
        }
  );

  const canSchedule = !initial || !!(initial.publicar_em && new Date(initial.publicar_em) > new Date());
  const [scheduled, setScheduled] = useState(!template && canSchedule && !!source?.publicar_em);
  const [publishAt, setPublishAt] = useState(publicationInput(source?.publicar_em));
  const [busy, setBusy] = useState(false);
  const [books, setBooks] = useState([]);

  useEffect(() => {
    api
      .get('/books')
      .then(r => setBooks(r.data))
      .catch(() => toast.error('Não foi possível carregar os livros.'));
  }, []);

  const set = (name, value) => setForm(f => ({ ...f, [name]: value }));
  const change = (i, values) =>
    setForm(f => ({ ...f, perguntas: f.perguntas.map((q, j) => (i === j ? { ...q, ...values } : q)) }));

  const save = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const publication = template
        ? null
        : canSchedule
        ? scheduled
          ? new Date(publishAt + '-03:00').toISOString()
          : null
        : initial.publicar_em || null;

      const data = {
        ...form,
        disciplina: '',
        valor_nota: Number(form.valor_nota) || 10,
        publicar_em: publication,
        bimestre: form.bimestre ? Number(form.bimestre) : null,
        prazo: form.prazo || null,
        book_id: form.book_id || null
      };

      const result = await (template
        ? initial
          ? api.put(`/admin/activity-templates/${initial.id}`, data)
          : api.post('/admin/activity-templates', data)
        : initial
        ? api.put(`/admin/activities/${initial.id}`, data)
        : api.post('/admin/activities', data));

      toast.success(
        template
          ? 'Modelo salvo na sua biblioteca.'
          : scheduled
          ? 'Publicação agendada.'
          : initial
          ? 'Atividade atualizada.'
          : 'Atividade publicada para os alunos!'
      );
      onSaved(result.data);
    } catch (e) {
      toast.error(
        typeof e.response?.data?.detail === 'string'
          ? e.response.data.detail
          : 'Confira os campos e tente novamente.'
      );
    } finally {
      setBusy(false);
    }
  };

  const attach = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const r = await api.post(
        file.type === 'application/pdf' ? '/admin/books/upload-pdf' : '/admin/books/upload-cover',
        data
      );
      setForm(f => ({ ...f, anexos: [...f.anexos, { nome: file.name, url: r.data.url }] }));
    } catch {
      toast.error('Não foi possível anexar. Use PDF ou imagem.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const heading = template ? (initial ? 'Editar modelo' : 'Novo modelo') : initial ? 'Editar atividade' : 'Nova atividade';
  const submitLabel = busy
    ? 'Salvando…'
    : template
    ? 'Salvar modelo'
    : scheduled
    ? initial
      ? 'Salvar agendamento'
      : 'Agendar atividade'
    : initial
    ? 'Salvar alterações'
    : 'Publicar atividade';
  const filled = form.perguntas.filter(q => q.enunciado.trim() && (q.tipo !== 'alternativa' || q.alternativas.every(a => a.trim()))).length;

  return (
    <form className="af" onSubmit={save}>
      <fieldset disabled={busy} className="af-grid">
        <div className="af-main">
          <section className="af-card af-intro">
            <p className="ws-eyebrow">{heading}</p>
            <input
              id="activity-title"
              className="af-title"
              aria-label="Título da atividade"
              required
              maxLength={160}
              placeholder="Título da atividade"
              value={form.titulo}
              onChange={e => set('titulo', e.target.value)}
            />
            <textarea
              id="activity-description"
              className="af-desc"
              aria-label="Orientações para os alunos"
              maxLength={10000}
              placeholder="Orientações para os alunos (opcional): o que ler, como responder…"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
            />
          </section>

          <div className="af-questions-head">
            <h3>
              Perguntas <span>{form.perguntas.length}</span>
            </h3>
            <small>
              {filled} de {form.perguntas.length} completas
            </small>
          </div>

          {form.perguntas.map((q, i) => (
            <section className="af-card af-q" key={i}>
              <header>
                <span className="qz-q-number">{i + 1}</span>
                <div className="af-type" role="group" aria-label={`Tipo da pergunta ${i + 1}`}>
                  <button type="button" aria-pressed={q.tipo === 'texto'} onClick={() => change(i, { tipo: 'texto' })}>
                    Resposta escrita
                  </button>
                  <button type="button" aria-pressed={q.tipo === 'alternativa'} onClick={() => change(i, { tipo: 'alternativa' })}>
                    Múltipla escolha
                  </button>
                </div>
                {form.perguntas.length > 1 && (
                  <button type="button" className="ws-icon-btn" aria-label={`Remover pergunta ${i + 1}`} onClick={() => set('perguntas', form.perguntas.filter((_, j) => i !== j))}>
                    ×
                  </button>
                )}
              </header>
              <textarea
                id={`question-${i}`}
                className="qz-q-text"
                aria-label={`Pergunta ${i + 1}`}
                required
                maxLength={3000}
                placeholder="Escreva a pergunta…"
                value={q.enunciado}
                onChange={e => change(i, { enunciado: e.target.value })}
              />
              {q.tipo === 'alternativa' && (
                <div className="qz-q-options">
                  {q.alternativas.map((v, j) => (
                    <div className="qz-q-option" key={j}>
                      <span className="qz-q-letter">{String.fromCharCode(65 + j)}</span>
                      <input
                        required
                        maxLength={500}
                        aria-label={`Alternativa ${j + 1} da pergunta ${i + 1}`}
                        placeholder={`Alternativa ${String.fromCharCode(65 + j)}`}
                        value={v}
                        onChange={e => change(i, { alternativas: q.alternativas.map((x, k) => (k === j ? e.target.value : x)) })}
                      />
                      {q.alternativas.length > 2 && (
                        <button type="button" className="ws-icon-btn" aria-label={`Remover alternativa ${j + 1}`} onClick={() => change(i, { alternativas: q.alternativas.filter((_, k) => k !== j) })}>
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {q.alternativas.length < 6 && (
                    <button type="button" className="qz-add-option" onClick={() => change(i, { alternativas: [...q.alternativas, ''] })}>
                      + Adicionar alternativa
                    </button>
                  )}
                </div>
              )}
            </section>
          ))}

          <button type="button" className="qz-add-question" disabled={form.perguntas.length >= 20} onClick={() => set('perguntas', [...form.perguntas, question()])}>
            + Adicionar pergunta
          </button>
        </div>

        <aside className="af-side">
          <section className="af-card af-settings">
            <h3>Configurações</h3>
            {!template && (
              <label className="qz-field">
                <span>Turma</span>
                <select id="activity-class" value={form.turma} onChange={e => set('turma', e.target.value)}>
                  {user.role === 'admin' && <option value="TODAS">Todas as turmas</option>}
                  {classes.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="af-two">
              <label className="qz-field">
                <span>Vale (pontos)</span>
                <input id="activity-score" type="number" step="0.5" min="0" max="100" required value={form.valor_nota ?? 10} onChange={e => set('valor_nota', e.target.value)} />
              </label>
              <label className="qz-field">
                <span>Bimestre</span>
                <select id="activity-period" value={form.bimestre || ''} onChange={e => set('bimestre', e.target.value)}>
                  <option value="">—</option>
                  {[1, 2, 3, 4].map(p => (
                    <option key={p} value={p}>
                      {p}º
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!template && (
              <label className="qz-field">
                <span>Prazo de entrega (opcional)</span>
                <input id="activity-deadline" type="date" value={form.prazo} onChange={e => set('prazo', e.target.value)} />
                <small className="af-hint">Até 23h59, horário de Brasília.</small>
              </label>
            )}
            <label className="qz-field">
              <span>Livro relacionado</span>
              <select id="activity-book" value={form.book_id} onChange={e => set('book_id', e.target.value)}>
                <option value="">Nenhum</option>
                {books.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.titulo}
                  </option>
                ))}
              </select>
            </label>
            <div className="qz-field">
              <span>Materiais de apoio</span>
              <label className={`qz-import af-attach ${form.anexos.length >= 5 ? 'is-disabled' : ''}`}>
                + PDF ou imagem ({form.anexos.length}/5)
                <input id="activity-attachment" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" disabled={form.anexos.length >= 5} onChange={attach} />
              </label>
              {form.anexos.map((a, i) => (
                <div className="af-file" key={i}>
                  <span>{a.nome}</span>
                  <button type="button" aria-label={`Remover ${a.nome}`} onClick={() => set('anexos', form.anexos.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>

          {!template && canSchedule && (
            <section className="af-card af-publish">
              <h3>Publicação</h3>
              <div className="ws-segment af-publish-mode" role="group" aria-label="Quando publicar">
                <button type="button" aria-pressed={!scheduled} onClick={() => setScheduled(false)}>
                  Agora
                </button>
                <button type="button" aria-pressed={scheduled} onClick={() => setScheduled(true)}>
                  Agendar
                </button>
              </div>
              {scheduled ? (
                <label className="qz-field">
                  <span>Data e hora (Brasília)</span>
                  <input id="activity-publication" type="datetime-local" required value={publishAt} onChange={e => setPublishAt(e.target.value)} />
                  <small className="af-hint">Até lá, só professores autorizados veem a atividade.</small>
                </label>
              ) : (
                <small className="af-hint">Os alunos recebem a atividade assim que você publicar.</small>
              )}
            </section>
          )}

          <div className="af-actions">
            <Button type="submit" className="qz-btn-primary">
              {submitLabel}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </aside>
      </fieldset>
    </form>
  );
}
