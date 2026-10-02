import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import WritingList from '@/components/WritingList';
import OwlEmpty from '@/components/OwlEmpty';
import { PageSkeleton } from '@/components/Skeleton';
import { confirmAction } from '@/components/ConfirmHost';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function MySummaries() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api
      .get('/summaries')
      .then(r => setItems(r.data))
      .catch(() => {
        setItems([]);
        toast.error('Não foi possível carregar seus resumos.');
      });
  }, []);

  const remove = async item => {
    if (!(await confirmAction({ title: 'Excluir resumo?', message: `O resumo de “${item.book_titulo || 'livro'}” será apagado.`, confirmLabel: 'Excluir' }))) return;
    try {
      await api.delete(`/summaries/${item.id}`);
      setItems(list => list.filter(s => s.id !== item.id));
      toast.success('Resumo excluído.');
    } catch {
      toast.error('Não foi possível excluir.');
    }
  };

  return (
    <DashboardLayout>
      <div data-testid="summaries-page">
        <PageIntro section="MINHA ESCRITA / RESUMOS" title="Meus resumos" description="Guarde as ideias que ficaram depois da última página e veja o que o professor achou.">
          <Button className="qz-btn-primary" onClick={() => navigate('/library')}>
            <BookOpen size={16} /> Escolher um livro
          </Button>
        </PageIntro>
        {!items ? (
          <PageSkeleton cards={4} rows={3} label="Carregando seus resumos…" />
        ) : (
          <WritingList
            items={items}
            kind="resumo"
            onOpen={item => navigate(`/editor/${item.book_id}`)}
            onDelete={remove}
            empty={<OwlEmpty title="Cada leitura deixa uma história" text="Abra um livro da biblioteca e escreva seu primeiro resumo." action="Explorar biblioteca" to="/library" />}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
