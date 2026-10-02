import { useEffect, useRef, useState } from 'react';
import { Camera, Mail, GraduationCap, Save, Loader2, Flame, BookOpen, Award, Medal, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import PushSettings from '@/components/PushSettings';
import InstallApp from '@/components/InstallApp';
import PrivacyCard from '@/components/PrivacyCard';
import { PageSkeleton } from '@/components/Skeleton';
import RewardsPicker from '@/components/RewardsPicker';
import CertificateShelf from '@/components/CertificateShelf';
import { MedalGrid, useReadingStats } from '@/components/ReadingJourney';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { getUser, setAuth } from '@/lib/auth';
import { toast } from 'sonner';

const ROLES = { student: 'Aluno', teacher: 'Professor', admin: 'Coordenação' };
const initials = name =>
  (name || 'E')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

const remember = patch => {
  const token = localStorage.getItem('token');
  const current = getUser();
  if (token && current) setAuth(token, { ...current, ...patch });
};

function Avatar({ url, name, frame, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return toast.error('Use uma imagem JPG, PNG, GIF ou WebP.');
    if (file.size > 5 * 1024 * 1024) return toast.error('Imagem muito grande. Máximo 5 MB.');
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const r = await api.post('/auth/upload-avatar', body);
      onChange(r.data.avatar_url);
      toast.success('Foto atualizada!');
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Não foi possível enviar a foto.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pf-avatar">
      <span className={`pf-avatar-img ${frame ? `av-frame ${frame}` : ''}`}>{url ? <img src={url} alt="" /> : initials(name)}</span>
      <button type="button" className="pf-avatar-btn" onClick={() => input.current?.click()} disabled={busy} aria-label="Trocar foto de perfil" title="Trocar foto">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={pick} />
    </div>
  );
}

function StudentStats({ stats }) {
  return (
    <div className="pf-stats">
      <span>
        <Flame size={16} /> <b>{stats.sequencia}</b> dias seguidos
      </span>
      <span>
        <BookOpen size={16} /> <b>{stats.paginas_total}</b> páginas
      </span>
      <span>
        <Award size={16} /> <b>{stats.certificados}</b> certificados
      </span>
      <span>
        <Medal size={16} /> <b>{stats.medalhas.filter(m => m.conquistada).length}</b> medalhas
      </span>
    </div>
  );
}

function ProfileMedals({ stats }) {
  useEffect(() => {
    // O link "Ver todas" da página inicial leva direto às medalhas.
    if (window.location.hash === '#conquistas') document.getElementById('conquistas')?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  return (
    <section className="pf-medals" id="conquistas" aria-label="Minhas conquistas">
      <header>
        <h2>Minhas conquistas</h2>
        <span>
          {stats.medalhas.filter(m => m.conquistada).length} de {stats.medalhas.length} medalhas · melhor sequência de {stats.melhor_sequencia} dias
        </span>
      </header>
      <MedalGrid medals={stats.medalhas} />
    </section>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats] = useReadingStats();

  useEffect(() => {
    api
      .get('/auth/me')
      .then(r => {
        setUser(r.data);
        setNome(r.data.nome);
      })
      .catch(() => toast.error('Não foi possível carregar o perfil.'));
  }, []);

  const saveProfile = async (patch, message) => {
    const r = await api.put('/auth/profile', { nome: user.nome, avatar_url: user.avatar_url || '', ...patch });
    remember(r.data);
    setUser(r.data);
    if (message) toast.success(message);
  };

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile({ nome: nome.trim() }, 'Perfil atualizado!');
    } catch {
      toast.error('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = url => {
    setUser(u => ({ ...u, avatar_url: url }));
    remember({ avatar_url: url });
  };

  const removeAvatar = async () => {
    try {
      await saveProfile({ avatar_url: '' }, 'Foto removida.');
    } catch {
      toast.error('Não foi possível remover a foto.');
    }
  };

  const student = user?.role === 'student';

  return (
    <DashboardLayout>
      <div className="pf" data-testid="profile-page">
        <PageIntro section="MINHA CONTA / IDENTIDADE" title="Meu perfil" description="Seu espaço, do seu jeito. Mantenha seus dados atualizados." />

        {!user ? (
          <PageSkeleton cards={1} rows={3} label="Carregando perfil…" />
        ) : (
          <>
            <section className="pf-hero">
              <div className="pf-cover" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="pf-hero-body">
                <Avatar url={user.avatar_url} name={user.nome} frame={user.moldura} onChange={changeAvatar} />
                <div className="pf-id">
                  <h2>{user.nome}</h2>
                  {user.titulo_nome && <span className="pf-title">✦ {user.titulo_nome}</span>}
                  <p>
                    <span className="ws-chip">{ROLES[user.role] || 'Usuário'}</span>
                    {user.turma && (
                      <span>
                        <GraduationCap size={14} /> {user.turma}
                      </span>
                    )}
                    {!student && user.turmas?.length > 0 && (
                      <span>
                        <GraduationCap size={14} /> {user.turmas.length} turma(s)
                      </span>
                    )}
                    <span>
                      <Mail size={14} /> {user.email}
                    </span>
                  </p>
                </div>
              </div>
              {student && stats && <StudentStats stats={stats} />}
            </section>

            <div className="pf-grid">
              <form className="ws-card pf-card" onSubmit={submit}>
                <h3>Dados da conta</h3>
                <label className="qz-field">
                  <span>Nome completo</span>
                  <input id="nome" required maxLength={120} value={nome} onChange={e => setNome(e.target.value)} data-testid="input-nome" />
                </label>
                <label className="qz-field">
                  <span>E-mail</span>
                  <input id="email" type="email" value={user.email || ''} disabled />
                  <small className="af-hint">O e-mail é usado para entrar e não pode ser alterado.</small>
                </label>
                {user.turma && (
                  <label className="qz-field">
                    <span>Turma</span>
                    <input id="turma" value={user.turma} disabled />
                    <small className="af-hint">Para trocar de turma, fale com a coordenação.</small>
                  </label>
                )}
                {!student && user.turmas?.length > 0 && (
                  <div className="qz-field">
                    <span>Turmas que você acompanha</span>
                    <div className="pf-classes">
                      {user.turmas.map(t => (
                        <span key={t} className="ws-chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pf-actions">
                  {user.avatar_url && (
                    <button type="button" className="pf-link" onClick={removeAvatar}>
                      <Trash2 size={14} /> Remover foto
                    </button>
                  )}
                  <span className="flex-1" />
                  <Button type="submit" className="qz-btn-primary" disabled={saving || !nome.trim() || nome.trim() === user.nome} data-testid="save-profile-button">
                    {saving ? (
                      'Salvando…'
                    ) : (
                      <>
                        <Save size={16} /> Salvar alterações
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div className="pf-side">
                <InstallApp variant="row" />
                <PushSettings />
                <PrivacyCard />
              </div>
            </div>

            {student && stats && <RewardsPicker user={user} medals={stats.medalhas} onChange={patch => setUser(u => ({ ...u, ...patch }))} />}
            {student && stats && <ProfileMedals stats={stats} />}
            {student && <CertificateShelf />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
