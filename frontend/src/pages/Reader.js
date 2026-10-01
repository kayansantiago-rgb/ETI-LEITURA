import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Feather,
  ArrowLeft,
  FileText,
  Settings2,
  Check,
  CloudOff,
  Trophy,
  PartyPopper,
  Award,
  X
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

function FinishCard({ book, quiz, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="rd-finish" role="dialog" aria-modal="true" aria-label="Leitura concluída">
      <div className="rd-finish-card">
        <button type="button" className="rd-finish-close" onClick={onClose} aria-label="Continuar no livro">
          <X size={18} />
        </button>
        <span className="rd-finish-icon">
          <PartyPopper size={34} />
        </span>
        <p className="ws-eyebrow">Leitura concluída</p>
        <h2>Você terminou “{book.titulo}”!</h2>
        {quiz?.aprovado ? (
          <>
            <p>Você já conquistou o certificado deste livro. Que tal escrever um resumo sobre a leitura?</p>
            <div className="rd-finish-actions">
              <button type="button" className="rd-btn-primary" onClick={() => navigate(`/book/${book.id}/quiz`)}>
                <Award size={18} /> Ver meu certificado
              </button>
              <Link to={`/editor/${book.id}`} className="rd-btn-ghost">
                <FileText size={16} /> Escrever resumo
              </Link>
            </div>
          </>
        ) : quiz?.disponivel ? (
          <>
            <p>
              Agora é hora do questionário final: são <b>{quiz.total} perguntas</b> sobre o livro. Acertando {quiz.minimo}% ou mais, você ganha um{' '}
              <b>certificado de leitura</b> da ETI LEITURA.
            </p>
            <div className="rd-finish-actions">
              <button type="button" className="rd-btn-primary" onClick={() => navigate(`/book/${book.id}/quiz`)}>
                <Trophy size={18} /> Fazer o questionário
              </button>
              <Link to={`/editor/${book.id}`} className="rd-btn-ghost">
                <FileText size={16} /> Escrever resumo
              </Link>
            </div>
          </>
        ) : (
          <>
            <p>Parabéns por chegar até a última página! Registre o que você achou da história em um resumo.</p>
            <div className="rd-finish-actions">
              <Link to={`/editor/${book.id}`} className="rd-btn-primary">
                <FileText size={18} /> Escrever resumo
              </Link>
              <Link to="/library" className="rd-btn-ghost">
                Escolher outro livro
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Reader() {
  const { id } = useParams();
  const user = getUser();
  const student = user?.role === 'student';
  const key = `eti-reader:${user?.id}:${id}`;

  const [book, setBook] = useState(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(650);
  const [error, setError] = useState('');
  const [sync, setSync] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [focus, setFocus] = useState(true);
  const [settings, setSettings] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [finished, setFinished] = useState(false);
  const [paper, setPaper] = useState(() => {
    try {
      return localStorage.getItem('eti-reader-paper') || 'original';
    } catch {
      return 'original';
    }
  });

  const area = useRef(null);
  const touch = useRef(null);
  const celebrated = useRef(false);

  const go = target => {
    if (!count) return;
    const next = Math.min(count, Math.max(1, target));
    setPage(next);
    area.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Navegação por teclado.
  useEffect(() => {
    const onKey = e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') {
        setSettings(false);
        setFinished(false);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(page - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        go(page + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    try {
      localStorage.setItem('eti-reader-paper', paper);
    } catch {}
  }, [paper]);

  // Livro, posição salva, progresso e questionário.
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get(`/books/${id}`),
      api.get(`/books/${id}/position`).catch(() => ({ data: { page: 1 } })),
      api.get(`/books/${id}/progress`).catch(() => ({ data: { percentage: 0 } })),
      student ? api.get(`/books/${id}/quiz`).catch(() => ({ data: null })) : Promise.resolve({ data: null })
    ])
      .then(([b, p, pr, q]) => {
        if (!alive) return;
        let local;
        try {
          local = JSON.parse(localStorage.getItem(key));
        } catch {}
        const position = local && local.at > Date.parse(p.data.updated_at || '1970-01-01') ? local.page : p.data.page;
        setPage(Number.isFinite(Number(position)) ? Math.max(1, Math.floor(Number(position))) : 1);
        setProgress(pr.data?.percentage || 0);
        celebrated.current = (pr.data?.percentage || 0) >= 100;
        setQuiz(q.data);
        setBook(b.data);
      })
      .catch(() => {
        if (alive) setError('Não foi possível carregar o livro.');
      });
    return () => {
      alive = false;
    };
  }, [id, key, student]);

  useEffect(() => {
    if (!book || !area.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(area.current);
    return () => observer.disconnect();
  }, [book]);

  // Salva a posição; o servidor calcula o progresso a partir da página e do total.
  useEffect(() => {
    if (!book || !count) return;
    let active = true;
    try {
      localStorage.setItem(key, JSON.stringify({ page, at: Date.now() }));
    } catch {}
    setSync('saving');
    const timer = setTimeout(
      () =>
        api
          .put(`/books/${id}/position`, { page, total: count })
          .then(r => {
            if (!active) return;
            setSync('saved');
            if (r.data?.percentage != null) setProgress(r.data.percentage);
          })
          .catch(() => active && setSync('offline')),
      500
    );
    if (page === count && student && !celebrated.current) {
      celebrated.current = true;
      setTimeout(() => {
        api
          .get(`/books/${id}/quiz`)
          .then(r => setQuiz(r.data))
          .catch(() => {})
          .finally(() => setFinished(true));
      }, 900);
    }
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, book, count, id, key, student]);

  const url = book?.arquivo_url;
  const file = url?.startsWith('/api/uploads/') ? url + '?inline=true' : url;
  const position = count ? Math.round((page / count) * 100) : 0;
  const pageWidth = Math.max(240, Math.min(860, width - 32)) * zoom;
  const syncLabel = { idle: '', saving: 'Salvando…', saved: 'Progresso salvo', offline: 'Salvo neste aparelho' }[sync];

  return (
    <DashboardLayout focusMode={focus}>
      <div className={`rd paper-${paper}`}>
        <header className="rd-bar">
          <Link to={`/book/${id}`} className="rd-icon" aria-label="Voltar ao livro">
            <ArrowLeft size={19} />
          </Link>
          <div className="rd-title">
            <h1>{book?.titulo || 'Preparando seu livro…'}</h1>
            <p>{book?.autor}</p>
          </div>
          {student && (
            <span className={`rd-progress-chip ${progress >= 100 ? 'is-done' : ''}`} title="Seu progresso neste livro">
              {progress >= 100 ? <Check size={14} /> : null}
              {progress}% lido
            </span>
          )}
          <button
            type="button"
            className={`rd-icon ${settings ? 'is-active' : ''}`}
            onClick={() => setSettings(v => !v)}
            aria-expanded={settings}
            aria-controls="rd-settings"
            aria-label="Ajustes de leitura"
          >
            <Settings2 size={19} />
          </button>
          <button type="button" className="rd-icon rd-hide-mobile" onClick={() => setFocus(v => !v)} aria-label={focus ? 'Mostrar menu da plataforma' : 'Modo imersivo'}>
            {focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </header>

        {settings && (
          <section id="rd-settings" className="rd-settings" aria-label="Conforto de leitura">
            <span className="rd-settings-label">Cor do papel</span>
            <div className="rd-paper-options">
              {[
                ['original', 'Claro', Sun],
                ['sepia', 'Sépia', Feather],
                ['dark', 'Noturno', Moon]
              ].map(([value, label, Icon]) => (
                <button key={value} type="button" aria-pressed={paper === value} onClick={() => setPaper(value)} className={`swatch-${value}`}>
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
            <span className="rd-settings-label">Tamanho da página</span>
            <div className="rd-zoom">
              <button type="button" aria-label="Diminuir página" disabled={zoom <= 0.75} onClick={() => setZoom(z => Math.max(0.75, z - 0.25))}>
                <ZoomOut size={17} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" aria-label="Aumentar página" disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + 0.25))}>
                <ZoomIn size={17} />
              </button>
            </div>
            <Link to={`/editor/${id}`} className="rd-settings-link">
              <FileText size={16} /> Escrever sobre esta leitura
            </Link>
          </section>
        )}

        {error && (
          <div role="alert" className="rd-error">
            {error}{' '}
            {url && (
              <a href={url} target="_blank" rel="noreferrer">
                Abrir PDF em outra aba
              </a>
            )}
          </div>
        )}

        <div
          className="rd-stage"
          ref={area}
          onTouchStart={e => (touch.current = e.touches[0].clientX)}
          onTouchEnd={e => {
            if (touch.current == null || zoom > 1) return;
            const delta = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(delta) > 60) go(page + (delta < 0 ? 1 : -1));
            touch.current = null;
          }}
        >
          {book && !url ? (
            <p className="rd-message">Este livro ainda não possui um PDF cadastrado.</p>
          ) : (
            book && (
              <Document
                file={file}
                loading={
                  <div className="rd-message">
                    <span className="cx-spinner" /> Abrindo as portas desta história…
                  </div>
                }
                onLoadSuccess={({ numPages }) => {
                  setCount(numPages);
                  setPage(v => Math.min(numPages, Math.max(1, v)));
                  setError('');
                }}
                onLoadError={() => setError('Não foi possível abrir o PDF. Tente novamente ou abra o arquivo em outra aba.')}
                error=""
              >
                <div className="rd-sheet-wrap">
                  <div className="rd-sheet" key={page}>
                    <Page pageNumber={page} width={pageWidth} loading={<div className="rd-page-loading" style={{ width: pageWidth }} />} />
                  </div>
                </div>
              </Document>
            )
          )}
        </div>

        {!!count && (
          <>
            <button type="button" className="rd-turn is-prev" aria-label="Página anterior" disabled={page <= 1} onClick={() => go(page - 1)}>
              <ChevronLeft size={26} />
            </button>
            <button type="button" className="rd-turn is-next" aria-label="Próxima página" disabled={page >= count} onClick={() => go(page + 1)}>
              <ChevronRight size={26} />
            </button>
          </>
        )}

        <footer className="rd-footer">
          <div className="rd-scrub">
            <span className="rd-scrub-fill" style={{ width: `${count > 1 ? ((page - 1) / (count - 1)) * 100 : 0}%` }} />
            <input
              type="range"
              min="1"
              max={count || 1}
              value={page}
              disabled={!count}
              aria-label="Ir para a página"
              onChange={e => go(Number(e.target.value))}
            />
          </div>
          <div className="rd-footer-row">
            <button type="button" className="rd-nav" disabled={!count || page <= 1} onClick={() => go(page - 1)}>
              <ChevronLeft size={18} /> <span>Anterior</span>
            </button>
            <div className="rd-page-info">
              <label>
                <input
                  aria-label="Página atual"
                  type="number"
                  min="1"
                  max={count || 1}
                  value={page}
                  onChange={e => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= count) go(n);
                  }}
                />
                <span>de {count || '…'}</span>
              </label>
              <small role="status">
                {sync === 'offline' && <CloudOff size={12} />} {count ? `${position}% do livro` : ''}
                {syncLabel ? ` · ${syncLabel}` : ''}
              </small>
            </div>
            <button type="button" className="rd-nav is-next" disabled={!count || page >= count} onClick={() => go(page + 1)}>
              <span>Próxima</span> <ChevronRight size={18} />
            </button>
          </div>
        </footer>

        {finished && book && <FinishCard book={book} quiz={quiz} onClose={() => setFinished(false)} />}
      </div>
    </DashboardLayout>
  );
}
