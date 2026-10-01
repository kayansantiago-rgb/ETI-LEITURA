import PageIntro from '@/components/PageIntro';
import CertificateShelf from '@/components/CertificateShelf';
import { MedalGrid, useReadingStats } from '@/components/ReadingJourney';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, GraduationCap, Save } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import AvatarUpload from '@/components/AvatarUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { getUser, setAuth } from '@/lib/auth';
import { toast } from 'sonner';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    avatar_url: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setFormData({
        nome: response.data.nome,
        avatar_url: response.data.avatar_url || ''
      });
    } catch (error) {
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await api.put('/auth/profile', {
        nome: formData.nome,
        avatar_url: formData.avatar_url
      });

      // Update local storage
      const currentUser = getUser();
      const token = localStorage.getItem('token');
      setAuth(token, { ...currentUser, ...response.data });
      
      setUser(response.data);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (newAvatarUrl) => {
    setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));
    // Also update user state to show the new avatar immediately
    setUser(prev => prev ? { ...prev, avatar_url: newAvatarUrl } : prev);
    
    // Update local storage
    const currentUser = getUser();
    const token = localStorage.getItem('token');
    if (currentUser && token) {
      setAuth(token, { ...currentUser, avatar_url: newAvatarUrl });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pf" data-testid="profile-page">
        <PageIntro section="MINHA CONTA / IDENTIDADE" title="Meu Perfil" description="Seu espaço, do seu jeito. Mantenha seus dados atualizados."/>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-stone-100 rounded-xl shadow-sm p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex justify-center pb-6 border-b">
              <AvatarUpload
                currentAvatar={formData.avatar_url}
                onAvatarChange={handleAvatarChange}
              />
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="nome">Nome completo</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="pl-10"
                  required
                  data-testid="input-nome"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  className="pl-10 bg-muted"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                O email não pode ser alterado
              </p>
            </div>

            {/* Turma (read-only) */}
            {user?.turma && (
              <div>
                <Label htmlFor="turma">Turma</Label>
                <div className="relative mt-1">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="turma"
                    type="text"
                    value={user.turma}
                    className="pl-10 bg-muted"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  A turma não pode ser alterada
                </p>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full rounded-lg"
                disabled={saving}
                data-testid="save-profile-button"
              >
                {saving ? (
                  'Salvando...'
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
        {getUser()?.role === 'student' && (
          <>
            <ProfileMedals />
            <CertificateShelf />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};


function ProfileMedals() {
  const [stats] = useReadingStats();
  useEffect(() => {
    // O link "Ver todas" da página inicial leva direto às medalhas.
    if (stats && window.location.hash === '#conquistas') document.getElementById('conquistas')?.scrollIntoView({ behavior: 'smooth' });
  }, [stats]);
  if (!stats) return null;
  return (
    <section className="pf-medals" id="conquistas" aria-label="Minhas conquistas">
      <header>
        <h2>Minhas conquistas</h2>
        <span>
          {stats.medalhas.filter(m => m.conquistada).length} de {stats.medalhas.length} medalhas · {stats.paginas_total} páginas lidas · melhor sequência de {stats.melhor_sequencia} dias
        </span>
      </header>
      <MedalGrid medals={stats.medalhas} />
    </section>
  );
}

export default Profile;
