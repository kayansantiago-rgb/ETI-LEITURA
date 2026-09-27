import PageIntro from '@/components/PageIntro';
import EmptyCollection from '@/components/EmptyCollection';
import {getUser} from '@/lib/auth';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import AdminSummaryCard from '@/components/AdminSummaryCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TURMAS } from '@/constants/turmas';
import api from '@/lib/api';
import { toast } from 'sonner';

const AdminSummaries = () => {
  const [summaries, setSummaries] = useState([]);
  const [stats, setStats] = useState({ total_users: 0, total_books: 0, total_summaries: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTurma, setSelectedTurma] = useState('TODAS');

  useEffect(() => {
    loadData();
  }, [selectedTurma]);

  const loadData = async () => {
    try {
      const url = selectedTurma && selectedTurma !== 'TODAS' 
        ? `/admin/summaries?turma=${encodeURIComponent(selectedTurma)}` 
        : '/admin/summaries';
      const [summariesRes, statsRes] = await Promise.all([
        api.get(url),
        api.get('/admin/stats')
      ]);
      
      setSummaries(summariesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Acesso negado. Apenas administradores.');
      } else {
        toast.error('Erro ao carregar dados');
      }
    } finally {
      setLoading(false);
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
      <div data-testid="admin-summaries-page">
        {/* Header */}
        <PageIntro section="APRENDIZAGEM / LEITURA" title="Resumos dos alunos" description="Um espaço para ler, avaliar e devolver novas perspectivas."/>

        {/* Stats Cards */}
        <div className="collection-metrics">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-stone-100 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent rounded-lg">
                <Users className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Alunos</p>
                <p className="text-3xl font-bold text-foreground">{stats.total_users}</p>
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
                <BookOpen className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Livros Disponíveis</p>
                <p className="text-3xl font-bold text-foreground">{stats.total_books}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-stone-100 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent rounded-lg">
                <FileText className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Resumos</p>
                <p className="text-3xl font-bold text-foreground">{stats.total_summaries}</p>
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

        {/* Summaries List */}
        {summaries.length === 0 ? (
          <EmptyCollection icon={FileText} title="As próximas leituras vão aparecer aqui." description={<>{selectedTurma !== 'TODAS' ? `Nenhum resumo encontrado para ${selectedTurma}` : 'Nenhum resumo foi criado ainda pelos alunos'}</>}/>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="collection-grid"
          >
            {summaries.map((summary, index) => (
              <motion.div
                key={summary.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AdminSummaryCard 
                  summary={summary} 
                  onUpdate={(updatedSummary) => {
                    setSummaries(prev => 
                      prev.map(s => s.id === updatedSummary.id ? updatedSummary : s)
                    );
                  }}
                  onDelete={(deletedId) => {
                    setSummaries(prev => prev.filter(s => s.id !== deletedId));
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminSummaries;