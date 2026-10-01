import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, Download, Lock, RotateCcw, Sparkles, Trophy, Target } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ScoreRing, StudentPlay } from '@/pages/Quizzes';
import api from '@/lib/api';
import { toast } from 'sonner';

const message = e => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível concluir. Tente novamente.');

export async function downloadCertificate(bookId, title) {
  const r = await api.get(`/books/${bookId}/certificate`, { responseType: 'blob', timeout: 60000 });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificado-${(title || 'leitura')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Confetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div className="bq-confetti" aria-hidden="true">
      {pieces.map(i => (
        <span key={i} style={{ left: `${(i * 97) % 100}%`, animationDelay: `${(i % 9) * 0.12}s`, '--tone': `${(i * 47) % 360}` }} />
      ))}
    </div>
  );
}

function Certificate({ book, cert, fresh }) {
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await downloadCertificate(book.id, book.titulo);
    } catch {
      toast.error('Não foi possível gerar o certificado agora.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="bq-cert">
      {fresh && <Confetti />}
      <span className="bq-cert-medal">
        <Trophy size={40} />
      </span>
      <p className="ws-eyebrow">{fresh ? 'Aprovado!' : 'Certificado conquistado'}</p>
      <h2>Parabéns pela leitura de “{book.titulo}”!</h2>
      <p>
        Você acertou <b>{cert.percentual}%</b> do questionário e conquistou o certificado de leitura da ETI LEITURA.
      </p>
      <div className="bq-cert-preview" aria-hidden="true">
        <span>CERTIFICADO DE LEITURA</span>
        <strong>{book.titulo}</strong>
        <small>Código {cert.codigo}</small>
      </div>
      <Button className="qz-btn-primary qz-btn-lg" disabled={busy} onClick={save}>
        <Download size={18} /> {busy ? 'Gerando certificado…' : 'Baixar certificado (PDF)'}
      </Button>
      <Link to="/library" className="bq-link">
        Escolher a próxima leitura
      </Link>
    </section>
  );
}

export default function BookQuiz() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [failed, setFailed] = useState(false);
  const [stage, setStage] = useState('intro');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);

  const load = () => {
    setFailed(false);
    Promise.all([api.get(`/books/${id}`), api.get(`/books/${id}/quiz`)])
      .then(([b, q]) => {
        setBook(b.data);
        setQuiz(q.data);
      })
      .catch(() => setFailed(true));
  };

  useEffect(load, [id]);

  const submit = async answers => {
    setBusy(true);
    try {
      const r = await api.post(`/books/${id}/quiz/answers`, { respostas: answers });
      setResult(r.data);
      setStage('result');
      if (r.data.aprovado) setQuiz(q => ({ ...q, aprovado: true, certificado: r.data.certificado }));
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setResult(null);
    setRound(v => v + 1);
    setStage('play');
    load();
  };

  let content;
  if (failed) {
    content = (
      <div className="ws-empty" role="alert">
        <h3>Não foi possível abrir o questionário</h3>
        <button className="underline font-semibold" onClick={load}>
          Tentar novamente
        </button>
      </div>
    );
  } else if (!book || !quiz) {
    content = (
      <div className="ws-empty" role="status">
        <span className="cx-spinner mx-auto mb-3" /> Preparando o questionário…
      </div>
    );
  } else if (quiz.aprovado && stage !== 'result') {
    content = <Certificate book={book} cert={quiz.certificado} />;
  } else if (!quiz.disponivel) {
    content = (
      <div className="bq-state">
        <span className="bq-state-icon">
          <BookOpen size={30} />
        </span>
        <h2>Questionário em preparação</h2>
        <p>O professor ainda não cadastrou as perguntas deste livro. Assim que estiverem prontas, você poderá conquistar seu certificado.</p>
        <Link to={`/book/${id}`} className="bq-link">
          Voltar ao livro
        </Link>
      </div>
    );
  } else if (!quiz.liberado) {
    content = (
      <div className="bq-state">
        <ScoreRing value={quiz.progresso} total={100} size={130} main={`${quiz.progresso}%`} sub="lido" />
        <span className="bq-lock">
          <Lock size={14} /> Questionário bloqueado
        </span>
        <h2>Termine a leitura para liberar</h2>
        <p>
          Você leu <b>{quiz.progresso}%</b> do livro. O questionário final abre quando você chegar à última página do leitor.
        </p>
        <Button asChild className="qz-btn-primary qz-btn-lg">
          <Link to={`/reader/${id}`}>
            <BookOpen size={18} /> Continuar lendo
          </Link>
        </Button>
      </div>
    );
  } else if (stage === 'result' && result) {
    content = result.aprovado ? (
      <Certificate book={book} cert={result.certificado} fresh />
    ) : (
      <div className="bq-state">
        <ScoreRing value={result.acertos} total={result.total} size={150} />
        <h2>Quase lá!</h2>
        <p>
          Você acertou <b>{result.percentual}%</b>. Para ganhar o certificado é preciso acertar pelo menos <b>{result.minimo}%</b>. Releia os trechos que
          ficaram com dúvida e tente outra vez.
        </p>
        <div className="bq-actions">
          <Button className="qz-btn-primary qz-btn-lg" onClick={retry}>
            <RotateCcw size={18} /> Tentar de novo
          </Button>
          <Button asChild variant="outline" className="qz-btn-lg">
            <Link to={`/reader/${id}`}>
              <BookOpen size={18} /> Reler o livro
            </Link>
          </Button>
        </div>
      </div>
    );
  } else if (stage === 'play') {
    content = <StudentPlay key={round} quiz={quiz} busy={busy} onSubmit={submit} />;
  } else {
    content = (
      <div className="bq-intro">
        <span className="bq-state-icon is-gradient">
          <Award size={34} />
        </span>
        <p className="ws-eyebrow">Questionário final</p>
        <h2>Mostre o que você aprendeu com “{book.titulo}”</h2>
        <div className="bq-facts">
          <div>
            <Sparkles size={18} />
            <strong>{quiz.total}</strong>
            <span>perguntas</span>
          </div>
          <div>
            <Target size={18} />
            <strong>{quiz.minimo}%</strong>
            <span>para aprovar</span>
          </div>
          <div>
            <Trophy size={18} />
            <strong>PDF</strong>
            <span>certificado</span>
          </div>
        </div>
        {quiz.tentativas > 0 && (
          <p className="bq-attempts">
            Tentativas anteriores: {quiz.tentativas} · melhor resultado {quiz.melhor}%
          </p>
        )}
        <Button className="qz-btn-primary qz-btn-lg" onClick={() => setStage('play')}>
          Começar questionário
        </Button>
      </div>
    );
  }

  return (
    <DashboardLayout focusMode>
      <div className="qz-arena">
        <header className="qz-arena-bar">
          <Link to={`/book/${id}`} className="bq-back">
            <ArrowLeft size={17} /> Voltar
          </Link>
          <span>{book ? `Questionário · ${book.titulo}` : 'Questionário'}</span>
          {book?.autor && <span className="ws-chip">{book.autor}</span>}
        </header>
        <div className="qz-arena-stage">{content}</div>
      </div>
    </DashboardLayout>
  );
}
