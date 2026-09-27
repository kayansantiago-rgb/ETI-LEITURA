import StatusBadge from '@/components/StatusBadge';
import RubricPicker from '@/components/RubricPicker';
import AIReview from '@/components/AIReview';
import PageIntro from '@/components/PageIntro';
import EmptyCollection from '@/components/EmptyCollection';
import {getUser} from '@/lib/auth';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, PenTool, Star, MessageSquare, CheckCircle, Edit3, Calendar, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TURMAS } from '@/constants/turmas';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProductionCard = ({ production, onUpdate, onDelete }) => {
  const [isCorrectDialogOpen, setIsCorrectDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [nota, setNota] = useState(production.nota?.toString() || '');
  const [feedback, setFeedback] = useState(production.feedback || '');

  const handleCorrection = async (e) => {
    e.preventDefault();
    
    const notaNum = parseFloat(nota);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
      toast.error('A nota deve ser um número entre 0 e 10');
      return;
    }
    
    if (!feedback.trim()) {
      toast.error('O feedback é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/admin/text-productions/${production.id}/correction`, {
        nota: notaNum,
        feedback: feedback.trim()
      });
      
      toast.success('Correção salva com sucesso!');
      setIsCorrectDialogOpen(false);
      
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (error) {
      toast.error('Erro ao salvar correção');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir a produção "${production.titulo}" de "${production.user_nome}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/admin/text-productions/${production.id}`);
      toast.success('Produção excluída com sucesso!');
      if (onDelete) {
        onDelete(production.id);
      }
    } catch (error) {
      toast.error('Erro ao excluir produção');
    } finally {
      setDeleting(false);
    }
  };

  const isCorrected = production.nota !== null && production.nota !== undefined;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`bg-white border rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 p-6 ${isCorrected ? 'border-green-200' : 'border-stone-100'}`}
      data-testid={`admin-production-card-${production.id}`}
    >
      <div className="space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg text-foreground line-clamp-2">
          {production.titulo}
        </h3>
        
        {/* Student Info */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{production.user_nome}</span>
          {production.user_turma && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-lg">
                {production.user_turma}
              </span>
            </>
          )}
        </div>
        
        {/* Content Preview */}
        <p className="text-sm text-muted-foreground line-clamp-4">
          {production.conteudo}
        </p>

        <div className="mb-3"><StatusBadge state={isCorrected?'graded':'review'} label={isCorrected?'Corrigida':undefined}/></div>{/* Correction Badge */}
        {isCorrected && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              Nota: {production.nota.toFixed(1)}
            </span>
            <span className="text-xs text-green-600">
              (por {production.corrigido_por})
            </span>
          </div>
        )}
        
        {/* Date and Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>
              {format(new Date(production.updated_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Correct Button */}
            <Dialog open={isCorrectDialogOpen} onOpenChange={setIsCorrectDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant={isCorrected ? "outline" : "default"} 
                  size="sm"
                  data-testid={`correct-production-${production.id}`}
                >
                  {isCorrected ? (
                    <>
                      <Edit3 className="h-3 w-3 mr-1" />
                      Editar
                    </>
                  ) : (
                    <>
                      <Star className="h-3 w-3 mr-1" />
                      Corrigir
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Corrigir Produção Textual</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {production.titulo} - {production.user_nome}
                  </p>
                </DialogHeader>
                
                {/* Production Content */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{production.conteudo}</p>
                </div>
                
                {/* Correction Form */}
                <RubricPicker onApply={r=>{setNota(String(r.nota));setFeedback(r.feedback);}}/><AIReview kind="production" id={production.id} onApply={r=>{setNota(String(r.nota));setFeedback(r.feedback);}}/><form onSubmit={handleCorrection} className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="nota">Nota (0 a 10)</Label>
                    <Input
                      id="nota"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      placeholder="Ex: 8.5"
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      className="mt-1"
                      required
                      data-testid="input-nota-production"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="feedback">Feedback para o aluno</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Escreva aqui suas observações, sugestões e comentários sobre a produção textual do aluno..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="mt-1 min-h-[120px]"
                      required
                      data-testid="input-feedback-production"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCorrectDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} data-testid="submit-correction-production">
                      {loading ? 'Salvando...' : 'Salvar Correção'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* View Full Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" data-testid={`view-production-${production.id}`}>
                  Ver completo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{production.titulo}</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <Users className="h-4 w-4" />
                    <span>{production.user_nome}</span>
                    {production.user_turma && (
                      <>
                        <span>•</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                          {production.user_turma}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(production.updated_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </DialogHeader>
                <div className="mt-4">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {production.conteudo}
                  </p>
                </div>

                {/* Show Correction if exists */}
                {isCorrected && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">Correção</h4>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-lg font-bold text-green-800">
                          {production.nota.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-sm text-green-700">
                        Corrigido por {production.corrigido_por} em{' '}
                        {format(new Date(production.corrigido_em), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-green-200">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600 mt-0.5" />
                        <p className="text-sm text-green-800 whitespace-pre-wrap">
                          {production.feedback}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Delete Button */}
            {getUser()?.role==='admin'&&<Button 
              variant="ghost" 
              size="sm" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={deleting}
              data-testid={`delete-production-${production.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AdminTextProductions = () => {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurma, setSelectedTurma] = useState('TODAS');

  useEffect(() => {
    loadData();
  }, [selectedTurma]);

  const loadData = async () => {
    try {
      const url = selectedTurma && selectedTurma !== 'TODAS' 
        ? `/admin/text-productions?turma=${encodeURIComponent(selectedTurma)}` 
        : '/admin/text-productions';
      
      const response = await api.get(url);
      setProductions(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Acesso negado. Apenas administradores.');
      } else {
        toast.error('Erro ao carregar produções');
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
      <div data-testid="admin-text-productions-page">
        {/* Header */}
        <PageIntro section="APRENDIZAGEM / ESCRITA" title="Produções dos alunos" description="Acompanhe o desenvolvimento da escrita, texto por texto."/>

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

        {/* Productions List */}
        {productions.length === 0 ? (
          <EmptyCollection icon={PenTool} title="Espaço aberto para novas ideias." description={<>{selectedTurma !== 'TODAS' 
                ? `Nenhuma produção textual encontrada para ${selectedTurma}` 
                : 'Nenhuma produção textual foi criada ainda pelos alunos'}</>}/>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="collection-grid"
          >
            {productions.map((production, index) => (
              <motion.div
                key={production.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductionCard 
                  production={production}
                  onUpdate={(updatedProduction) => {
                    setProductions(prev => 
                      prev.map(p => p.id === updatedProduction.id ? updatedProduction : p)
                    );
                  }}
                  onDelete={(deletedId) => {
                    setProductions(prev => prev.filter(p => p.id !== deletedId));
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

export default AdminTextProductions;
