import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import '@/discovery.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export default function Reader() {
  const { id } = useParams();
  const key = `eti-reader:${getUser()?.id}:${id}`;

  const [book, setBook] = useState(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(650);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [focus, setFocus] = useState(false);
  const [paper, setPaper] = useState(() => {
    try {
      return localStorage.getItem('eti-reader-paper') || 'original';
    } catch {
      return 'original';
    }
  });

  const area = useRef(null);

  // Teclas de atalho para navegação
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignora se estiver digitando no input de página
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'Escape') {
        setFocus(false);
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        setPage(v => Math.max(1, v - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setPage(v => (count ? Math.min(count, v + 1) : v));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [count]);

  // Persistir tema de papel
  useEffect(() => {
    try {
      localStorage.setItem('eti-reader-paper', paper);
    } catch {}
  }, [paper]);

  // Carregar dados do livro e última posição de leitura
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get(`/books/${id}`),
      api.get(`/books/${id}/position`).catch(() => ({ data: { page: 1 } }))
    ])
      .then(([b, p]) => {
        if (!alive) return;
        let local;
        try {
          local = JSON.parse(localStorage.getItem(key));
        } catch {}
        setPage(local && local.at > Date.parse(p.data.updated_at || '1970-01-01') ? local.page : p.data.page);
        setBook(b.data);
      })
      .catch(() => {
        if (alive) setError('Não foi possível carregar o livro.');
      });
    return () => {
      alive = false;
    };
  }, [id, key]);

  // Observer de redimensionamento da tela
  useEffect(() => {
    if (!book || !area.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(area.current);
    return () => observer.disconnect();
  }, [book]);

  // Sincronização da posição de leitura
  useEffect(() => {
    if (!book || !count) return;
    let active = true;
    try {
      localStorage.setItem(key, JSON.stringify({ page, at: Date.now() }));
      setSaved('Página guardada neste navegador.');
    } catch {
      setSaved('Salvando página…');
    }
    const timer = setTimeout(
      () =>
        api
          .put(`/books/${id}/position`, { page })
          .then(() => {
            if (active) setSaved('Página salva na nuvem.');
          })
          .catch(() => {
            if (active) setSaved('Modo offline: salvo localmente.');
          }),
      400
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, book, count, id, key]);

  const url = book?.arquivo_url;
  const file = url?.startsWith('/api/uploads/') ? url + '?inline=true' : url;
  const progressPercent = count ? Math.round((page / count) * 100) : 0;

  return (
    <DashboardLayout focusMode={focus}>
      <div className={`reader-workspace paper-${paper}`}>
        {/* Banner de Cabeçalho do Leitor */}
        <div className="reader-banner-modern">
          <div className="reader-banner-left">
            <Link to={`/book/${id}`} className="reader-back-btn">
              <ArrowLeft size={14} /> Voltar aos detalhes do livro
            </Link>
            <h1>{book?.titulo || 'Leitor ETI LEITURA'}</h1>
            <p>{book?.autor || 'Uma experiência imersiva de leitura.'}</p>
          </div>
          <div className="reader-banner-actions">
            <Link to={`/editor/${id}`} className="reader-summary-btn">
              <FileText size={16} /> Escrever resumo
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" className="panel mb-5 border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200">
            {error}{' '}
            {url && (
              <a className="text-primary underline ml-2 font-bold" href={url} target="_blank" rel="noreferrer">
                Abrir PDF em nova aba ↗
              </a>
            )}
          </div>
        )}

        {book && !url ? (
          <div className="empty-state panel p-12 text-center">
            <p className="text-muted-foreground text-lg">Este livro ainda não possui um arquivo PDF cadastrado.</p>
          </div>
        ) : (
          book && (
            <>
              {/* Barra de Progresso Visual */}
              <section className="reader-progress-bar-container" aria-label="Progresso de leitura">
                <div className="reader-progress-info">
                  <span className="reader-progress-label">SUA JORNADA NESTE LIVRO</span>
                  <span className="reader-progress-page">
                    {count ? `Página ${page} de ${count} (${progressPercent}%)` : 'Carregando documento…'}
                  </span>
                </div>
                <div className="reader-progress-track">
                  <div className="reader-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </section>

              {/* Toolbar do Leitor */}
              <div className="reader-toolbar">
                {/* Grupo: Modo de Foco */}
                <div className="reader-tool-group">
                  <button
                    className={`reader-tool-btn ${focus ? 'active' : ''}`}
                    onClick={() => setFocus(v => !v)}
                    title={focus ? 'Sair do modo foco (Esc)' : 'Ativar modo foco'}
                  >
                    {focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    <span>{focus ? 'Sair do foco' : 'Modo imersivo'}</span>
                  </button>
                </div>

                {/* Grupo: Temas de Papel */}
                <div className="reader-tool-group">
                  <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Papel:</span>
                  <div className="paper-picker">
                    <button
                      className={`paper-option-btn ${paper === 'original' ? 'selected' : ''}`}
                      onClick={() => setPaper('original')}
                      title="Papel Claro Original"
                    >
                      <Sun size={14} /> Claro
                    </button>
                    <button
                      className={`paper-option-btn ${paper === 'sepia' ? 'selected' : ''}`}
                      onClick={() => setPaper('sepia')}
                      title="Papel Sépia Conforto Visual"
                    >
                      <Feather size={14} /> Sépia
                    </button>
                    <button
                      className={`paper-option-btn ${paper === 'dark' ? 'selected' : ''}`}
                      onClick={() => setPaper('dark')}
                      title="Modo Noturno"
                    >
                      <Moon size={14} /> Noturno
                    </button>
                  </div>
                </div>

                {/* Grupo: Navegação de Página */}
                <div className="reader-tool-group">
                  <button
                    className="reader-tool-btn"
                    disabled={page <= 1 || !count}
                    onClick={() => setPage(v => v - 1)}
                    title="Página Anterior (Seta Esquerda)"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-1.5 text-xs font-bold px-2">
                    <input
                      aria-label="Página atual"
                      className="bg-background border border-border rounded-lg p-1.5 w-14 text-center font-bold"
                      type="number"
                      min={1}
                      max={count || 1}
                      value={page}
                      onChange={e => {
                        const n = Number(e.target.value);
                        if (n >= 1 && n <= count) setPage(n);
                      }}
                    />
                    <span className="text-muted-foreground">/ {count || '…'}</span>
                  </div>

                  <button
                    className="reader-tool-btn"
                    disabled={page >= count || !count}
                    onClick={() => setPage(v => v + 1)}
                    title="Próxima Página (Seta Direita)"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Grupo: Zoom */}
                <div className="reader-tool-group">
                  <button
                    className="reader-tool-btn"
                    disabled={zoom <= 0.75}
                    onClick={() => setZoom(z => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                    title="Diminuir Zoom"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    className="reader-tool-btn"
                    disabled={zoom >= 2}
                    onClick={() => setZoom(z => Math.min(2, Number((z + 0.25).toFixed(2))))}
                    title="Aumentar Zoom"
                  >
                    <ZoomIn size={16} />
                  </button>
                  {zoom !== 1 && (
                    <button
                      className="reader-tool-btn"
                      onClick={() => setZoom(1)}
                      title="Resetar Zoom"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Área do Documento PDF */}
              <div ref={area} className="pdf-page-container">
                <Document
                  file={file}
                  loading={
                    <div className="p-12 text-center text-muted-foreground">
                      <Sparkles className="animate-spin inline-block mb-2" size={24} />
                      <p>Carregando páginas do livro…</p>
                    </div>
                  }
                  onLoadSuccess={({ numPages }) => {
                    setCount(numPages);
                    setPage(v => Math.min(numPages, Math.max(1, v)));
                    setError('');
                  }}
                  onLoadError={() =>
                    setError(
                      'O PDF não pôde ser exibido. Se for um link externo, verifique as permissões de acesso.'
                    )
                  }
                  error=""
                >
                  <Page
                    pageNumber={page}
                    width={Math.max(240, width - 24) * zoom}
                    loading={
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        Renderizando página {page}…
                      </div>
                    }
                  />
                </Document>
              </div>

              {/* Rodapé Flutuante de Navegação e Status */}
              <div className="reader-bottom-nav">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || !count}
                  onClick={() => setPage(v => v - 1)}
                >
                  <ChevronLeft size={16} className="mr-1" /> Página anterior
                </Button>

                <div className="flex items-center gap-3">
                  <span className="reader-sync-status">
                    <CheckCircle2 size={16} className="text-emerald-500" /> {saved}
                  </span>
                  <span className="keyboard-hint-pill hidden md:inline-flex">
                    Dica: Use as setas ← → do teclado para virar páginas
                  </span>
                </div>

                <Button
                  size="sm"
                  disabled={page >= count || !count}
                  onClick={() => setPage(v => v + 1)}
                >
                  Próxima página <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
