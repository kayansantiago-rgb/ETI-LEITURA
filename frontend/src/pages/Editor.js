import useDraft, {readDraft,clearDraft} from '@/hooks/useDraft';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';

const Editor = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [summary, setSummary] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const draftStatus=useDraft(`summary:${bookId}`,content,!loading);
  useEffect(() => {
    loadData();
  }, [bookId]);

  const loadData = async () => {
    try {
      const bookRes = await api.get(`/books/${bookId}`);
      setBook(bookRes.data);

      try {
        const summaryRes = await api.get(`/books/${bookId}/summary`);
        setSummary(summaryRes.data);
        setContent(summaryRes.data.conteudo);
      } catch (error) {
        // No summary yet
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
      navigate('/library');
    } finally {
      setContent(value=>readDraft(`summary:${bookId}`,value));
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('O resumo não pode estar vazio');
      return;
    }

    setSaving(true);
    try {
      if (summary) {
        await api.put(`/summaries/${summary.id}`, { conteudo: content });
        toast.success('Resumo atualizado com sucesso!');
      } else {
        const response = await api.post('/summaries', {
          book_id: bookId,
          conteudo: content
        });
        setSummary(response.data);
        toast.success('Resumo criado com sucesso!');
      }
      clearDraft(`summary:${bookId}`);
    } catch (error) {
      toast.error('Erro ao salvar resumo');
    } finally {
      setSaving(false);
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
      <div className="space-y-6" data-testid="editor-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(`/book/${bookId}`)}
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg"
            data-testid="save-summary-button"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar resumo
              </>
            )}
          </Button>
        </div>

<div><p className="eyebrow">OFICINA DE ESCRITA</p><h1>Suas ideias, suas palavras.</h1><p className="text-muted-foreground mt-2">Registre o que marcou sua leitura. Envie ao professor ao terminar.</p></div>
        {/* Split View */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Book Info - Left/Top */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-1 bg-white border border-stone-100 rounded-xl shadow-sm p-6 space-y-4"
          >
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Livro
            </h2>
            <div className="flex lg:flex-col gap-4">
              <div className="w-24 aspect-[2/3] rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={book.capa_url}
                  alt={book.titulo}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">{book.titulo}</h3>
                <p className="text-sm text-muted-foreground mb-3">{book.autor}</p>
                {book.arquivo_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/reader/${bookId}`)}
                    data-testid="open-book-button"
                  >
                    Abrir livro
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{book.descricao}</p>
          </motion.div>

          {/* Editor - Right/Bottom */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-3 bg-white border border-stone-100 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
              Seu resumo
            </h2>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva seu resumo aqui... Compartilhe suas reflexões, aprendizados e impressões sobre o livro."
              className="min-h-[500px] resize-y text-base leading-8 border-0 shadow-none bg-slate-50/50 p-5"
              aria-label="Seu resumo"
              data-testid="summary-textarea"
            />
            <p className="text-xs text-muted-foreground mt-4">
              {draftStatus}<br/>{content.trim() ? content.trim().split(/\s+/).length : 0} palavras · {content.length} caracteres
            </p>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Editor;