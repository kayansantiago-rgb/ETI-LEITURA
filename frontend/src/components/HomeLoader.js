import { Owl } from '@/components/LoginScene';
import { getUser } from '@/lib/auth';

// Carregamento da página inicial: a coruja lendo enquanto a página se monta por trás.
export default function HomeLoader() {
  const name = getUser()?.nome?.split(' ')[0];
  return (
    <div className="hl" role="status" aria-live="polite">
      <div className="hl-hero">
        <div className="hl-owl" aria-hidden="true">
          <Owl size={86} />
          <span className="hl-book">
            <i />
            <i />
          </span>
        </div>
        <div>
          <strong>{name ? `Abrindo sua estante, ${name}…` : 'Abrindo sua estante…'}</strong>
          <span>Separando seus livros, atividades e conquistas.</span>
          <span className="hl-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
      <div className="hl-skeleton" aria-hidden="true">
        <span className="is-wide" />
        <span />
        <span />
        <span />
        <span className="is-wide" />
      </div>
    </div>
  );
}
