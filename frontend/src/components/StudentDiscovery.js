import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, ChevronLeft, ChevronRight, Sparkles, PlayCircle } from 'lucide-react';
import '@/discovery.css';

export default function StudentDiscovery({ books = [], posts = [], progress = [] }) {
  const [slide, setSlide] = useState(0);
  const photos = posts.filter(p => p.tipo === 'foto' && p.url_media);
  const post = photos[slide % Math.max(photos.length, 1)];
  const current = progress[0];

  return (
    <div className="discovery-grid">
      <section className={`discovery-feature ${post ? 'has-photo' : ''}`} aria-label="Destaque da escola">
        {post ? (
          <img className="discovery-photo" src={post.url_media} alt={post.titulo || 'Mural da escola'} />
        ) : (
          <div className="discovery-art" aria-hidden="true">
            <BookOpen />
            <span>LER É<br />DESCOBRIR.</span>
            <Sparkles />
          </div>
        )}

        <div className="discovery-caption">
          <span className="discovery-tag">
            <Sparkles size={12} />
            {post ? 'NOSSA ESCOLA EM MOVIMENTO' : 'UM NOVO CAPÍTULO ESPERA POR VOCÊ'}
          </span>
          <h2>{post?.titulo || 'Histórias que levam você mais longe.'}</h2>
          <p>{post?.descricao || 'Aventuras, descobertas e ideias. Encontre um livro que tenha tudo a ver com você.'}</p>
          {!post && (
            <Link to="/library">
              <span>Encontrar meu próximo livro</span>
              <ArrowRight size={18} />
            </Link>
          )}
        </div>

        {photos.length > 1 && (
          <div className="discovery-slide-controls">
            <button aria-label="Foto anterior" onClick={() => setSlide(s => (s - 1 + photos.length) % photos.length)}>
              <ChevronLeft size={16} />
            </button>
            <span>{slide % photos.length + 1} / {photos.length}</span>
            <button aria-label="Próxima foto" onClick={() => setSlide(s => (s + 1) % photos.length)}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>

      <aside className="discovery-side">
        <div className="discovery-library">
          <div>
            <span className="discovery-tag">
              <Sparkles size={12} /> SUA PRÓXIMA DESCOBERTA
            </span>
            <h2>Um mundo inteiro<br />na sua biblioteca.</h2>
            <p>{books.length} {books.length === 1 ? 'livro disponível' : 'livros disponíveis'} para explorar no seu ritmo.</p>
          </div>
          <Link to="/library">
            <span>Explorar acervo</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="discovery-resume">
          <div className="discovery-resume-icon">
            <BookOpen size={24} />
          </div>
          <div className="discovery-resume-content">
            <span className="discovery-resume-tag">
              {current ? 'CONTINUE SUA HISTÓRIA' : 'SEU MOMENTO DE LEITURA'}
            </span>
            <h3>{current?.titulo || 'Que tal começar hoje?'}</h3>
            <p>
              {current
                ? `${Math.round(current.progress)}% da leitura concluída`
                : 'Escolha um livro e abra novas possibilidades.'}
            </p>
            <Link to={current ? `/reader/${current.id}` : '/library'}>
              {current ? 'Retomar leitura' : 'Escolher um livro'} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
