import { useState } from 'react';
import { BookOpen, Trash2, Check, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const LEVEL = { AMBOS: 'Todos os leitores', FUNDAMENTAL: 'Fundamental', 'MÉDIO': 'Médio' };

export default function BookCard({ book, isAdmin = false, onDelete, certified = false }) {
  const [failed, setFailed] = useState(false);
  const progress = book.progress || 0;
  return (
    <article className="lb-card" data-testid={`book-card-${book.id}`}>
      <Link to={`/book/${book.id}`} className="lb-card-link">
        <div className="lb-cover">
          {book.capa_url && !failed ? (
            <img src={book.capa_url} alt={`Capa de ${book.titulo}`} loading="lazy" onError={() => setFailed(true)} />
          ) : (
            <div className="lb-cover-fallback">
              <BookOpen size={34} />
              <span>{book.titulo}</span>
            </div>
          )}
          <span className="lb-cover-shine" aria-hidden="true" />
          {certified ? (
            <span className="lb-badge is-cert" title="Certificado conquistado">
              <Trophy size={13} /> Certificado
            </span>
          ) : progress >= 100 ? (
            <span className="lb-badge is-done">
              <Check size={13} /> Lido
            </span>
          ) : null}
          {progress > 0 && progress < 100 && (
            <span className="lb-cover-progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </span>
          )}
        </div>
        <div className="lb-copy">
          <span className="lb-level">{LEVEL[book.nivel_ensino] || book.nivel_ensino || 'Acervo digital'}</span>
          <h3>{book.titulo}</h3>
          <p>{book.autor || 'Autor não informado'}</p>
          {progress > 0 && progress < 100 && <small className="lb-progress-text">{progress}% lido</small>}
        </div>
      </Link>
      {isAdmin && onDelete && (
        <button type="button" className="lb-delete" aria-label={`Excluir ${book.titulo}`} onClick={() => onDelete(book.id)}>
          <Trash2 size={15} />
        </button>
      )}
    </article>
  );
}
