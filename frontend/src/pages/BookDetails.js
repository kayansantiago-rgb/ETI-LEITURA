import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import ProgressBar from '@/components/ProgressBar';
import api from '@/lib/api';
import { toast } from 'sonner';

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [hasSummary, setHasSummary] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBook();
  }, [id]);

  const loadBook = async () => {
    try {
      const [bookRes, summaryRes, progressRes] = await Promise.all([
        api.get(`/books/${id}`),
        api.get(`/books/${id}/summary`).catch(() => null),
        api.get(`/books/${id}/progress`).catch(() => ({ data: { percentage: 0 } }))
      ]);
      
      setBook(bookRes.data);
      setHasSummary(!!summaryRes?.data);
      setProgress(progressRes.data.percentage);
    } catch (error) {
      toast.error('Erro ao carregar livro');
      navigate('/library');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = async (newProgress) => {
    try {
      await api.put(`/books/${id}/progress`, { percentage: newProgress[0] });
      setProgress(newProgress[0]);
      toast.success('Progresso atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar progresso');
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
      <div data-testid="book-details-page">
        <Button
          variant="ghost"
          onClick={() => navigate('/library')}
          className="mb-6"
          data-testid="back-to-library-button"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para biblioteca
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-stone-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="grid md:grid-cols-3 gap-8 p-8">
            {/* Book Cover */}
            <div>
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                <img
                  src={book.capa_url}
                  alt={book.titulo}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Book Info */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {book.titulo}
                </h1>
                <p className="text-lg text-muted-foreground">por {book.autor}</p>
              </div>

              {/* Progress Section */}
              <div className="bg-muted/50 rounded-lg p-4">
                <Label className="text-sm font-medium mb-3 block">Seu Progresso de Leitura</Label>
                <ProgressBar percentage={progress} className="mb-4" />
                <div className="space-y-2">
                  <Slider
                    value={[progress]}
                    onValueChange={(value) => setProgress(value[0])}
                    onValueCommit={handleProgressUpdate}
                    aria-label="Progresso de leitura"
                    max={100}
                    step={5}
                    className="w-full"
                    data-testid="progress-slider"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Arraste para atualizar o progresso
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Sobre o livro
                </h2>
                <p className="text-foreground leading-relaxed">{book.descricao}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {book.arquivo_url && (
                  <Button
                    onClick={() => navigate(`/reader/${id}`)}
                    className="rounded-lg"
                    data-testid="read-book-button"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Ler livro
                  </Button>
                )}
                
                <Button
                  variant={hasSummary ? 'secondary' : 'default'}
                  onClick={() => navigate(`/editor/${book.id}`)}
                  className="rounded-lg"
                  data-testid="write-summary-button"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {hasSummary ? 'Ver meu resumo' : 'Escrever resumo'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default BookDetails;