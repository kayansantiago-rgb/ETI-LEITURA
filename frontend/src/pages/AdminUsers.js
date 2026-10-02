import { confirmAction } from '@/components/ConfirmHost';
import { PageSkeleton } from '@/components/Skeleton';
import PageIntro from '@/components/PageIntro';
import EmptyCollection from '@/components/EmptyCollection';
import {getUser} from '@/lib/auth';
import {RecoveryButton} from '@/pages/SchoolPages';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Trash2, FileText, PenTool, BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TURMAS } from '@/constants/turmas';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurma, setSelectedTurma] = useState('TODAS');

  useEffect(() => {
    loadData();
  }, [selectedTurma]);

  const loadData = async () => {
    try {
      const url = selectedTurma && selectedTurma !== 'TODAS' 
        ? `/admin/users?turma=${encodeURIComponent(selectedTurma)}` 
        : '/admin/users';
      
      const response = await api.get(url);
      setUsers(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Acesso negado. Apenas administradores.');
      } else {
        toast.error('Erro ao carregar usuários');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if ((await confirmAction({ title: 'Excluir aluno?', message: `Tem certeza que deseja excluir o usuário "${userName}"? Todos os resumos, produções textuais e progresso serão removidos permanentemente.`, confirmLabel: 'Excluir' }))) {
      try {
        await api.delete(`/admin/users/${userId}`);
        setUsers(users.filter(u => u.id !== userId));
        toast.success('Usuário excluído com sucesso!');
      } catch (error) {
        const message = error.response?.data?.detail || 'Erro ao excluir usuário';
        toast.error(message);
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton cards={0} rows={6} label="Carregando alunos…" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="admin-users-page">
        {/* Header */}
        <PageIntro section="COMUNIDADE / TURMAS" title="Alunos e turmas" description="Conheça seus alunos e acompanhe o que estão produzindo."/>

        {/* Stats */}
        <div className="collection-metrics">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-stone-100 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent rounded-lg">
                <Users className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Alunos</p>
                <p className="text-3xl font-bold text-foreground">{users.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-stone-100 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent rounded-lg">
                <FileText className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Resumos</p>
                <p className="text-3xl font-bold text-foreground">
                  {users.reduce((acc, u) => acc + u.total_summaries, 0)}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-stone-100 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent rounded-lg">
                <PenTool className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Produções</p>
                <p className="text-3xl font-bold text-foreground">
                  {users.reduce((acc, u) => acc + u.total_productions, 0)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filter by Turma */}
        <div className="collection-filter">
          <Label>Filtrar por Turma</Label>
          <Select value={selectedTurma} onValueChange={setSelectedTurma}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as turmas</SelectItem>
              {TURMAS.filter(t=>getUser()?.role==='admin'||getUser()?.turmas?.includes(t.value)).map((turma) => (
                <SelectItem key={turma.value} value={turma.value}>
                  {turma.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        {users.length === 0 ? (
          <EmptyCollection icon={Users} title="Uma turma, muitas histórias." description={<>{selectedTurma !== 'TODAS' 
                ? `Nenhum aluno encontrado na turma ${selectedTurma}` 
                : 'Nenhum aluno cadastrado ainda'}</>}/>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="collection-grid"
          >
            {users.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-stone-100 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground mb-1">
                      {user.nome}
                    </h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-lg">
                        {user.turma}
                      </span>
                    </div>
                  </div>
                  {getUser()?.role==='admin'&&<Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteUser(user.id, user.nome)}
                    data-testid={`delete-user-${user.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>}
                </div>

                {getUser()?.role==='admin'&&<div className="mb-4"><RecoveryButton userId={user.id}/></div>}
                {/* Statistics */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Resumos</span>
                    </div>
                    <span className="font-medium">{user.total_summaries}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <PenTool className="h-4 w-4" />
                      <span>Produções</span>
                    </div>
                    <span className="font-medium">{user.total_productions}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Cadastro</span>
                    <span>{format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
