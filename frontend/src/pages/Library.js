import { confirmAction } from '@/components/ConfirmHost';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, BookMarked, CheckCircle2, Trophy, ArrowRight, Library as LibraryIcon } from 'lucide-react';
import EmptyCollection from '@/components/EmptyCollection';
import DashboardLayout from '@/components/DashboardLayout';
import BookCard from '@/components/BookCard';
import { getAuth } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

const normalize = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FILTERS = ['Todos', 'Em leitura', 'Concluídos', 'Não iniciados'];

function ContinueCard({ book }) {
  const [failed, setFailed] = useState(false);
  return (
    <Link to={`/reader/${book.id}`} className="lb-continue">
      <div className="lb-continue-cover">
        {book.capa_url && !failed ? <img src={book.capa_url} alt="" onError={() => setFailed(true)} /> : <BookOpen size={26} />}
      </div>
      <div className="lb-continue-copy">
        <span>Continue lendo</span>
        <h3>{book.titulo}</h3>
        <p>{book.autor}</p>
        <div className="lb-continue-bar">
          <span className="ws-meter">
            <span style={{ width: `${book.progress}%` }} />
          </span>
          <b>{book.progress}%</b>
        </div>
      </div>
      <span className="lb-continue-go" aria-hidden="true">
        <ArrowRight size={18} />
      </span>
    </Link>
  );
}

const Library = () => {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [failed, setFailed] = useState(false);
  const [books, setBooks] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = getAuth();
  const isAdmin = user?.role === 'admin';
  const student = user?.role === 'student';

  const loadBooks = async () => {
    setFailed(false);
    setLoading(true);
    try {
      const [response, certs] = await Promise.all([api.get('/books'), student ? api.get('/certificates').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })]);
      setBooks(response.data);
      setCertificates(Array.isArray(certs.data) ? certs.data : []);
    } catch {
      setFailed(true);
      toast.error('Erro ao carregar livros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleDeleteBook = async bookId => {
    if (!(await confirmAction({ title: 'Excluir livro?', message: 'Tem certeza que deseja excluir este livro? Todos os resumos e progresso relacionados serão removidos.', confirmLabel: 'Excluir' }))) return;
    try {
      await api.delete(`/admin/books/${bookId}`);
      setBooks(books.filter(b => b.id !== bookId));
      toast.success('Livro excluído com sucesso!');
    } catch {
      toast.error('Erro ao excluir livro');
    }
  };

  const certified = new Set(certificates.map(c => c.book_id));
  const reading = books.filter(b => b.progress > 0 && b.progress < 100).sort((a, b) => b.progress - a.progress);
  const done = books.filter(b => b.progress >= 100);
  const filtered = books.filter(
    b =>
      normalize(b.titulo + ' ' + b.autor).includes(normalize(query)) &&
      (!level || (b.nivel_ensino || 'AMBOS') === level) &&
      (filter === 'Todos' ||
        (filter === 'Em leitura' && b.progress > 0 && b.progress < 100) ||
        (filter === 'Concluídos' && b.progress >= 100) ||
        (filter === 'Não iniciados' && !b.progress))
  );
  const browsing = !query && !level && filter === 'Todos';
  const recent = [...filtered].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const counts = {
    Todos: books.length,
    'Em leitura': reading.length,
    Concluídos: done.length,
    'Não iniciados': books.filter(b => !b.progress).length
  };

  return (
    <DashboardLayout>
      <div data-testid="library-page" className="lb">
        <section className="lb-hero">
          <div className="lb-hero-copy">
            <p className="lb-eyebrow">
              <LibraryIcon size={14} /> Biblioteca ETI
            </p>
            <h1>Biblioteca</h1>
            <p>Uma estante de possibilidades. Termine um livro, responda o questionário e conquiste seu certificado.</p>
            <label className="lb-search">
              <Search size={18} />
              <input aria-label="Buscar por título ou autor" placeholder="Buscar por título ou autor…" value={query} onChange={e => setQuery(e.target.value)} />
            </label>
          </div>
          <div className="lb-stats">
            <div>
              <BookMarked size={18} />
              <strong>{books.length}</strong>
              <span>livros</span>
            </div>
            {student && (
              <>
                <div>
                  <BookOpen size={18} />
                  <strong>{reading.length}</strong>
                  <span>lendo</span>
                </div>
                <div>
                  <CheckCircle2 size={18} />
                  <strong>{done.length}</strong>
                  <span>concluídos</span>
                </div>
                <div>
                  <Trophy size={18} />
                  <strong>{certificates.length}</strong>
                  <span>certificados</span>
                </div>
              </>
            )}
          </div>
        </section>

        {student && browsing && reading.length > 0 && (
          <section className="lb-section">
            <div className="lb-section-head">
              <h2>Continue de onde parou</h2>
            </div>
            <div className="lb-continue-row">
              {reading.slice(0, 3).map(b => (
                <ContinueCard key={b.id} book={b} />
              ))}
            </div>
          </section>
        )}

        <div className="lb-filters">
          <div className="ws-segment filter-tabs" role="group" aria-label="Progresso da leitura">
            {FILTERS.filter(f => student || f === 'Todos').map(item => (
              <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
                {item} <span>{counts[item]}</span>
              </button>
            ))}
          </div>
          <select className="rp-select" aria-label="Filtrar etapa de ensino" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">Todas as etapas</option>
            <option value="FUNDAMENTAL">Ensino fundamental</option>
            <option value="MÉDIO">Ensino médio</option>
            <option value="AMBOS">Para todos os leitores</option>
          </select>
          <p className="lb-count" role="status">
            {filtered.length} {filtered.length === 1 ? 'livro' : 'livros'}
          </p>
        </div>

        {loading ? (
          <div className="lb-grid" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="lb-skeleton" />
            ))}
          </div>
        ) : failed ? (
          <div className="ws-card ws-empty" role="alert">
            <h3>Não foi possível carregar os livros</h3>
            <button onClick={loadBooks} className="underline font-semibold">
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyCollection
            icon={BookOpen}
            title={books.length ? 'Vamos tentar outra leitura?' : 'Novas histórias estão a caminho.'}
            description={books.length ? 'Busque outro título, autor ou filtro.' : 'Os livros publicados pela escola vão aparecer nesta estante.'}
          />
        ) : (
          <section className="lb-section">
            {browsing && (
              <div className="lb-section-head">
                <h2>Todo o acervo</h2>
                <span>Mais recentes primeiro</span>
              </div>
            )}
            <div className="lb-grid">
              {recent.map(book => (
                <BookCard key={book.id} book={book} isAdmin={isAdmin} onDelete={handleDeleteBook} certified={certified.has(book.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Library;
