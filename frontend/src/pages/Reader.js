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
  FileText,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
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

  // Navegação por teclado (Seta Esquerda / Seta Direita)
  useEffect(() => {
    const handleKeyDown = e => {
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

  // Persistir preferência de papel
  useEffect(() => {
    try {
      localStorage.setItem('eti-reader-paper', paper);
    } catch {}
  }, [paper]);

  // Carregar dados do livro e posição salva
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

  // Ajuste responsivo da largura da página
  useEffect(() => {
    if (!book || !area.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(area.current);
    return () => observer.disconnect();
  }, [book]);

  // Sincronizar posição de leitura com backend/localStorage
  useEffect(() => {
    if (!book || !count) return;
    let active = true;
    try {
      localStorage.setItem(key, JSON.stringify({ page, at: Date.now() }));
      setSaved('Salvo');
    } catch {
      setSaved('Salvando…');
    }
    const timer = setTimeout(
      () =>
        api
          .put(`/books/${id}/position`, { page })
          .then(() => {
            if (active) setSaved('Sincronizado');
          })
          .catch(() => {
            if (active) setSaved('Salvo localmente');
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

  return (
    <DashboardLayout focusMode={focus}>
      <div className={`immersive-reader-page paper-${paper}`}>
        {/* Header Discreto e Minimalista (Sem Caixas Gigantes) */}
        {!focus && (
          <header className="immersive-reader-header">
            <div className="flex items-center gap-3">
              <Link to={`/book/${id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                <ArrowLeft size={18} />
              </Link>
              <div className="immersive-reader-title">
                <h1>{book?.titulo || 'Leitor de Livros'}</h1>
                <p>{book?.autor || 'ETI LEITURA'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1 hidden sm:inline-flex">
                <CheckCircle2 size={13} className="text-emerald-500" /> {saved}
              </span>
              <Link to={`/editor/${id}`} className="hero-library-btn !py-2 !px-4 !text-xs">
                <FileText size={14} /> Escrever resumo
              </Link>
            </div>
          </header>
        )}

        {/* Mensagens de Erro */}
        {error && (
          <div role="alert" className="m-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30 text-sm">
            {error}{' '}
            {url && (
              <a className="text-primary underline ml-2 font-bold" href={url} target="_blank" rel="noreferrer">
                Abrir PDF em nova aba ↗
              </a>
            )}
          </div>
        )}

        {/* Área Principal de Leitura Imersiva (Visual do PDF em Destaque Absoluto) */}
        <div ref={area} className="immersive-pdf-viewport">
          {book && !url ? (
            <div className="p-12 text-center text-muted-foreground">
              Este livro ainda não possui um arquivo PDF cadastrado.
            </div>
          ) : (
            book && (
              <Document
                file={file}
                loading={
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <Sparkles className="animate-spin text-primary" size={28} />
                    <p>Carregando páginas do livro…</p>
                  </div>
                }
                onLoadSuccess={({ numPages }) => {
                  setCount(numPages);
                  setPage(v => Math.min(numPages, Math.max(1, v)));
                  setError('');
                }}
                onLoadError={() =>
                  setError('O PDF não pôde ser exibido. Se for um link externo, verifique as permissões.')
                }
                error=""
              >
                <Page
                  pageNumber={page}
                  width={Math.max(280, width - 32) * zoom}
                  loading={
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Preparando página {page}…
                    </div>
                  }
                />
              </Document>
            )
          )}
        </div>

        {/* Dock Flutuante do Leitor no Rodapé (Estilo Apple Books / e-Reader) */}
        {book && url && (
          <div className="floating-reader-dock" role="toolbar" aria-label="Controles do leitor">
            {/* Página Anterior */}
            <button
              disabled={page <= 1 || !count}
              onClick={() => setPage(v => v - 1)}
              title="Página anterior (Seta Esquerda)"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Contador de Páginas */}
            <div className="dock-page-pill">
              <span>Página</span>
              <input
                aria-label="Página atual"
                className="bg-transparent w-8 text-center font-bold text-white outline-none border-b border-white/30"
                type="number"
                min={1}
                max={count || 1}
                value={page}
                onChange={e => {
                  const n = Number(e.target.value);
                  if (n >= 1 && n <= count) setPage(n);
                }}
              />
              <span>de {count || '…'}</span>
            </div>

            {/* Próxima Página */}
            <button
              disabled={page >= count || !count}
              onClick={() => setPage(v => v + 1)}
              title="Próxima página (Seta Direita)"
            >
              <ChevronRight size={20} />
            </button>

            <span className="w-[1px] h-4 bg-white/20 mx-1 hidden sm:block" />

            {/* Seleção de Papel */}
            <div className="dock-paper-selector hidden sm:flex">
              <button
                className={`dock-paper-btn ${paper === 'original' ? 'active' : ''}`}
                onClick={() => setPaper('original')}
                title="Papel Claro"
              >
                <Sun size={12} className="inline mr-1" /> Claro
              </button>
              <button
                className={`dock-paper-btn ${paper === 'sepia' ? 'active' : ''}`}
                onClick={() => setPaper('sepia')}
                title="Papel Sépia"
              >
                <Feather size={12} className="inline mr-1" /> Sépia
              </button>
              <button
                className={`dock-paper-btn ${paper === 'dark' ? 'active' : ''}`}
                onClick={() => setPaper('dark')}
                title="Modo Noturno"
              >
                <Moon size={12} className="inline mr-1" /> Dark
              </button>
            </div>

            <span className="w-[1px] h-4 bg-white/20 mx-1 hidden sm:block" />

            {/* Zoom */}
            <div className="items-center gap-1 hidden sm:flex">
              <button
                disabled={zoom <= 0.75}
                onClick={() => setZoom(z => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                title="Diminuir Zoom"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                disabled={zoom >= 2}
                onClick={() => setZoom(z => Math.min(2, Number((z + 0.25).toFixed(2))))}
                title="Aumentar Zoom"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            <span className="w-[1px] h-4 bg-white/20 mx-1" />

            {/* Modo Imersivo */}
            <button
              onClick={() => setFocus(v => !v)}
              title={focus ? 'Sair do modo imersivo (Esc)' : 'Ativar modo imersivo'}
            >
              {focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
