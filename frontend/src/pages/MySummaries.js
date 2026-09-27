import PageIntro from '@/components/PageIntro';
import EmptyCollection from '@/components/EmptyCollection';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import api from '@/lib/api';
import { toast } from 'sonner';

const MySummaries = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummaries();
  }, []);

  const loadSummaries = async () => {
    try {
      const response = await api.get('/summaries');
      setSummaries(response.data);
    } catch (error) {
      toast.error('Erro ao carregar resumos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (summaryId) => {
    try {
      await api.delete(`/summaries/${summaryId}`);
      setSummaries(summaries.filter(s => s.id !== summaryId));
      toast.success('Resumo excluído com sucesso');
    } catch (error) {
      toast.error('Erro ao excluir resumo');
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
      <div data-testid="summaries-page">
        <PageIntro section="MINHA ESCRITA / RESUMOS" title="Meus Resumos" description="Guarde as ideias que ficaram depois da última página."/>

        {summaries.length === 0 ? (
          <EmptyCollection title="Cada leitura deixa uma história" description={<>Comece a escrever seus resumos para acompanhar sua jornada literária</>} action="Explorar biblioteca" to="/library"/>
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
                <SummaryCard summary={summary} onDelete={handleDelete} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MySummaries;