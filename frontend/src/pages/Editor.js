import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import WritingDesk from '@/components/WritingDesk';
import { PageSkeleton } from '@/components/Skeleton';
import useDraft, { readDraft, clearDraft } from '@/hooks/useDraft';
import api from '@/lib/api';
import { toast } from 'sonner';

const PROMPTS = ['Do que trata o livro:', 'Personagens principais:', 'O que mais me marcou:', 'Trecho favorito:', 'O que eu aprendi:', 'Recomendo para quem…'];

export default function Editor() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [summary, setSummary] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState(false);
  const draftStatus = useDraft(`summary:${bookId}`, content, !loading);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const b = await api.get(`/books/${bookId}`);
        if (!alive) return;
        setBook(b.data);
        const s = await api.get(`/books/${bookId}/summary`).catch(() => null);
        if (alive && s?.data) {
          setSummary(s.data);
          setContent(s.data.conteudo);
        }
      } catch {
        toast.error('Não foi possível abrir o livro.');
        navigate('/library');
      } finally {
        if (alive) {
          setContent(value => readDraft(`summary:${bookId}`, value));
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [bookId, navigate]);

  const save = async () => {
    if (!content.trim()) return toast.error('Escreva seu resumo antes de enviar.');
    setSaving(true);
    try {
      if (summary) {
        await api.put(`/summaries/${summary.id}`, { conteudo: content });
        toast.success('Resumo atualizado e enviado ao professor!');
      } else {
        const r = await api.post('/summaries', { book_id: bookId, conteudo: content });
        setSummary(r.data);
        toast.success('Resumo enviado ao professor!');
      }
      clearDraft(`summary:${bookId}`);
    } catch {
      toast.error('Não foi possível salvar. Seu rascunho continua guardado neste aparelho.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout focusMode={focus}>
      <div data-testid="editor-page">
        {loading ? (
          <PageSkeleton cards={0} rows={5} label="Abrindo a mesa de escrita…" />
        ) : (
          <WritingDesk
            eyebrow="Oficina de escrita · Resumo"
            heading={book.titulo}
            value={content}
            onChange={setContent}
            placeholder="Conte com suas palavras o que aconteceu no livro, o que você sentiu e o que aprendeu…"
            prompts={PROMPTS}
            draftStatus={draftStatus}
            saving={saving}
            onSave={save}
            saveLabel={summary ? 'Atualizar resumo' : 'Enviar resumo'}
            onBack={() => navigate(`/book/${bookId}`)}
            correction={summary}
            focus={focus}
            onFocusChange={setFocus}
            aside={
              <section className="wd-card wd-book">
                <span className="wd-cover">{book.capa_url ? <img src={book.capa_url} alt="" /> : <BookOpen size={22} />}</span>
                <div>
                  <strong>{book.titulo}</strong>
                  <small>{book.autor}</small>
                  {book.arquivo_url && (
                    <button type="button" onClick={() => navigate(`/reader/${bookId}`)} data-testid="open-book-button">
                      <BookOpen size={14} /> Abrir o livro
                    </button>
                  )}
                </div>
              </section>
            }
          />
        )}
      </div>
    </DashboardLayout>
  );
}
