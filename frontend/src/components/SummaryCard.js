import { confirmAction } from '@/components/ConfirmHost';
import StatusBadge from '@/components/StatusBadge';
import { motion } from 'framer-motion';
import { FileText, Calendar, Trash2, Star, CheckCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SummaryCard = ({ summary, onDelete }) => {
  const navigate = useNavigate();
  const isCorrected = summary.nota !== null && summary.nota !== undefined;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if ((await confirmAction({ title: 'Excluir resumo?', message: 'Tem certeza que deseja excluir este resumo?', confirmLabel: 'Excluir' }))) {
      onDelete(summary.id);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`bg-white border rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 p-6 ${isCorrected ? 'border-green-200' : 'border-stone-100'}`}
      data-testid={`summary-card-${summary.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" strokeWidth={1.5} />
          <h3 className="font-semibold text-foreground">{summary.book_titulo}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          data-testid={`delete-summary-${summary.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
        {summary.conteudo}
      </p>

      <div className="mb-3"><StatusBadge state={isCorrected?'graded':'review'} label={isCorrected?'Corrigida':undefined}/></div>{/* Correction Badge */}
      {isCorrected && (
        <Dialog>
          <DialogTrigger asChild>
            <div 
              className="flex items-center gap-2 p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors mb-3"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Nota: {summary.nota.toFixed(1)}
              </span>
              <span className="text-xs text-green-600 ml-auto">
                Ver feedback
              </span>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
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
                  <p className="text-3xl font-bold text-green-800">{summary.nota.toFixed(1)}</p>
                </div>
              </div>
              
              {/* Feedback */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">Feedback</span>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{summary.feedback}</p>
                </div>
              </div>
              
              {/* Corrected by */}
              <p className="text-xs text-muted-foreground text-center">
                Corrigido por {summary.corrigido_por} em{' '}
                {format(new Date(summary.corrigido_em), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(summary.updated_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/editor/${summary.book_id}`);
          }}
          className="text-xs"
        >
          Editar
        </Button>
      </div>
    </motion.div>
  );
};

export default SummaryCard;
