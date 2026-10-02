import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Owl } from '@/components/LoginScene';

// Estado vazio com a coruja da plataforma. `mood` muda o balão: 'calm' (padrão), 'search' ou 'party'.
export default function OwlEmpty({ title, text, action, to, onAction, bubble, mood = 'calm', compact = false, className = '', children }) {
  const say = bubble ?? (mood === 'search' ? 'Hmm…' : mood === 'party' ? 'Uhuu!' : 'Psiu!');
  const actionBody = (
    <>
      {action} <ArrowRight size={16} />
    </>
  );
  return (
    <div className={`oe ${compact ? 'is-compact' : ''} is-${mood} ${className}`}>
      <div className="oe-art" aria-hidden="true">
        <span className="oe-glow" />
        <span className="oe-bubble">{say}</span>
        <Owl size={compact ? 70 : 96} />
        <span className="oe-books">
          <i />
          <i />
          <i />
        </span>
      </div>
      {title && <h3>{title}</h3>}
      {text && <p>{text}</p>}
      {action &&
        (to ? (
          <Link className="oe-action" to={to}>
            {actionBody}
          </Link>
        ) : onAction ? (
          <button type="button" className="oe-action" onClick={onAction}>
            {actionBody}
          </button>
        ) : null)}
      {children}
    </div>
  );
}
