import { useId } from 'react';

// Marca animada: livro aberto com uma página virando, estrela piscando e brilho passando.
export function LogoMark({ size = 44, animated = true }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`eti-logo ${animated ? 'is-animated' : ''}`} width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity=".45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x="2" y="2" width="76" height="76" rx="20" />
        </clipPath>
      </defs>
      <rect x="2" y="2" width="76" height="76" rx="20" fill={`url(#${id}-bg)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect className="eti-logo-shine" x="-40" y="-10" width="30" height="100" fill={`url(#${id}-shine)`} transform="rotate(20 40 40)" />
      </g>
      <path d="M40 24 C 32 19, 22 19, 15 22 V 58 C 22 55, 32 55, 40 60 Z" fill="#f5f3ff" />
      <path d="M40 24 C 48 19, 58 19, 65 22 V 58 C 58 55, 48 55, 40 60 Z" fill="#ffffff" />
      <path className="eti-logo-page" d="M40 24 C 48 19, 58 19, 65 22 V 58 C 58 55, 48 55, 40 60 Z" fill="#ede9fe" />
      <path d="M21 31 q 8 -2 14 1 M21 38 q 8 -2 14 1 M21 45 q 8 -2 14 1 M45 32 q 6 -3 14 -1 M45 39 q 6 -3 14 -1" stroke="#a78bfa" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M40 24 V 60" stroke="#c4b5fd" strokeWidth="1.6" />
      <path className="eti-logo-star" d="M63 9 Q64.2 13.8 69 15 Q64.2 16.2 63 21 Q61.8 16.2 57 15 Q61.8 13.8 63 9 Z" fill="#fde68a" />
      <path d="M17 66 h46" stroke="#f9a8d4" strokeWidth="3.5" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

export default function Brand({ light = false }) {
  return (
    <div className={`brand eti-brand ${light ? 'brand-light' : ''}`}>
      <LogoMark />
      <span>
        <strong>
          ETI <span>LEITURA</span>
        </strong>
        <small>LER, IMAGINAR, TRANSFORMAR</small>
      </span>
    </div>
  );
}
