import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Image as ImageIcon, Video, Upload, Loader2, Play, X, Images } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import OwlEmpty from '@/components/OwlEmpty';
import { confirmAction } from '@/components/ConfirmHost';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

const youtubeId = url => {
  const match = (url || '').match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/);
  return match && match[2].length === 11 ? match[2] : null;
};
const date = v => (v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '');
const initials = name =>
  (name || 'E')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
const EMPTY = { tipo: 'foto', titulo: '', url_media: '', descricao: '' };

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

function Lightbox({ post, onClose }) {
  useModal(onClose);
  const id = youtubeId(post.url_media);
  return createPortal(
    <div className="ws-overlay is-center mu-lightbox" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="vd-viewer" role="dialog" aria-modal="true" aria-label={post.titulo}>
        <button type="button" className="vd-viewer-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        {post.tipo === 'video' ? (
          <div className="vd-player">
            {id && (
              <iframe
                title={post.titulo}
                src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </div>
        ) : (
          <img className="mu-full" src={post.url_media} alt={post.titulo} />
        )}
        <div className="vd-viewer-body">
          <h2>{post.titulo}</h2>
          <p className="vd-author">
            {post.autor_nome || 'Escola'} · {date(post.created_at)}
          </p>
          {post.descricao && <p className="vd-desc">{post.descricao}</p>}
        </div>
      </section>
    </div>,
    document.body
  );
}

