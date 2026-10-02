// Formas cinzas animadas no lugar do conteúdo enquanto ele carrega.
export function Skeleton({ width = '100%', height = 14, radius = 10, lines = 1, className = '' }) {
  return (
    <span className={`sk-group ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="sk" style={{ width: lines > 1 && i === lines - 1 && width === '100%' ? '70%' : width, height, borderRadius: radius }} />
      ))}
    </span>
  );
}

// Página genérica carregando: título, linha de cartões e lista.
export function PageSkeleton({ cards = 3, rows = 4, label = 'Carregando…' }) {
  return (
    <div className="sk-page" role="status" aria-label={label}>
      {cards > 0 && (
        <div className="sk-cards">
          {Array.from({ length: cards }, (_, i) => (
            <span key={i} className="sk sk-card" />
          ))}
        </div>
      )}
      {rows > 0 && (
      <div className="ws-card sk-rows">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="sk-row">
            <span className="sk sk-avatar" />
            <span className="sk-row-lines">
              <span className="sk" style={{ width: `${60 - i * 7}%`, height: 12 }} />
              <span className="sk" style={{ width: `${35 + i * 5}%`, height: 10 }} />
            </span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
