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
  FileText
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import '@/discovery.css';
import '@/reader-room.css';

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
  const [focus, setFocus] = useState(true);
  const [settings, setSettings] = useState(false);
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
        e.preventDefault();
        setPage(v => Math.max(1, v - 1));
        area.current?.scrollTo({ top: 0 });
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        e.preventDefault();
        setPage(v => (count ? Math.min(count, v + 1) : v));
        area.current?.scrollTo({ top: 0 });
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
        const position = local && local.at > Date.parse(p.data.updated_at || '1970-01-01') ? local.page : p.data.page;
        setPage(Number.isFinite(Number(position)) ? Math.max(1, Math.floor(Number(position))) : 1);
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
    let localSaved = false;
    try {
      localStorage.setItem(key, JSON.stringify({ page, at: Date.now() }));
      localSaved = true;
      setSaved('Salvo neste aparelho');
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
            if (active) setSaved(localSaved ? 'Salvo neste aparelho' : 'Não foi possível salvar a posição');
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

  const percentage = count ? Math.round(page / count * 100) : 0;
  const turn = delta => {
    setPage(v => Math.min(count || 1, Math.max(1, v + delta)));
    area.current?.scrollTo({ top: 0, behavior: 'instant' });
  };
  return (
    <DashboardLayout focusMode={focus}>
      <div className={`reading-room paper-${paper}`}>
        <header className="reading-room-header">
          <Link to={`/book/${id}`} className="room-icon" aria-label="Voltar ao livro"><ArrowLeft size={20}/></Link>
          <div className="room-book-title"><span>SEU MOMENTO DE LEITURA</span><h1>{book?.titulo || 'Preparando seu livro…'}</h1><p>{book?.autor}</p></div>
          <button className="room-icon" onClick={() => setFocus(v => !v)} aria-label={focus ? 'Mostrar menu da plataforma' : 'Entrar no modo imersivo'}>{focus ? <Minimize2 size={19}/> : <Maximize2 size={19}/>}</button>
        </header>
        <div className="room-progress" role="progressbar" aria-label="Posição no livro" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><span style={{width: percentage + '%'}}/></div>
        {error && <div role="alert" className="room-error">{error} {url && <a href={url} target="_blank" rel="noreferrer">Abrir PDF em outra aba</a>}</div>}
        <div className="room-stage" ref={area}>
          {book && !url ? <p className="room-message">Este livro ainda não possui um PDF cadastrado.</p> : book && <Document file={file}
            loading={<p className="room-message">Abrindo as portas desta história…</p>}
            onLoadSuccess={({numPages}) => {setCount(numPages);setPage(v => Math.min(numPages, Math.max(1,v)));setError('');}}
            onLoadError={() => setError('Não foi possível abrir o PDF. Tente novamente ou abra o arquivo em outra aba.')} error="">
            <Page pageNumber={page} width={Math.max(240, Math.min(820, width - 48)) * zoom} loading={<p className="room-message">Preparando página {page}…</p>}/>
          </Document>}
        </div>
        <footer className="room-footer">
          <div className="room-position"><span>{count ? percentage + '% do livro' : 'ETI LEITURA'}</span><span role="status">{saved}</span></div>
          <div className="room-controls" role="toolbar" aria-label="Controles de leitura">
            <button className="room-icon" disabled={!count || page <= 1} onClick={() => turn(-1)} aria-label="Página anterior"><ChevronLeft/></button>
            <label className="room-page">Página <input aria-label="Página atual" type="number" min="1" max={count || 1} value={page} onChange={e => {const n=Number(e.target.value);if(Number.isInteger(n) && n>=1 && n<=count){setPage(n);area.current?.scrollTo({top:0});}}}/> <span>de {count || '…'}</span></label>
            <button className="room-icon" disabled={!count || page >= count} onClick={() => turn(1)} aria-label="Próxima página"><ChevronRight/></button>
            <button className={`room-settings-button ${settings ? 'selected' : ''}`} aria-expanded={settings} aria-controls="reading-settings" onClick={() => setSettings(v=>!v)}><Sun size={18}/><span>Ajustes</span></button>
          </div>
          {settings && <section id="reading-settings" className="room-settings" aria-label="Conforto de leitura">
            <div className="room-settings-heading"><strong>Do seu jeito</strong><button onClick={()=>setSettings(false)}>Fechar</button></div>
            <span>Cor do papel</span><div className="room-paper-options">{[['original','Claro',Sun],['sepia','Sépia',Feather],['dark','Noturno',Moon]].map(([value,label,Icon])=><button key={value} aria-pressed={paper===value} onClick={()=>setPaper(value)}><Icon size={16}/>{label}</button>)}</div>
            <div className="room-zoom"><span>Tamanho da página</span><button aria-label="Diminuir página" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}><ZoomOut size={18}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Aumentar página" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}><ZoomIn size={18}/></button></div>
            <Link to={`/editor/${id}`} className="room-summary"><FileText size={16}/> Escrever sobre esta leitura</Link>
          </section>}
        </footer>
      </div>
    </DashboardLayout>
  );
}
