import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { getUser } from '@/lib/auth';
import '@/discovery.css';

export default function StudentDiscovery({ books = [], posts = [], stats = {} }) {
  const [slide, setSlide] = useState(0);
  const user = getUser();
  const userName = user?.nome?.split(' ')[0] || 'Aluno';

  // Hora do dia para saudação
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const photos = posts.filter(p => p.tipo === 'foto' && p.url_media);
  const totalSlides = Math.max(photos.length, 1);
  const currentPost = photos[slide % totalSlides];

  return (
    <div className="space-y-4">
      {/* Top Greeting Header (Imagem de Referência 4) */}
      <div className="student-hero-greeting">
        <div>
          <h1>
            <span>🌅</span> {greetingText}, <span className="text-primary">{userName}</span>! 🚀
          </h1>
          <p>Qual será o próximo mundo literário que vamos explorar hoje?</p>
        </div>
      </div>

      <div className="hero-discovery-container">
        {/* Card Principal: Carrossel do Mural (Timeline) */}
        <section className="timeline-carousel-card" aria-label="Linha do tempo da escola">
          <div className="timeline-photo-wrapper">
            {currentPost ? (
              <img
                className="timeline-photo"
                src={currentPost.url_media}
                alt={currentPost.titulo || 'Mural da escola'}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground opacity-40">
                <BookOpen size={64} className="mb-2" />
                <span className="font-extrabold text-xl tracking-wide">ETI LEITURA</span>
              </div>
            )}
          </div>

          <div className="timeline-overlay" />

          {/* Conteúdo do Slide */}
          <div className="timeline-caption-box">
            <span className="timeline-badge">
              <Sparkles size={12} /> {currentPost ? '• NOVIDADE NO MURAL' : '• ESPAÇO DO LEITOR'}
            </span>
            <h2>{currentPost?.titulo || 'Novidades e Histórias da Nossa Escola'}</h2>
            <p className="timeline-date">
              {(currentPost?.created_at || currentPost?.data)
                ? `Publicado em ${new Date(currentPost.created_at || currentPost.data).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}`
                : 'Acompanhe as publicações e produções textuais dos alunos.'}
            </p>
          </div>

          {/* Setas de Navegação */}
          {photos.length > 1 && (
            <>
              <button
                className="carousel-nav-btn prev"
                aria-label="Foto anterior"
                onClick={() => setSlide(s => (s - 1 + photos.length) % photos.length)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="carousel-nav-btn next"
                aria-label="Próxima foto"
                onClick={() => setSlide(s => (s + 1) % photos.length)}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Linha de Bolinhas (Bullets Indicator Line) */}
          {photos.length > 1 && (
            <div className="timeline-dots-bar" aria-label="Indicador de slides">
              {photos.map((_, idx) => (
                <button
                  type="button"
                  aria-label={`Ver foto ${idx + 1}`}
                  aria-current={idx === slide % photos.length ? 'true' : undefined}
                  key={idx}
                  className={`timeline-dot ${idx === slide % photos.length ? 'active' : 'inactive'}`}
                  onClick={() => setSlide(idx)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Painel Direito: Stats Grid & CTA Biblioteca (Imagem de Referência 4) */}
        <aside className="hero-side-panel">
          {/* Grid com Stats */}
          <div className="hero-stats-grid">
            <div className="hero-stat-card">
              <div className="hero-stat-icon-badge">
                <BookOpen size={20} />
              </div>
              <div className="hero-stat-info">
                <strong>{books.length}</strong>
                <span>Livros disponíveis</span>
              </div>
            </div>

            <div className="hero-stat-card">
              <div className="hero-stat-icon-badge">
                <FileText size={20} />
              </div>
              <div className="hero-stat-info">
                <strong>{stats?.my_summaries ?? 0}</strong>
                <span>Seus resumos</span>
              </div>
            </div>
          </div>

          {/* Banner Biblioteca CTA */}
          <div className="hero-library-cta">
            <div>
              <span className="hero-library-cta-badge">
                <Sparkles size={12} /> BIBLIOTECA
              </span>
              <h2>
                Descubra novos <span>mundos literários</span>!
              </h2>
              <p>
                Temos <strong>{books.length} obras</strong> prontas para você. Escreva resumos e suba de nível!
              </p>
            </div>
            <Link to="/library" className="hero-library-btn">
              <span>EXPLORAR BIBLIOTECA</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
