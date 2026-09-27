import StatusBadge from '@/components/StatusBadge';
import PageIntro from '@/components/PageIntro';
import EmptyCollection from '@/components/EmptyCollection';
import useDraft, {readDraft,clearDraft} from '@/hooks/useDraft';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, FileText, Star, CheckCircle, MessageSquare, Calendar } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProductionCard = ({ production, onEdit, onDelete }) => {
  const isCorrected = production.nota !== null && production.nota !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-xl shadow-sm p-6 hover:shadow-md transition-all ${isCorrected ? 'border-green-200' : 'border-stone-100'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg line-clamp-2">{production.titulo}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(production)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(production.id)} className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground line-clamp-4 mb-4">{production.conteudo}</p>

      <div className="mb-3"><StatusBadge state={isCorrected?'graded':'review'} label={isCorrected?'Corrigida':undefined}/></div>{/* Correction Badge */}
      {isCorrected && (
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors mb-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Nota: {production.nota.toFixed(1)}
              </span>
              <span className="text-xs text-green-600 ml-auto">
                Ver feedback
              </span>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Correção do Professor
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Grade */}
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <Star className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-green-700">Sua nota</p>
                  <p className="text-3xl font-bold text-green-800">{production.nota.toFixed(1)}</p>
                </div>
              </div>
              
              {/* Feedback */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">Feedback</span>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{production.feedback}</p>
                </div>
              </div>
              
              {/* Corrected by */}
              <p className="text-xs text-muted-foreground text-center">
                Corrigido por {production.corrigido_por} em{' '}
                {format(new Date(production.corrigido_em), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>{format(new Date(production.updated_at), "dd/MM/yyyy", { locale: ptBR })}</span>
      </div>
    </motion.div>
  );
};

const TextProductions = () => {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ titulo: '', conteudo: '' });

  const draftStatus=useDraft(`production:${editingId||'new'}`,formData,dialogOpen);
  useEffect(() => {
    loadProductions();
  }, []);

  const loadProductions = async () => {
    try {
      const response = await api.get('/text-productions');
      setProductions(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produções');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/text-productions/${editingId}`, formData);
        toast.success('Produção atualizada!');
      } else {
        await api.post('/text-productions', formData);
        toast.success('Produção criada!');
      }
      clearDraft(`production:${editingId||'new'}`);
      setDialogOpen(false);
      setFormData({ titulo: '', conteudo: '' });
      setEditingId(null);
      loadProductions();
    } catch (error) {
      toast.error('Erro ao salvar produção');
    }
  };

  const handleEdit = (production) => {
    setFormData(readDraft(`production:${production.id}`,{ titulo: production.titulo, conteudo: production.conteudo }));
    setEditingId(production.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja excluir esta produção?')) {
      try {
        await api.delete(`/text-productions/${id}`);
        toast.success('Produção excluída!');
        loadProductions();
      } catch (error) {
        toast.error('Erro ao excluir');
      }
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
      <div data-testid="text-productions-page">
        <div className="inner-toolbar-heading">
          <PageIntro section="MINHA ESCRITA / CRIAÇÃO" title="Produção Textual" description="Dê espaço às suas ideias. Escreva, revise e compartilhe."/>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg" data-testid="new-production-button" onClick={() => { setFormData(readDraft('production:new',{ titulo: '', conteudo: '' })); setEditingId(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Produção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar' : 'Nova'} Produção Textual</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Título da produção"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="conteudo">Texto</Label>
                  <Textarea
                    id="conteudo"
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    placeholder="Escreva sua produção textual aqui..."
                    rows={15}
                    required
                  />
                </div>
                <p role="status" className="text-xs text-muted-foreground">{draftStatus}</p><div className="flex gap-2">
                  <Button type="submit" className="rounded-lg">
                    {editingId ? 'Atualizar' : 'Criar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg">
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {productions.length === 0 ? (
          <EmptyCollection title="Sua próxima ideia começa aqui" description={<>Você ainda não criou nenhuma produção textual</>}/>
        ) : (
          <div className="collection-grid">
            {productions.map((prod, index) => (
              <ProductionCard 
                key={prod.id}
                production={prod}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TextProductions;
