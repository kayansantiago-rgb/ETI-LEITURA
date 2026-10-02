import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { WifiOff, BookOpen, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// Livros abertos neste aparelho (guardados pelo leitor para leitura sem internet).
export function offlineBooks() {
  try {
    return Object.keys(localStorage)
      .filter(k => k.startsWith('eti-offline-book:'))
      .map(k => JSON.parse(localStorage.getItem(k)))
      .filter(x => x?.book?.id)
      .sort((a, b) => b.at - a.at)
      .map(x => x.book);
  } catch {
    return [];
  }
}

// Faixa que aparece quando a internet cai, com atalho para os livros já baixados.
export default function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => {
      setOffline(false);
      setOpen(false);
      toast.success('Conexão de volta! Seu progresso será sincronizado.', { id: 'eti-online' });
    };
    window.addEventListener('offline', down);
    window.addEventListener('online', up);
    return () => {
      window.removeEventListener('offline', down);
      window.removeEventListener('online', up);
    };
  }, []);

  if (!offline) return null;
  const books = offlineBooks();

  return createPortal(
    <div className={`ob ${open ? 'is-open' : ''}`} role="status">
      <button type="button" className="ob-bar" onClick={() => books.length && setOpen(v => !v)} aria-expanded={open}>
        <WifiOff size={16} />
        <span>
          <strong>Você está sem internet.</strong> {books.length ? `${books.length} livro(s) disponível(is) para ler.` : 'Os livros abertos antes ficam disponíveis aqui.'}
        </span>
        {books.length > 0 && <ChevronDown size={16} className="ob-chevron" />}
      </button>
      {open && (
        <ul className="ob-list">
          {books.map(b => (
            <li key={b.id}>
              <Link to={`/reader/${b.id}`} onClick={() => setOpen(false)}>
                <span className="ob-cover">{b.capa_url ? <img src={b.capa_url} alt="" /> : <BookOpen size={15} />}</span>
                <span className="min-w-0">
                  <strong>{b.titulo}</strong>
                  <small>{b.autor}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body
  );
}
