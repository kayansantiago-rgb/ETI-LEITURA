import { useEffect, useState } from 'react';
import ErrorState from '@/components/ErrorState';
import { PageSkeleton } from '@/components/Skeleton';
import { createPortal } from 'react-dom';
import { Plus, Search, X, Check, KeyRound, Pencil, Power, Copy, Mail, Users, UserCheck, UserX, School, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import OwlEmpty from '@/components/OwlEmpty';
import { confirmAction } from '@/components/ConfirmHost';
import { Button } from '@/components/ui/button';
import { TURMAS } from '@/constants/turmas';
import { activityError } from '@/pages/Activities';
import api from '@/lib/api';
import { toast } from 'sonner';

const initials = name =>
  (name || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
const TONES = ['#6366f1', '#a855f7', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b'];
const tone = name => TONES[[...(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];

function Modal({ label, eyebrow, title, onClose, onSubmit, children, footer }) {
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
  const Tag = onSubmit ? 'form' : 'section';
  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <Tag className="vd-form tp-modal" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-label={label}>
        <header>
          <div>
            <p className="ws-eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="vd-form-body">{children}</div>
        <footer className="bqe-footer">{footer}</footer>
      </Tag>
    </div>,
    document.body
  );
}

function ClassToggles({ value, onChange }) {
  const toggle = t => onChange(value.includes(t) ? value.filter(x => x !== t) : [...value, t]);
  return (
    <div className="qz-field">
      <span>
        Turmas autorizadas <b className="tp-count">{value.length}</b>
      </span>
      <div className="tp-classes" role="group" aria-label="Turmas autorizadas">
        {TURMAS.map(t => (
          <button key={t.value} type="button" aria-pressed={value.includes(t.value)} onClick={() => toggle(t.value)}>
            <i>{value.includes(t.value) && <Check size={12} strokeWidth={3} />}</i>
            <span>
              <strong>{t.value}</strong>
              <small>{t.label.includes('Médio') ? 'Ensino Médio' : 'Ensino Fundamental'}</small>
            </span>
          </button>
        ))}
      </div>
      <small className="af-hint">O professor só vê alunos, atividades e relatórios dessas turmas.</small>
    </div>
  );
}

function NewTeacher({ onClose, onSaved }) {
  const [form, setForm] = useState({ nome: '', email: '', password: '', turmas: [] });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/teachers', form);
      toast.success(`Conta de ${form.nome.split(' ')[0]} criada.`);
      onSaved();
    } catch (err) {
      toast.error(activityError(err, 'Confira os dados e selecione uma turma.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      label="Novo professor"
      eyebrow="Equipe da escola"
      title="Novo professor"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="qz-btn-primary" disabled={busy || !form.turmas.length}>
            {busy ? 'Criando…' : 'Criar conta'}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="vd-form-fields">
        <label className="qz-field">
          <span>Nome completo</span>
          <input id="teacher-nome" required minLength={2} maxLength={160} placeholder="Ex.: Ana Souza" value={form.nome} onChange={e => set('nome', e.target.value)} />
        </label>
        <label className="qz-field">
          <span>E-mail</span>
          <input id="teacher-email" type="email" required maxLength={160} placeholder="professor@escola.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </label>
        <label className="qz-field">
          <span>Senha inicial</span>
          <span className="tp-password">
            <input id="teacher-password" type={show ? 'text' : 'password'} required minLength={10} maxLength={72} autoComplete="new-password" value={form.password} onChange={e => set('password', e.target.value)} />
            <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
          <small className="af-hint">Mínimo de 10 caracteres. O professor pode trocar depois pelo link de nova senha.</small>
        </label>
        <ClassToggles value={form.turmas} onChange={v => set('turmas', v)} />
      </fieldset>
    </Modal>
  );
}

function EditClasses({ teacher, onClose, onSaved }) {
  const [turmas, setTurmas] = useState(teacher.turmas || []);
  const [busy, setBusy] = useState(false);
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/admin/teachers/${teacher.id}`, { turmas, active: teacher.active !== false });
      toast.success('Turmas atualizadas. O professor precisa entrar novamente.');
      onSaved();
    } catch (err) {
      toast.error(activityError(err, 'Selecione pelo menos uma turma.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      label={`Turmas de ${teacher.nome}`}
      eyebrow={teacher.nome}
      title="Turmas do professor"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="qz-btn-primary" disabled={busy || !turmas.length}>
            {busy ? 'Salvando…' : 'Salvar turmas'}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="vd-form-fields">
        <ClassToggles value={turmas} onChange={setTurmas} />
      </fieldset>
    </Modal>
  );
}

function RecoveryLink({ teacher, onClose }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const generate = async () => {
    setBusy(true);
    try {
      setUrl((await api.post(`/admin/users/${teacher.id}/recovery`)).data.url);
    } catch {
      toast.error('Não foi possível gerar o link.');
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado.');
    } catch {
      toast.error('Selecione o link e copie manualmente.');
    }
  };
  return (
    <Modal
      label="Link de nova senha"
      eyebrow={teacher.nome}
      title="Link de nova senha"
      onClose={onClose}
      footer={
        <>
          <span className="flex-1" />
          <Button type="button" className="qz-btn-primary" onClick={onClose}>
            Concluir
          </Button>
        </>
      }
    >
      <div className="tp-recovery">
        <span className="tp-recovery-icon">
          <KeyRound size={22} />
        </span>
        <p>Gere um link para {teacher.nome.split(' ')[0]} criar uma nova senha. Entregue apenas ao próprio professor: o link funciona uma única vez e vale por 30 minutos.</p>
        {url ? (
          <div className="tp-link">
            <input aria-label="Link para redefinir senha" readOnly value={url} onFocus={e => e.target.select()} />
            <button type="button" className="qz-btn-primary" onClick={copy}>
              <Copy size={15} /> Copiar
            </button>
          </div>
        ) : (
          <Button type="button" className="qz-btn-primary" disabled={busy} onClick={generate}>
            <KeyRound size={16} /> {busy ? 'Gerando…' : 'Gerar link'}
          </Button>
        )}
      </div>
    </Modal>
  );
}

function TeacherCard({ teacher, busy, onEdit, onToggle, onRecovery }) {
  const active = teacher.active !== false;
  return (
    <article className={`tp-card ${active ? '' : 'is-off'}`} style={{ '--tone': tone(teacher.nome) }}>
      <header>
        <span className="tp-avatar">{initials(teacher.nome)}</span>
        <div className="min-w-0 flex-1">
          <h3>{teacher.nome}</h3>
          <p>
            <Mail size={12} /> {teacher.email}
          </p>
        </div>
        <span className={`tp-status ${active ? 'is-on' : 'is-off'}`}>{active ? 'Ativo' : 'Desativado'}</span>
      </header>
      <div className="tp-chips">
        {(teacher.turmas || []).length ? (
          teacher.turmas
            .slice()
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
            .map(t => (
              <span key={t} className="ws-chip">
                {t}
              </span>
            ))
        ) : (
          <span className="tp-none">Nenhuma turma</span>
        )}
      </div>
      <footer>
        <button type="button" onClick={() => onEdit(teacher)} disabled={busy}>
          <Pencil size={14} /> Turmas
        </button>
        <button type="button" onClick={() => onRecovery(teacher)} disabled={busy}>
          <KeyRound size={14} /> Nova senha
        </button>
        <button type="button" className={active ? 'is-danger' : 'is-ok'} onClick={() => onToggle(teacher)} disabled={busy || !(teacher.turmas || []).length}>
          <Power size={14} /> {active ? 'Desativar' : 'Ativar'}
        </button>
      </footer>
    </article>
  );
}

export default function Teachers() {
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setFailed(false);
    try {
      setItems((await api.get('/admin/teachers')).data);
    } catch {
      setFailed(true);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const toggle = async teacher => {
    const active = teacher.active !== false;
    if (
      active &&
      !(await confirmAction({
        title: `Desativar ${teacher.nome}?`,
        message: 'O professor perde o acesso à plataforma até ser reativado. Atividades e correções continuam salvas.',
        confirmLabel: 'Desativar'
      }))
    )
      return;
    setBusy(true);
    try {
      await api.put(`/admin/teachers/${teacher.id}`, { turmas: teacher.turmas, active: !active });
      toast.success(active ? 'Conta desativada.' : 'Conta reativada.');
      load();
    } catch (err) {
      toast.error(activityError(err, 'Não foi possível alterar a conta.'));
    } finally {
      setBusy(false);
    }
  };

  const list = items || [];
  const actives = list.filter(t => t.active !== false);
  const covered = new Set(actives.flatMap(t => t.turmas || []));
  const uncovered = TURMAS.filter(t => !covered.has(t.value));
  const term = search.toLocaleLowerCase('pt-BR');
  const visible = list.filter(
    t => (status === 'todos' || (status === 'ativos') === (t.active !== false)) && `${t.nome} ${t.email} ${(t.turmas || []).join(' ')}`.toLocaleLowerCase('pt-BR').includes(term)
  );
  const done = () => {
    setModal(null);
    load();
  };

  return (
    <DashboardLayout>
      <PageIntro section="GESTÃO / EQUIPE" title="Professores" description="Cada professor entra com a própria conta e acompanha apenas as turmas autorizadas.">
        <Button className="qz-btn-primary" onClick={() => setModal({ type: 'new' })}>
          <Plus size={17} /> Novo professor
        </Button>
      </PageIntro>

      <section className="tp-kpis">
        <div className="is-featured">
          <Users size={18} />
          <strong>{list.length}</strong>
          <span>professores</span>
        </div>
        <div>
          <UserCheck size={18} />
          <strong>{actives.length}</strong>
          <span>contas ativas</span>
        </div>
        <div>
          <UserX size={18} />
          <strong>{list.length - actives.length}</strong>
          <span>desativadas</span>
        </div>
        <div>
          <School size={18} />
          <strong>
            {TURMAS.length - uncovered.length}
            <small>/{TURMAS.length}</small>
          </strong>
          <span>turmas com professor</span>
        </div>
      </section>

      {items && uncovered.length > 0 && (
        <div className="tp-alert" role="note">
          <AlertTriangle size={18} />
          <p>
            <b>Turmas sem professor ativo:</b> {uncovered.map(t => t.value).join(', ')}.
          </p>
        </div>
      )}

      <div className="ws-card ws-toolbar tp-toolbar">
        <label className="ws-search">
          <Search size={16} />
          <input aria-label="Buscar professor" placeholder="Buscar por nome, e-mail ou turma" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <div className="ws-segment" role="group" aria-label="Filtrar por situação">
          {[
            ['todos', 'Todos', list.length],
            ['ativos', 'Ativos', actives.length],
            ['inativos', 'Desativados', list.length - actives.length]
          ].map(([v, l, n]) => (
            <button key={v} type="button" aria-pressed={status === v} onClick={() => setStatus(v)}>
              {l} <span>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {!items ? (
        failed ? (
          <ErrorState onRetry={load} />
        ) : (
          <PageSkeleton cards={3} rows={0} label="Carregando professores…" />
        )
      ) : !visible.length ? (
        <div className="ws-card">
          <OwlEmpty
            mood={list.length ? 'search' : 'calm'}
            title={list.length ? 'Nenhum professor encontrado' : 'Monte a equipe da escola'}
            text={list.length ? 'Tente outra busca ou filtro.' : 'Cadastre o primeiro professor e escolha as turmas que ele acompanha.'}
            action={list.length ? null : 'Novo professor'}
            onAction={() => setModal({ type: 'new' })}
          />
        </div>
      ) : (
        <div className="tp-grid">
          {visible.map(t => (
            <TeacherCard
              key={t.id}
              teacher={t}
              busy={busy}
              onEdit={teacher => setModal({ type: 'edit', teacher })}
              onToggle={toggle}
              onRecovery={teacher => setModal({ type: 'recovery', teacher })}
            />
          ))}
        </div>
      )}

      {modal?.type === 'new' && <NewTeacher onClose={() => setModal(null)} onSaved={done} />}
      {modal?.type === 'edit' && <EditClasses teacher={modal.teacher} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.type === 'recovery' && <RecoveryLink teacher={modal.teacher} onClose={() => setModal(null)} />}
    </DashboardLayout>
  );
}
