import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, BookOpen, Trophy, Lock, Download, Award, ListChecks, Check, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import BookQuizEditor from '@/components/BookQuizEditor';
import { Button } from '@/components/ui/button';
import { ScoreRing } from '@/pages/Quizzes';
import { downloadCertificate } from '@/pages/BookQuiz';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

const LEVEL = { AMBOS: 'Para todos os leitores', FUNDAMENTAL: 'Ensino fundamental', 'MÉDIO': 'Ensino médio' };

function QuizCard({ book, quiz }) {
  const [busy, setBusy] = useState(false);
  if (!quiz?.disponivel) return null;
  if (quiz.aprovado)
    return (
      <section className="bd-challenge is-done">
        <span className="bd-challenge-icon">
          <Trophy size={22} />
        </span>
        <div>
          <h3>Certificado conquistado</h3>
          <p>
            Você acertou {quiz.certificado?.percentual}% do questionário final. Código {quiz.certificado?.codigo}.
          </p>
        </div>
        <Button
          className="qz-btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await downloadCertificate(book.id, book.titulo);
            } catch {
              toast.error('Não foi possível gerar o certificado agora.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download size={16} /> {busy ? 'Gerando…' : 'Baixar certificado'}
        </Button>
      </section>
    );
  return (
    <section className={`bd-challenge ${quiz.liberado ? 'is-open' : ''}`}>
      <span className="bd-challenge-icon">{quiz.liberado ? <Award size={22} /> : <Lock size={20} />}</span>
      <div>
        <h3>{quiz.liberado ? 'Questionário liberado!' : 'Desafio do livro'}</h3>
        <p>
          {quiz.liberado
            ? `Responda ${quiz.total} perguntas e acerte ${quiz.minimo}% para ganhar seu certificado de leitura.`
            : `Ao terminar a leitura, um questionário de ${quiz.total} perguntas libera um certificado em PDF.`}
        </p>
      </div>
      {quiz.liberado && (
        <Button asChild className="qz-btn-primary">
          <Link to={`/book/${book.id}/quiz`}>
            <Trophy size={16} /> {quiz.tentativas ? 'Tentar novamente' : 'Fazer questionário'}
          </Link>
        </Button>
      )}
    </section>
  );
}

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const staff = ['admin', 'teacher'].includes(getUser()?.role);
  const [book, setBook] = useState(null);
  const [hasSummary, setHasSummary] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [editing, setEditing] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const loadBook = async () => {
    try {
      const [bookRes, summaryRes, progressRes, quizRes] = await Promise.all([
        api.get(`/books/${id}`),
        api.get(`/books/${id}/summary`).catch(() => null),
        api.get(`/books/${id}/progress`).catch(() => ({ data: { percentage: 0 } })),
        api.get(`/books/${id}/quiz`).catch(() => ({ data: null }))
      ]);
      setBook(bookRes.data);
      setHasSummary(!!summaryRes?.data);
      setProgress(progressRes.data.percentage || 0);
      setQuiz(quizRes.data);
    } catch {
      toast.error('Erro ao carregar livro');
      navigate('/library');
    }
  };

  useEffect(() => {
    loadBook();
  }, [id]);

  if (!book)
    return (
      <DashboardLayout>
        <div className="ws-empty" role="status">
          <span className="cx-spinner mx-auto mb-3" /> Abrindo o livro…
        </div>
      </DashboardLayout>
    );

  const cover = book.capa_url && !coverFailed;
  const status = progress >= 100 ? 'Leitura concluída' : progress > 0 ? 'Lendo agora' : 'Ainda não iniciado';

  return (
    <DashboardLayout>
      <div data-testid="book-details-page" className="bd">
        <button type="button" className="ws-back" onClick={() => navigate('/library')} data-testid="back-to-library-button">
          <ArrowLeft size={15} /> Biblioteca
        </button>

        <section className="bd-hero">
          {cover && <div className="bd-hero-bg" style={{ backgroundImage: `url("${book.capa_url}")` }} aria-hidden="true" />}
          <div className="bd-cover">
            {cover ? (
              <img src={book.capa_url} alt={`Capa de ${book.titulo}`} onError={() => setCoverFailed(true)} />
            ) : (
              <div className="bd-cover-fallback">
                <BookOpen size={40} />
                <span>{book.titulo}</span>
              </div>
            )}
          </div>
          <div className="bd-info">
            <span className="bd-level">{LEVEL[book.nivel_ensino] || book.nivel_ensino || 'Acervo digital'}</span>
            <h1>{book.titulo}</h1>
            <p className="bd-author">por {book.autor || 'Autor não informado'}</p>

            {!staff && (
              <div className="bd-progress">
                <ScoreRing value={progress} total={100} size={84} main={`${progress}%`} sub="lido" />
                <div>
                  <strong>
                    {progress >= 100 && <Check size={15} />} {status}
                  </strong>
                  <p>O progresso é atualizado automaticamente enquanto você lê no leitor da plataforma.</p>
                </div>
              </div>
            )}

            <div className="bd-actions">
              {book.arquivo_url && (
                <Button className="qz-btn-primary qz-btn-lg" onClick={() => navigate(`/reader/${id}`)} data-testid="read-book-button">
                  <BookOpen size={18} /> {progress > 0 && progress < 100 ? 'Continuar leitura' : progress >= 100 ? 'Ler novamente' : 'Começar a ler'}
                </Button>
              )}
              {!staff && (
                <Button variant="outline" className="qz-btn-lg" onClick={() => navigate(`/editor/${book.id}`)} data-testid="write-summary-button">
                  <FileText size={18} /> {hasSummary ? 'Ver meu resumo' : 'Escrever resumo'}
                </Button>
              )}
              {staff && (
                <Button variant="outline" className="qz-btn-lg" onClick={() => setEditing(true)}>
                  <ListChecks size={18} /> {quiz?.perguntas?.length ? `Questionário (${quiz.perguntas.length})` : 'Criar questionário'}
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="bd-grid">
          <section className="ws-card bd-about">
            <h2>Sobre o livro</h2>
            <p>{book.descricao || 'Este livro ainda não tem sinopse cadastrada.'}</p>
          </section>
          {!staff && quiz?.disponivel && <QuizCard book={book} quiz={quiz} />}
          {staff && (
            <section className={`bd-challenge ${quiz?.perguntas?.length ? 'is-open' : ''}`}>
              <span className="bd-challenge-icon">
                <Sparkles size={20} />
              </span>
              <div>
                <h3>{quiz?.perguntas?.length ? 'Questionário cadastrado' : 'Sem questionário'}</h3>
                <p>
                  {quiz?.perguntas?.length
                    ? `${quiz.perguntas.length} perguntas. Alunos que terminarem o livro e acertarem ${quiz.minimo}% recebem certificado.`
                    : 'Cadastre perguntas para que os alunos ganhem um certificado ao terminar este livro.'}
                </p>
              </div>
              <Button className="qz-btn-primary" onClick={() => setEditing(true)}>
                <ListChecks size={16} /> {quiz?.perguntas?.length ? 'Editar' : 'Criar'}
              </Button>
            </section>
          )}
        </div>
      </div>
      {editing && (
        <BookQuizEditor
          book={book}
          onClose={changed => {
            setEditing(false);
            if (changed) loadBook();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default BookDetails;
