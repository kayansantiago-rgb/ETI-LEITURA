const initials = name =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

// Rosto do aluno: foto quando houver, senão as iniciais; com a moldura conquistada.
export default function Face({ url, name, frame, className = 'ws-avatar' }) {
  return <span className={`${className} face ${frame ? `av-frame ${frame}` : ''}`}>{url ? <img src={url} alt="" loading="lazy" /> : initials(name)}</span>;
}