function PostForm({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  useModal(onClose);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const videoId = form.tipo === 'video' ? youtubeId(form.url_media) : null;

  const pick = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return toast.error('Use uma imagem JPG, PNG, GIF ou WebP.');
    if (file.size > 10 * 1024 * 1024) return toast.error('Imagem muito grande. Máximo 10 MB.');
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const r = await api.post('/admin/mural/upload', body);
      set('url_media', r.data.url);
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Não foi possível enviar a imagem.');
      setPreview(null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const save = async e => {
    e.preventDefault();
    if (!form.url_media) return toast.error(form.tipo === 'foto' ? 'Escolha uma foto.' : 'Cole o link do vídeo.');
    if (form.tipo === 'video' && !videoId) return toast.error('Use um link válido do YouTube.');
    setBusy(true);
    try {
      await api.post('/admin/mural', form);
      toast.success('Publicado no mural!');
      onSaved();
    } catch {
      toast.error('Não foi possível publicar.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="vd-form" onSubmit={save} role="dialog" aria-modal="true" aria-label="Nova publicação">
        <header>
          <div>
            <p className="ws-eyebrow">Mural da escola</p>
            <h2>Nova publicação</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="vd-form-body">
<fieldset disabled={busy} className="vd-form-fields">
          <div className="ws-segment mu-type" role="group" aria-label="Tipo de publicação">
            <button
              type="button"
              aria-pressed={form.tipo === 'foto'}
              onClick={() => {
                setForm(f => ({ ...f, tipo: 'foto', url_media: '' }));
                setPreview(null);
              }}
            >
              <ImageIcon size={15} /> Foto
            </button>
            <button
              type="button"
              aria-pressed={form.tipo === 'video'}
              onClick={() => {
                setForm(f => ({ ...f, tipo: 'video', url_media: '' }));
                setPreview(null);
              }}
            >
              <Video size={15} /> Vídeo do YouTube
            </button>
          </div>

          {form.tipo === 'foto' ? (
            <div className="qz-field">
              <span>Foto</span>
              <input ref={fileRef} id="mural-image-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={pick} />
              {preview || form.url_media ? (
                <div className="mu-preview">
                  <img src={preview || form.url_media} alt="Prévia da foto" />
                  {uploading && (
                    <span className="mu-preview-busy">
                      <Loader2 size={22} className="animate-spin" /> Enviando…
                    </span>
                  )}
                  <button
                    type="button"
                    className="mu-preview-remove"
                    onClick={() => {
                      setPreview(null);
                      set('url_media', '');
                    }}
                  >
                    <X size={14} /> Trocar
                  </button>
                </div>
              ) : (
                <button type="button" className="mu-drop" onClick={() => fileRef.current?.click()}>
                  <span>
                    <Upload size={22} />
                  </span>
                  <strong>Escolher uma foto</strong>
                  <small>JPG, PNG, GIF ou WebP · até 10 MB</small>
                </button>
              )}
            </div>
          ) : (
            <label className="qz-field">
              <span>Link do vídeo</span>
              <input id="url_media" type="url" required placeholder="https://www.youtube.com/watch?v=…" value={form.url_media} onChange={e => set('url_media', e.target.value)} />
              {videoId && (
                <div className="mu-preview">
                  <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="Prévia do vídeo" />
                  <span className="vd-play">
                    <Play size={18} fill="currentColor" />
                  </span>
                </div>
              )}
            </label>
          )}

          <label className="qz-field">
            <span>Título</span>
            <input id="titulo" required maxLength={160} placeholder="Ex.: Dia da Leitura 2026" value={form.titulo} onChange={e => set('titulo', e.target.value)} />
          </label>
          <label className="qz-field">
            <span>Descrição (opcional)</span>
            <textarea id="descricao" rows={3} maxLength={2000} placeholder="Conte o que aconteceu, quem participou…" value={form.descricao} onChange={e => set('descricao', e.target.value)} />
          </label>
        </fieldset>
</div>
        <footer className="bqe-footer">
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="qz-btn-primary" disabled={busy || uploading}>
            {busy ? 'Publicando…' : 'Publicar no mural'}
          </Button>
        </footer>
      </form>
    </div>,
    document.body
  );
}

export default function AdminMural() {
  const user = getUser();
  const [posts, setPosts] = useState(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('todos');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);

  const load = async () => {
    setFailed(false);
    try {
      setPosts((await api.get('/mural')).data);
    } catch {
      setFailed(true);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async post => {
    if (!(await confirmAction({ title: 'Excluir publicação?', message: `“${post.titulo}” sairá do mural e da página inicial.`, confirmLabel: 'Excluir' }))) return;
    try {
      await api.delete(`/admin/mural/${post.id}`);
      setPosts(list => list.filter(p => p.id !== post.id));
      toast.success('Publicação excluída.');
    } catch {
      toast.error('Não foi possível excluir.');
    }
  };

  const list = posts || [];
  const photos = list.filter(p => p.tipo === 'foto').length;
  const videos = list.filter(p => p.tipo === 'video').length;
  const visible = list.filter(p => filter === 'todos' || p.tipo === filter);

  return (
    <DashboardLayout>
      <div data-testid="admin-mural-page">
        <PageIntro section="COMUNIDADE / PUBLICAÇÕES" title="Mural da escola" description="Fotos e vídeos dos momentos de leitura da escola. Tudo aparece também na página inicial.">
          <Button className="qz-btn-primary" data-testid="new-post-button" onClick={() => setCreating(true)}>
            <Plus size={17} /> Nova publicação
          </Button>
        </PageIntro>

        <div className="ws-card ws-toolbar mu-toolbar">
          <div className="mu-stats">
            <span>
              <Images size={16} /> <b>{list.length}</b> publicações
            </span>
            <span>
              <ImageIcon size={16} /> <b>{photos}</b> fotos
            </span>
            <span>
              <Video size={16} /> <b>{videos}</b> vídeos
            </span>
          </div>
          <div className="ws-segment" role="group" aria-label="Filtrar publicações">
            {[
              ['todos', 'Todas', list.length],
              ['foto', 'Fotos', photos],
              ['video', 'Vídeos', videos]
            ].map(([value, label, n]) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {label} <span>{n}</span>
              </button>
            ))}
          </div>
        </div>

        {!posts ? (
          <div className="ws-card ws-empty" role={failed ? 'alert' : 'status'}>
            {failed ? (
              <>
                Não foi possível carregar o mural.{' '}
                <button className="underline font-semibold" onClick={load}>
                  Tentar novamente
                </button>
              </>
            ) : (
              'Carregando mural…'
            )}
          </div>
        ) : !visible.length ? (
          <div className="ws-card">
            <OwlEmpty
              mood={list.length ? 'search' : 'calm'}
              title={list.length ? 'Nenhuma publicação neste formato' : 'O próximo capítulo é da sua escola'}
              text={list.length ? 'Escolha outro filtro ou compartilhe um novo conteúdo.' : 'Uma roda de leitura, um projeto especial ou uma descoberta em sala. Publique o primeiro momento da comunidade.'}
              action="Criar publicação"
              onAction={() => setCreating(true)}
            />
          </div>
        ) : (
          <div className="mu-grid">
            {visible.map((post, i) => {
              const id = post.tipo === 'video' ? youtubeId(post.url_media) : null;
              const canDelete = user?.role === 'admin' || post.autor_id === user?.id;
              return (
                <article key={post.id} className={`mu-card ${i === 0 && filter === 'todos' ? 'is-featured' : ''}`} style={{ '--d': `${Math.min(i, 8) * 50}ms` }}>
                  <button type="button" className="mu-media" onClick={() => setOpen(post)} aria-label={`Abrir ${post.titulo}`}>
                    {post.tipo === 'video' ? id ? <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" /> : <Video size={40} /> : <img src={post.url_media} alt="" loading="lazy" />}
                    {post.tipo === 'video' && (
                      <span className="vd-play">
                        <Play size={20} fill="currentColor" />
                      </span>
                    )}
                    <span className="vd-kind">{post.tipo === 'video' ? 'Vídeo' : 'Foto'}</span>
                  </button>
                  <div className="mu-body">
                    <h3>{post.titulo}</h3>
                    {post.descricao && <p>{post.descricao}</p>}
                    <footer>
                      <span className="mu-author">
                        <span className="ws-avatar">{initials(post.autor_nome)}</span>
                        <span>
                          <strong>{post.autor_nome || 'Escola'}</strong>
                          <small>{date(post.created_at)}</small>
                        </span>
                      </span>
                      {canDelete && (
                        <button type="button" className="ws-icon-btn is-danger" onClick={() => remove(post)} aria-label={`Excluir ${post.titulo}`} title="Excluir" data-testid={`delete-mural-${post.id}`}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </footer>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {open && <Lightbox post={open} onClose={() => setOpen(null)} />}
      {creating && (
        <PostForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </DashboardLayout>
  );
}
