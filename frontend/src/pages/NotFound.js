import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import OwlEmpty from '@/components/OwlEmpty';
import { isAuthenticated } from '@/lib/auth';

// Página para endereços inexistentes, com a coruja perdida entre os livros.
export default function NotFound() {
  const navigate = useNavigate();
  const logged = isAuthenticated();
  return (
    <main className="nf">
      <section className="nf-card">
        <p className="nf-code" aria-hidden="true">
          404
        </p>
        <OwlEmpty
          mood="search"
          bubble="Cadê?"
          title="Esta página saiu da estante"
          text="Procuramos em todas as prateleiras e não encontramos o endereço que você abriu. Ele pode ter mudado ou sido removido."
        />
        <div className="nf-actions">
          <Link className="oe-action" to={logged ? '/dashboard' : '/'}>
            {logged ? 'Ir para o início' : 'Entrar na plataforma'} <ArrowRight size={16} />
          </Link>
          <button type="button" className="nf-ghost" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
      </section>
    </main>
  );
}
