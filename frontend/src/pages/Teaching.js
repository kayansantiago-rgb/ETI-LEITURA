import { useEffect, useState } from 'react';
import { PageSkeleton } from '@/components/Skeleton';
import { createPortal } from 'react-dom';
import { Play, Plus, FileText, Search, X, Pencil, Trash2, ExternalLink, Paperclip, Youtube, Captions } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import OwlEmpty from '@/components/OwlEmpty';
import SubjectBadge, { subjectIdentity } from '@/components/SubjectBadge';
import { confirmAction } from '@/components/ConfirmHost';
import { Button } from '@/components/ui/button';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

const errorText = e => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível concluir. Confira os campos e tente novamente.');
const initialClass = () => (getUser()?.role === 'admin' ? 'TODAS' : getUser()?.turmas?.[0] || '');
const classLabel = t => (t === 'TODAS' ? 'Todas as turmas' : t);
const thumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const date = v => (v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '');

function useModal(onClose) {
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
}

function Viewer({ item, onClose }) {
  useModal(onClose);
  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="vd-viewer" role="dialog" aria-modal="true" aria-label={item.titulo}>
        <button type="button" className="vd-viewer-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        {item.video_id ? (
          <div className="vd-player">
            <iframe
              title={item.titulo}
              src={`https://www.youtube-nocookie.com/embed/${item.video_id}?autoplay=1&rel=0`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : null}
        <div className="vd-viewer-body">
          <div className="vd-tags">
            <SubjectBadge subject={item.disciplina} />
            <span className="ws-chip">{classLabel(item.turma)}</span>
          </div>
          <h2>{item.titulo}</h2>
          <p className="vd-author">
            Por {item.professor_nome || 'professor'} {item.created_at && `· ${date(item.created_at)}`}
          </p>
          {item.descricao && <p className="vd-desc">{item.descricao}</p>}
          {!!item.anexos?.length && (
            <div className="vd-files">
              <h3>Material de apoio</h3>
              {item.anexos.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="vd-file">
                  <span>
                    <FileText size={16} />
                  </span>
                  <strong>{a.nome}</strong>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          )}
          {item.transcricao && (
            <details className="vd-transcript">
              <summary>
                <Captions size={16} /> Ler transcrição ou resumo do vídeo
              </summary>
              <p>{item.transcricao}</p>
            </details>
          )}
          {item.video_id && (
            <a className="vd-yt" href={`https://www.youtube.com/watch?v=${item.video_id}`} target="_blank" rel="noreferrer">
              <Youtube size={16} /> Abrir no YouTube
            </a>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}

function MaterialForm({ initial, onClose, onSaved }) {
  const user = getUser();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  useModal(onClose);
  const change = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const classes = TURMAS.filter(t => user.role === 'admin' || user.turmas?.includes(t.value));
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await (form.id ? api.put(`/admin/materials/${form.id}`, form) : api.post('/admin/materials', form));
      toast.success(form.id ? 'Material atualizado.' : 'Material publicado.');
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  const attach = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const r = await api.post(file.type === 'application/pdf' ? '/admin/books/upload-pdf' : '/admin/books/upload-cover', body);
      setForm(f => ({ ...f, anexos: [...f.anexos, { nome: file.name, url: r.data.url }] }));
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };
  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="vd-form" onSubmit={save} role="dialog" aria-modal="true" aria-label={form.id ? 'Editar material' : 'Novo material'}>
        <header>
          <div>
            <p className="ws-eyebrow">Sala de estudos</p>
            <h2>{form.id ? 'Editar material' : 'Novo material de estudo'}</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="vd-form-body">
<fieldset disabled={busy} className="vd-form-fields">
          <label className="qz-field">
            <span>Título</span>
            <input id="material-title" required maxLength={160} placeholder="Ex.: Como fazer um bom resumo" value={form.titulo} onChange={e => change('titulo', e.target.value)} />
          </label>
          <div className="af-two">
            <label className="qz-field">
              <span>Disciplina</span>
              <input id="material-subject" required maxLength={80} placeholder="Língua Portuguesa" value={form.disciplina} onChange={e => change('disciplina', e.target.value)} />
            </label>
            <label className="qz-field">
              <span>Turma</span>
              <select id="material-class" value={form.turma} onChange={e => change('turma', e.target.value)}>
                {user.role === 'admin' && <option value="TODAS">Todas as turmas</option>}
                {classes.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="qz-field">
            <span>Link do vídeo no YouTube</span>
            <input id="material-video" type="url" maxLength={500} placeholder="https://www.youtube.com/watch?v=…" value={form.video_url || ''} onChange={e => change('video_url', e.target.value)} />
            <small className="af-hint">Vídeo público ou não listado. Ele continua hospedado no YouTube.</small>
          </label>
          <label className="qz-field">
            <span>Orientações de estudo</span>
            <textarea id="material-description" rows={3} maxLength={10000} placeholder="O que observar, em que ordem estudar…" value={form.descricao} onChange={e => change('descricao', e.target.value)} />
          </label>
          <label className="qz-field">
            <span>Transcrição ou resumo do vídeo</span>
            <textarea id="material-transcript" rows={3} maxLength={30000} placeholder="Uma alternativa em texto para quem não pode ouvir o áudio." value={form.transcricao || ''} onChange={e => change('transcricao', e.target.value)} />
          </label>
          <div className="qz-field">
            <span>Material de apoio</span>
            <label className={`qz-import af-attach ${form.anexos.length >= 5 ? 'is-disabled' : ''}`}>
              <Paperclip size={15} /> PDF ou imagem ({form.anexos.length}/5)
              <input id="material-file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" disabled={form.anexos.length >= 5} onChange={attach} />
            </label>
            {form.anexos.map((a, i) => (
              <div className="af-file" key={i}>
                <span>{a.nome}</span>
                <button type="button" aria-label={`Remover ${a.nome}`} onClick={() => change('anexos', form.anexos.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </fieldset>
</div>
        <footer className="bqe-footer">
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="qz-btn-primary" disabled={busy || !form.turma}>
            {busy ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Publicar material'}
          </Button>
        </footer>
      </form>
    </div>,
    document.body
  );
}

function MaterialCard({ item, canManage, onOpen, onEdit, onRemove }) {
  const { tone } = subjectIdentity(item.disciplina);
  return (
    <article id={`material-${item.id}`} className="vd-card">
      <button type="button" className={`vd-thumb tone-${tone}`} onClick={() => onOpen(item)} aria-label={`${item.video_id ? 'Assistir' : 'Abrir'} ${item.titulo}`}>
        {item.video_id && <img src={thumb(item.video_id)} alt="" loading="lazy" />}
        <span className="vd-play">{item.video_id ? <Play size={20} fill="currentColor" /> : <FileText size={18} />}</span>
        <span className="vd-kind">{item.video_id ? 'Vídeo' : 'Material'}</span>
      </button>
      <div className="vd-card-body">
        <div className="vd-tags">
          <SubjectBadge subject={item.disciplina} />
          <span className="ws-chip">{classLabel(item.turma)}</span>
        </div>
        <h2>
          <button type="button" onClick={() => onOpen(item)}>
            {item.titulo}
          </button>
        </h2>
        {item.descricao && <p>{item.descricao}</p>}
        <footer>
          <span className="vd-meta">
            {item.professor_nome || 'Professor'}
            {!!item.anexos?.length && (
              <>
                {' · '}
                <Paperclip size={12} /> {item.anexos.length}
              </>
            )}
          </span>
          {canManage && (
            <span className="vd-actions">
              <button type="button" className="ws-icon-btn" onClick={() => onEdit(item)} aria-label={`Editar ${item.titulo}`} title="Editar">
                <Pencil size={15} />
              </button>
              <button type="button" className="ws-icon-btn is-danger" onClick={() => onRemove(item)} aria-label={`Excluir ${item.titulo}`} title="Excluir">
                <Trash2 size={15} />
              </button>
            </span>
          )}
        </footer>
      </div>
    </article>
  );
}

export function Videos() {
  const user = getUser();
  const staff = ['teacher', 'admin'].includes(user?.role);
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');

  const load = async () => {
    setFailed(false);
    try {
      setItems((await api.get('/materials')).data.map(x => ({ anexos: [], ...x })));
      setTimeout(() => document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    } catch {
      setFailed(true);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async item => {
    if (!(await confirmAction({ title: 'Excluir material?', message: `“${item.titulo}” deixará de aparecer para as turmas.`, confirmLabel: 'Excluir' }))) return;
    try {
      await api.delete(`/admin/materials/${item.id}`);
      toast.success('Material excluído.');
      load();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const list = items || [];
  const subjects = [...new Set(list.map(x => x.disciplina))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const term = search.toLocaleLowerCase('pt-BR');
  const visible = list.filter(x => (!subject || x.disciplina === subject) && `${x.titulo} ${x.descricao} ${x.disciplina} ${x.turma}`.toLocaleLowerCase('pt-BR').includes(term));
  const newForm = () => setForm({ titulo: '', disciplina: '', turma: initialClass(), descricao: '', video_url: '', transcricao: '', anexos: [] });

  return (
    <DashboardLayout>
      <PageIntro
        section="SALA DE ESTUDOS"
        title="Vídeos e materiais"
        description={staff ? 'Organize as referências de cada aula e compartilhe com suas turmas.' : 'Continue aprendendo com os materiais selecionados pelos seus professores.'}
      >
        {staff && (
          <Button className="qz-btn-primary" onClick={newForm}>
            <Plus size={17} /> Adicionar material
          </Button>
        )}
      </PageIntro>

      <div className="ws-card ws-toolbar vd-toolbar">
        <label className="ws-search">
          <Search size={16} />
          <input aria-label="Buscar materiais" placeholder="Busque por título, disciplina ou turma" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        {subjects.length > 1 && (
          <div className="nt-chips" role="group" aria-label="Filtrar disciplina">
            <button type="button" aria-pressed={!subject} onClick={() => setSubject('')}>
              Todas
            </button>
            {subjects.map(s => (
              <button key={s} type="button" aria-pressed={subject === s} onClick={() => setSubject(subject === s ? '' : s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {!items ? (
        failed ? (
          <div className="ws-card ws-empty" role="alert">
            <>
              Não foi possível carregar.{' '}
              <button className="underline font-semibold" onClick={load}>
                Tentar novamente
              </button>
            </>
          </div>
        ) : (
          <PageSkeleton cards={3} rows={0} label="Carregando materiais…" />
        )
      ) : !visible.length ? (
        <div className="ws-card">
          <OwlEmpty
            mood={list.length ? 'search' : 'calm'}
            title={list.length ? 'Nenhum material encontrado' : 'Sua sala de estudos começa aqui'}
            text={list.length ? 'Tente outra busca ou disciplina.' : staff ? 'Adicione um vídeo ou PDF para orientar o estudo da turma.' : 'Os materiais publicados pelos professores aparecerão aqui.'}
            action={staff && !list.length ? 'Adicionar material' : null}
            onAction={newForm}
          />
        </div>
      ) : (
        <div className="vd-grid">
          {visible.map(item => (
            <MaterialCard
              key={item.id}
              item={item}
              canManage={staff && (user.role === 'admin' || item.professor_id === user.id)}
              onOpen={setViewing}
              onEdit={x => setForm({ ...x, video_url: x.video_url || '', transcricao: x.transcricao || '', descricao: x.descricao || '' })}
              onRemove={remove}
            />
          ))}
        </div>
      )}

      {viewing && <Viewer item={viewing} onClose={() => setViewing(null)} />}
      {form && (
        <MaterialForm
          initial={form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}
    </DashboardLayout>
  );
}
