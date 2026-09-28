import SummaryCorrection from '@/components/SummaryCorrection';
import StatusBadge from '@/components/StatusBadge';
import RubricPicker from '@/components/RubricPicker';
import AIReview from '@/components/AIReview';
import {getUser} from '@/lib/auth';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, User, BookOpen, Star, MessageSquare, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';

const displayDate = (value, pattern) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? format(date, pattern, { locale: ptBR }) : 'Data não informada';
};
const AdminSummaryCard = ({ summary, onUpdate, onDelete }) => {
  const [isCorrectDialogOpen, setIsCorrectDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [nota, setNota] = useState(summary.nota?.toString() || '');
  const [feedback, setFeedback] = useState(summary.feedback || '');

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
      const response = await api.put(`/admin/summaries/${summary.id}/correction`, {
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
    if (!window.confirm(`Tem certeza que deseja excluir o resumo de "${summary.user_nome}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/admin/summaries/${summary.id}`);
      toast.success('Resumo excluído com sucesso!');
      if (onDelete) {
        onDelete(summary.id);
      }
    } catch (error) {
      toast.error('Erro ao excluir resumo');
    } finally {
      setDeleting(false);
    }
  };

  const isCorrected = summary.nota !== null && summary.nota !== undefined;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`bg-white border rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 p-6 ${isCorrected ? 'border-green-200' : 'border-stone-100'}`}
      data-testid={`admin-summary-card-${summary.id}`}
    >
      <div className="space-y-3">
        {/* Book Title */}
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" strokeWidth={1.5} />
          <h3 className="font-semibold text-foreground">{summary.book_titulo}</h3>
        </div>

        {/* Student Info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{summary.user_nome}</span>
          {summary.user_turma && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {summary.user_turma}
              </span>
            </>
          )}
        </div>

        {/* Summary Preview */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {summary.conteudo}
        </p>

        <div className="mb-3"><StatusBadge state={isCorrected?'graded':'review'} label={isCorrected?'Corrigida':undefined}/></div>{/* Correction Badge */}
        {isCorrected && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              Nota: {Number(summary.nota).toFixed(1)}
            </span>
            <span className="text-xs text-green-600">
              (por {summary.corrigido_por})
            </span>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {displayDate(summary.updated_at, "dd 'de' MMMM, yyyy")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Correct Button */}
            <Dialog open={isCorrectDialogOpen} onOpenChange={value => { if (!loading) setIsCorrectDialogOpen(value); }}>
              <DialogTrigger asChild>
                <Button
                  variant={isCorrected ? "outline" : "default"}
                  size="sm"
                  data-testid={`correct-summary-${summary.id}`}
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
              <DialogContent className="summary-correction-dialog" aria-describedby={undefined}>
                <SummaryCorrection summary={summary} nota={nota} feedback={feedback} setNota={setNota} setFeedback={setFeedback} loading={loading} onSubmit={handleCorrection} onCancel={()=>setIsCorrectDialogOpen(false)}/>
              </DialogContent>
            </Dialog>

            {/* View Full Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" data-testid={`view-summary-${summary.id}`}>
                  Ver completo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{summary.book_titulo}</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <User className="h-4 w-4" />
                    <span>{summary.user_nome}</span>
                    {summary.user_turma && (
                      <>
                        <span>•</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                          {summary.user_turma}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <Calendar className="h-4 w-4" />
                    <span>
                      {displayDate(summary.updated_at, "dd 'de' MMMM, yyyy")}
                    </span>
                  </div>
                </DialogHeader>

                <div className="mt-4">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {summary.conteudo}
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
                          {Number(summary.nota).toFixed(1)}
                        </span>
                      </div>
                      <div className="text-sm text-green-700">
                        Corrigido por {summary.corrigido_por} em{' '}
                        {displayDate(summary.corrigido_em, "dd/MM/yyyy")}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-green-200">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600 mt-0.5" />
                        <p className="text-sm text-green-800 whitespace-pre-wrap">
                          {summary.feedback}
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
              data-testid={`delete-summary-${summary.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminSummaryCard;
