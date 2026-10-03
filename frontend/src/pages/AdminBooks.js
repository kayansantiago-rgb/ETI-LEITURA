import { confirmAction } from '@/components/ConfirmHost';
import ErrorState from '@/components/ErrorState';
import { PageSkeleton } from '@/components/Skeleton';
import OwlEmpty from '@/components/OwlEmpty';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  ListChecks,
  FileText,
  Trophy,
  Users,
  ExternalLink,
  X,
  UploadCloud,
  ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import BookQuizEditor from '@/components/BookQuizEditor';
import ClassPicker from '@/components/ClassPicker';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

const LEVEL = { AMBOS: 'Todos os leitores', FUNDAMENTAL: 'Fundamental', 'MÉDIO': 'Médio' };
const normalize = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const errorText = e => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível concluir. Tente novamente.');

function Cover({ book, size = 'sm' }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`ab-cover is-${size}`}>
      {book.capa_url && !failed ? <img src={book.capa_url} alt="" onError={() => setFailed(true)} /> : <BookOpen size={size === 'sm' ? 18 : 30} />}
    </span>
  );
}

function EditSheet({ book, onClose, onSaved }) {
  const [form, setForm] = useState({
    titulo: book.titulo,
    autor: book.autor || '',
    descricao: book.descricao || '',
    nivel_ensino: book.nivel_ensino || 'AMBOS',
    capa_url: book.capa_url || '',
    arquivo_url: book.arquivo_url || '',
    turmas: book.turmas || []
  });
  const [busy, setBusy] = useState('');
  const coverRef = useRef(null);
  const pdfRef = useRef(null);
  const field = (key, value) => setForm(v => ({ ...v, [key]: value }));

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const upload = async (file, kind) => {
    if (!file) return;
    const valid = kind === 'pdf' ? file.type === 'application/pdf' : ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!valid || file.size > (kind === 'pdf' ? 50 : 5) * 1024 * 1024) {
      toast.error(kind === 'pdf' ? 'Escolha um PDF de até 50 MB.' : 'Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');
      return;
    }
    setBusy(kind);
    try {
      const data = new FormData();
      data.append('file', file);
      const r = await api.post(`/admin/books/upload-${kind}`, data);
      field(kind === 'pdf' ? 'arquivo_url' : 'capa_url', r.data.url);
      toast.success(kind === 'pdf' ? 'Novo PDF enviado. Salve para aplicar.' : 'Nova capa enviada. Salve para aplicar.');
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy('');
    }
  };

  const save = async e => {
    e.preventDefault();
    setBusy('save');
    try {
      const r = await api.put(`/admin/books/${book.id}`, { ...form, titulo: form.titulo.trim(), autor: form.autor.trim() || 'Autor não informado' });
      toast.success('Livro atualizado.');
      onSaved({ ...book, ...form, ...r.data });
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy('');
    }
  };

  return createPortal(
    <div className="ws-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="ws-sheet ab-sheet" onSubmit={save} role="dialog" aria-modal="true" aria-label={`Editar ${book.titulo}`}>
        <header className="ws-sheet-head">
          <span className="qz-settings-icon">
            <Pencil size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="ws-eyebrow">Editar livro</p>
            <h2>{form.titulo || 'Sem título'}</h2>
            <p>As alterações aparecem na biblioteca assim que você salvar.</p>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={19} />
          </button>
        </header>
        <div className="ws-sheet-body">
          <fieldset disabled={!!busy} className="ab-edit">
            <div className="ab-edit-cover">
              <Cover book={{ ...book, capa_url: form.capa_url }} size="lg" />
              <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => upload(e.target.files[0], 'cover')} />
              <Button type="button" variant="outline" onClick={() => coverRef.current.click()}>
                <ImageIcon size={15} /> {busy === 'cover' ? 'Enviando…' : 'Trocar capa'}
              </Button>
            </div>
            <div className="ab-edit-fields">
              <label className="qz-field">
                <span>Título</span>
                <input required maxLength={200} value={form.titulo} onChange={e => field('titulo', e.target.value)} />
              </label>
              <label className="qz-field">
                <span>Autor</span>
                <input maxLength={200} value={form.autor} onChange={e => field('autor', e.target.value)} />
              </label>
              <label className="qz-field">
                <span>Disponível para</span>
                <select value={form.nivel_ensino} onChange={e => field('nivel_ensino', e.target.value)} data-testid="edit-nivel-ensino">
                  <option value="AMBOS">Todos os alunos</option>
                  <option value="FUNDAMENTAL">Apenas ensino fundamental</option>
                  <option value="MÉDIO">Apenas ensino médio</option>
                </select>
              </label>
              <ClassPicker value={form.turmas} onChange={turmas => field('turmas', turmas)} />
              <label className="qz-field">
                <span>Sinopse</span>
                <textarea className="cx-feedback" maxLength={5000} value={form.descricao} onChange={e => field('descricao', e.target.value)} placeholder="Do que trata o livro?" />
              </label>
              <div className="ab-pdf">
                <span className={form.arquivo_url ? 'is-ok' : 'is-missing'}>{form.arquivo_url ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}</span>
                <div>
                  <strong>{form.arquivo_url ? 'PDF cadastrado' : 'Sem PDF'}</strong>
                  <small>{form.arquivo_url ? 'Os alunos podem ler no leitor da plataforma.' : 'Sem o PDF, o livro não pode ser lido nem gerar certificado.'}</small>
                </div>
                <input ref={pdfRef} type="file" accept="application/pdf" className="sr-only" onChange={e => upload(e.target.files[0], 'pdf')} />
                <Button type="button" variant="outline" onClick={() => pdfRef.current.click()}>
                  <UploadCloud size={15} /> {busy === 'pdf' ? 'Enviando…' : form.arquivo_url ? 'Substituir' : 'Enviar PDF'}
                </Button>
              </div>
            </div>
          </fieldset>
        </div>
        <footer className="bqe-footer">
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="qz-btn-primary" disabled={!!busy} data-testid="save-book-button">
            {busy === 'save' ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </footer>
      </form>
    </div>,
    document.body
  );
}

