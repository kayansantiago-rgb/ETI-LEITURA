import EmptyCollection from '@/components/EmptyCollection';
import PageIntro from '@/components/PageIntro';
import { Search, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import LoadingCards from '@/components/LoadingCards';
import DashboardLayout from '@/components/DashboardLayout';
import BookCard from '@/components/BookCard';
import { getAuth } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

const Library = () => {
  const [query,setQuery]=useState(''),[level,setLevel]=useState('');
  const [filter,setFilter]=useState('Todos');
  const [failed,setFailed]=useState(false);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = getAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setFailed(false);setLoading(true);
    try {
      const response = await api.get('/books');
      setBooks(response.data);
    } catch (error) {
      setFailed(true);
      toast.error('Erro ao carregar livros');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (window.confirm('Tem certeza que deseja excluir este livro? Todos os resumos e progresso relacionados serão removidos.')) {
      try {
        await api.delete(`/admin/books/${bookId}`);
        setBooks(books.filter(b => b.id !== bookId));
        toast.success('Livro excluído com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir livro');
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingCards label="Carregando livros…" count={4}/>
      </DashboardLayout>
    );
  }

  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const filtered=books.filter(b=>normalize(b.titulo+' '+b.autor).includes(normalize(query))&&(!level||(b.nivel_ensino||'AMBOS')===level)&&(filter==='Todos'||(filter==='Em leitura'&&b.progress>0&&b.progress<100)||(filter==='Concluídos'&&b.progress===100)));
  const browsing=!query&&!level&&filter==='Todos';
  const progress=filtered.filter(b=>b.progress>0&&b.progress<100);
  const recent=filtered.filter(b=>!progress.some(p=>p.id===b.id)).sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')).slice(0,6);
  const remaining=filtered.filter(b=>!progress.some(p=>p.id===b.id)&&!recent.some(p=>p.id===b.id));
  const shelf=(title,description,items)=>items.length>0&&<section className="book-shelf" key={title}><div className="section-heading"><div><h2>{title}</h2><p className="text-sm text-muted-foreground mt-1">{description}</p></div><span className="shelf-count">{items.length}</span></div><div className="library-shelves">{items.map(book=><BookCard key={book.id} book={book} isAdmin={isAdmin} onDelete={handleDeleteBook}/>)}</div></section>;
  return (
    <DashboardLayout>
      <div data-testid="library-page" className="library-discover">
        <PageIntro section="DESCOBRIR / LER" title="Biblioteca" description="Uma estante de possibilidades. Encontre sua próxima leitura."/>

        <div className="library-toolbar"><div className="relative w-full sm:w-72"><Search size={17} className="absolute left-3 top-3 text-muted-foreground"/><Input aria-label="Buscar por título ou autor" placeholder="Buscar por título ou autor..." value={query} onChange={e=>setQuery(e.target.value)} className="pl-10 h-10"/></div><select className="native-select library-level" aria-label="Filtrar etapa de ensino" value={level} onChange={e=>setLevel(e.target.value)}><option value="">Todas as etapas</option><option value="FUNDAMENTAL">Ensino fundamental</option><option value="MÉDIO">Ensino médio</option><option value="AMBOS">Para todos os leitores</option></select><div className="filter-tabs" aria-label="Progresso da leitura">{['Todos','Em leitura','Concluídos'].map(item=><button key={item} aria-pressed={filter===item} onClick={()=>setFilter(item)}>{item}</button>)}</div></div>
        <p className="text-xs text-muted-foreground mb-5" role="status">{filtered.length} {filtered.length===1?'livro encontrado':'livros encontrados'}</p>
        {failed ? <div className="empty-state" role="alert"><p>Não foi possível carregar os livros.</p><button onClick={loadBooks} className="text-primary underline mt-3">Tentar novamente</button></div> : filtered.length === 0 ? (
          <EmptyCollection icon={BookOpen} title={books.length?'Vamos tentar outra leitura?':'Novas histórias estão a caminho.'} description={books.length?'Busque outro título, autor ou filtro de progresso.':'Os livros publicados pela escola vão aparecer nesta estante.'}/>
        ) : (
          browsing?<>{shelf('Continue lendo','Retome as histórias que você já começou.',progress)}{shelf('Novidades da estante','As adições mais recentes disponíveis para você.',recent)}{shelf('Mais para descobrir','Explore o restante do acervo.',remaining)}</>:shelf('Sua seleção','Livros de acordo com os filtros escolhidos.',filtered)
        )}
      </div>
    </DashboardLayout>
  );
};

export default Library;