export default function AdminBooks() {
  const user = getUser();
  const admin = user?.role === 'admin';
  const canManage = book => admin || book.professor_id === user?.id;
  const [books, setBooks] = useState(null);
  const [stats, setStats] = useState({});
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [quizBook, setQuizBook] = useState(null);

  const load = () => {
    setFailed(false);
    Promise.all([api.get('/books'), api.get('/admin/books/overview').catch(() => ({ data: {} }))])
      .then(([b, o]) => {
        setBooks(b.data);
        setStats(o.data || {});
      })
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  const remove = async book => {
    if (!(await confirmAction({ title: 'Excluir livro?', message: `Excluir "${book.titulo}"? Resumos, progresso e questionário deste livro também serão removidos. Certificados já emitidos continuam válidos.`, confirmLabel: 'Excluir' }))) return;
    try {
      await api.delete(`/admin/books/${book.id}`);
      setBooks(list => list.filter(b => b.id !== book.id));
      toast.success('Livro excluído.');
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const all = books || [];
  const info = id => stats[id] || {};
  const visible = all
    .filter(b => normalize(`${b.titulo} ${b.autor}`).includes(normalize(query)))
    .filter(b => !level || (b.nivel_ensino || 'AMBOS') === level)
    .filter(b => (filter === 'noquiz' ? !info(b.id).perguntas : filter === 'nopdf' ? !b.arquivo_url : true))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const totals = {
    pdf: all.filter(b => b.arquivo_url).length,
    quiz: all.filter(b => info(b.id).perguntas).length,
    certificados: Object.values(stats).reduce((s, x) => s + (x.certificados || 0), 0),
    leitores: Object.values(stats).reduce((s, x) => s + (x.leitores || 0), 0)
  };

  return (
    <DashboardLayout>
      <div data-testid="admin-books-page">
        <PageIntro section="BIBLIOTECA / ACERVO" title="Gerenciar livros" description="Cadastre livros, mantenha capas e PDFs em dia e crie o questionário que libera o certificado de leitura.">
          {(
            <Button asChild className="qz-btn-primary">
              <Link to="/admin/add-book">
                <Plus size={16} /> Adicionar livro
              </Link>
            </Button>
          )}
        </PageIntro>

        {failed ? (
          <ErrorState title="Não deu para carregar o acervo" onRetry={load} />
        ) : !books ? (
          <PageSkeleton cards={3} rows={4} label="Carregando acervo…" />
        ) : (
          <>
            <section className="ws-kpis">
              <article className="ws-card ws-kpi is-featured">
                <span className="ws-kpi-icon">
                  <BookOpen size={18} />
                </span>
                <span>Livros no acervo</span>
                <strong>{all.length}</strong>
                <p>{totals.pdf} com PDF para leitura</p>
              </article>
              <article className="ws-card ws-kpi">
                <span className="ws-kpi-icon">
                  <ListChecks size={18} />
                </span>
                <span>Com questionário</span>
                <strong>
                  {totals.quiz}
                  <small> /{all.length}</small>
                </strong>
                <p>Liberam certificado ao final</p>
              </article>
              <article className="ws-card ws-kpi">
                <span className="ws-kpi-icon">
                  <Users size={18} />
                </span>
                <span>Leituras iniciadas</span>
                <strong>{totals.leitores}</strong>
                <p>Somando todos os livros</p>
              </article>
              <article className="ws-card ws-kpi">
                <span className="ws-kpi-icon gb-warn">
                  <Trophy size={18} />
                </span>
                <span>Certificados emitidos</span>
                <strong>{totals.certificados}</strong>
                <p>Alunos aprovados nos questionários</p>
              </article>
            </section>

            <div className="ws-card ws-toolbar">
              <label className="ws-search">
                <Search size={16} />
                <input aria-label="Buscar livro" placeholder="Buscar por título ou autor…" value={query} onChange={e => setQuery(e.target.value)} />
              </label>
              <select aria-label="Filtrar etapa" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">Todas as etapas</option>
                <option value="FUNDAMENTAL">Fundamental</option>
                <option value="MÉDIO">Médio</option>
                <option value="AMBOS">Todos os leitores</option>
              </select>
              <div className="ws-segment" role="group" aria-label="Situação">
                {[
                  ['all', 'Todos'],
                  ['noquiz', 'Sem questionário'],
                  ['nopdf', 'Sem PDF']
                ].map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {!visible.length ? (
              <div className="ws-card">
<OwlEmpty compact mood="search" title={all.length ? 'Nenhum livro nesta seleção' : 'Seu acervo começa aqui'} text={all.length ? 'Ajuste a busca ou os filtros.' : 'Envie o primeiro PDF para montar a biblioteca da escola.'} />
</div>
            ) : (
              <div className="ws-card ws-table-wrap">
                <table className="ws-table ab-table">
                  <thead>
                    <tr>
                      <th>Livro</th>
                      <th>Etapa / turmas</th>
                      <th>PDF</th>
                      <th>Questionário</th>
                      <th className="is-center">Leitores</th>
                      <th className="is-center">Certificados</th>
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(book => {
                      const s = info(book.id);
                      return (
                        <tr key={book.id}>
                          <td>
                            <Link to={`/book/${book.id}`} className="ab-book">
                              <Cover book={book} />
                              <span className="min-w-0">
                                <strong>{book.titulo}</strong>
                                <small>{book.autor || 'Autor não informado'}</small>
                              </span>
                            </Link>
                          </td>
                          <td>
                            <span className="ws-chip">{LEVEL[book.nivel_ensino] || book.nivel_ensino || 'Todos'}</span>
                            <small className="ab-sub">{book.turmas?.length ? book.turmas.join(', ') : 'Todas as turmas'}</small>
                          </td>
                          <td>
                            {book.arquivo_url ? (
                              <span className="ab-status is-ok">
                                <FileText size={13} /> Disponível
                              </span>
                            ) : (
                              <span className="ab-status is-missing">
                                <AlertCircle size={13} /> Faltando
                              </span>
                            )}
                          </td>
                          <td>
                            <button type="button" className={`ab-quiz ${s.perguntas ? 'is-ok' : ''}`} onClick={() => setQuizBook(book)}>
                              <ListChecks size={14} /> {s.perguntas ? `${s.perguntas} perguntas` : 'Criar'}
                            </button>
                          </td>
                          <td className="is-center">
                            {s.leitores || 0}
                            {s.concluidos ? <small className="ab-sub">{s.concluidos} concluíram</small> : null}
                          </td>
                          <td className="is-center">{s.certificados || 0}</td>
                          <td>
                            <div className="ab-actions">
                              <Link to={`/reader/${book.id}`} className="ws-icon-btn" title="Abrir no leitor" aria-label={`Abrir ${book.titulo} no leitor`}>
                                <ExternalLink size={16} />
                              </Link>
                              {canManage(book) && (
                                <>
                                  <button type="button" className="ws-icon-btn" title="Editar" aria-label={`Editar ${book.titulo}`} onClick={() => setEditing(book)} data-testid={`edit-book-${book.id}`}>
                                    <Pencil size={16} />
                                  </button>
                                  <button type="button" className="ws-icon-btn ab-danger" title="Excluir" aria-label={`Excluir ${book.titulo}`} onClick={() => remove(book)} data-testid={`delete-book-${book.id}`}>
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      {editing && (
        <EditSheet
          book={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setBooks(list => list.map(b => (b.id === updated.id ? updated : b)));
            setEditing(null);
          }}
        />
      )}
      {quizBook && (
        <BookQuizEditor
          book={quizBook}
          onClose={changed => {
            setQuizBook(null);
            if (changed) load();
          }}
        />
      )}
    </DashboardLayout>
  );
}
