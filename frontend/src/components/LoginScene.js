import { Flame, Trophy, BookOpen } from 'lucide-react';

const STARS = [
  [40, 60, 1], [150, 30, 0.8], [250, 70, 1.2], [300, 20, 0.7], [470, 95, 0.9],
  [545, 150, 0.8], [20, 200, 0.7], [210, 160, 0.6], [520, 250, 1], [90, 130, 0.9]
];

function Star({ x, y, s, delay }) {
  return (
    <path
      className="sp-twinkle"
      style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
      d={`M${x} ${y - 7 * s} Q${x + 1.4 * s} ${y - 1.4 * s} ${x + 7 * s} ${y} Q${x + 1.4 * s} ${y + 1.4 * s} ${x} ${y + 7 * s} Q${x - 1.4 * s} ${y + 1.4 * s} ${x - 7 * s} ${y} Q${x - 1.4 * s} ${y - 1.4 * s} ${x} ${y - 7 * s}Z`}
      fill="#fde68a"
    />
  );
}

// Coruja leitora: mascote da cena, com capelo de formatura (coordenadas da cena).
function OwlShapes() {
  return (
    <>
<ellipse cx="96" cy="296" rx="16" ry="34" fill="#6d28d9" transform="rotate(14 96 296)" />
      <ellipse cx="164" cy="296" rx="16" ry="34" fill="#6d28d9" transform="rotate(-14 164 296)" />
      <ellipse cx="130" cy="288" rx="46" ry="54" fill="#8b5cf6" />
      <ellipse cx="130" cy="308" rx="30" ry="32" fill="#ede9fe" />
      <path d="M118 300 l6 6 l6 -6 l6 6 l6 -6 M118 314 l6 6 l6 -6 l6 6 l6 -6" stroke="#c4b5fd" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="112" cy="262" r="16" fill="#fff" />
      <circle cx="148" cy="262" r="16" fill="#fff" />
      <circle cx="114" cy="264" r="7.5" fill="#1e1b4b" />
      <circle cx="146" cy="264" r="7.5" fill="#1e1b4b" />
      <circle cx="116.5" cy="261" r="2.4" fill="#fff" />
      <circle cx="148.5" cy="261" r="2.4" fill="#fff" />
      <g className="sp-blink">
        <rect x="95" y="245" width="34" height="18" rx="8" fill="#8b5cf6" />
        <rect x="131" y="245" width="34" height="18" rx="8" fill="#8b5cf6" />
      </g>
      <path d="M124 279 L136 279 L130 291 Z" fill="#f59e0b" />
      <ellipse cx="116" cy="341" rx="9" ry="4" fill="#f59e0b" />
      <ellipse cx="144" cy="341" rx="9" ry="4" fill="#f59e0b" />
      <rect x="110" y="224" width="40" height="12" rx="3" fill="#1e1b4b" />
      <path d="M86 220 L130 202 L174 220 L130 238 Z" fill="#312e81" />
      <path d="M130 220 L166 226 L166 246" stroke="#fbbf24" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="166" cy="249" r="4.5" fill="#fbbf24" />
    </>
  );
}

export function Owl({ size = 120, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="80 196 100 150" aria-hidden="true">
      <OwlShapes />
    </svg>
  );
}

export default function LoginScene() {
  return (
    <div className="lg-scene" aria-hidden="true">
      <svg className="lg-svg" viewBox="0 0 580 470">
        <defs>
          <radialGradient id="lg-glow" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity=".75" />
            <stop offset="45%" stopColor="#c084fc" stopOpacity=".28" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lg-planet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient id="lg-page" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ede9fe" />
          </linearGradient>
        </defs>

        {STARS.map(([x, y, s], i) => (
          <Star key={i} x={x} y={y} s={s} delay={(i % 5) * 0.6} />
        ))}

        {/* Lua */}
        <path d="M520 26 a24 24 0 1 0 0 48 a18 18 0 1 1 0 -48 Z" fill="#fde68a" className="sp-float-slow" />

        {/* Avião de papel com rastro */}
        <g className="sp-plane">
          <path d="M70 110 C 120 70, 170 120, 222 82" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2" strokeDasharray="5 7" fill="none" />
          <path d="M222 82 L258 66 L240 96 Z" fill="#ffffff" />
          <path d="M222 82 L240 96 L236 84 Z" fill="#c4b5fd" />
        </g>

        {/* Brilho saindo do livro */}
        <ellipse cx="400" cy="250" rx="170" ry="150" fill="url(#lg-glow)" className="sp-pulse" />

        {/* Castelo: histórias de fantasia */}
        <g className="sp-float" style={{ animationDelay: '-1.2s' }}>
          <rect x="372" y="96" width="56" height="44" fill="#a78bfa" rx="3" />
          <rect x="362" y="80" width="18" height="60" fill="#8b5cf6" rx="2" />
          <rect x="420" y="80" width="18" height="60" fill="#8b5cf6" rx="2" />
          <path d="M362 80 l9 -16 l9 16 Z M420 80 l9 -16 l9 16 Z" fill="#f472b6" />
          <path d="M392 140 v-18 a8 8 0 0 1 16 0 v18 Z" fill="#4c1d95" />
          <rect x="378" y="104" width="7" height="9" rx="3" fill="#fde68a" />
          <rect x="415" y="104" width="7" height="9" rx="3" fill="#fde68a" />
          <path d="M400 96 v-26 l16 7 l-16 6" stroke="#fff" strokeWidth="1.6" fill="#fbbf24" />
        </g>

        {/* Foguete: ciência e aventura */}
        <g className="sp-float" style={{ animationDelay: '-2.4s' }}>
          <g transform="translate(300 175) rotate(32)">
            <ellipse className="sp-flame" cx="0" cy="34" rx="7" ry="13" fill="#fb923c" />
            <path d="M-12 14 L-20 30 L-8 24 Z M12 14 L20 30 L8 24 Z" fill="#f43f5e" />
            <path d="M0 -32 C 14 -18, 13 10, 10 26 L-10 26 C -13 10, -14 -18, 0 -32 Z" fill="#ffffff" />
            <circle cx="0" cy="-4" r="6" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="2" />
          </g>
        </g>

        {/* Planeta */}
        <g className="sp-float" style={{ animationDelay: '-0.6s' }}>
          <circle cx="492" cy="190" r="24" fill="url(#lg-planet)" />
          <ellipse cx="492" cy="190" rx="42" ry="10" fill="none" stroke="#fde68a" strokeWidth="3" transform="rotate(-18 492 190)" />
          <circle cx="484" cy="182" r="4" fill="#ffffff" fillOpacity=".35" />
        </g>

        {/* Letras subindo das páginas */}
        <text x="352" y="250" className="sp-rise lg-letter" style={{ animationDelay: '0s' }}>A</text>
        <text x="420" y="240" className="sp-rise lg-letter" style={{ animationDelay: '1.3s' }}>?</text>
        <text x="392" y="262" className="sp-rise lg-letter is-small" style={{ animationDelay: '2.4s' }}>Z</text>
        <text x="448" y="262" className="sp-rise lg-letter is-small" style={{ animationDelay: '3.2s' }}>!</text>

        {/* Livro aberto */}
        <g>
          <path d="M400 392 C 352 368, 300 370, 258 382 L 258 304 C 300 292, 352 294, 400 318 C 448 294, 500 292, 542 304 L 542 382 C 500 370, 448 368, 400 392 Z" fill="#6d28d9" transform="translate(0 8)" />
          <path d="M400 384 C 354 360, 304 362, 266 374 L 266 300 C 304 288, 354 290, 400 314 Z" fill="url(#lg-page)" />
          <path d="M400 384 C 446 360, 496 362, 534 374 L 534 300 C 496 288, 446 290, 400 314 Z" fill="url(#lg-page)" />
          <path d="M400 314 V 384" stroke="#c4b5fd" strokeWidth="2" />
          {[0, 1, 2, 3].map(i => (
            <g key={i} stroke="#c4b5fd" strokeWidth="2.2" strokeLinecap="round" fill="none">
              <path d={`M284 ${318 + i * 14} C 318 ${308 + i * 14}, 352 ${310 + i * 14}, 384 ${324 + i * 14}`} />
              <path d={`M416 ${324 + i * 14} C 448 ${310 + i * 14}, 482 ${308 + i * 14}, ${i === 3 ? 470 : 516} ${318 + i * 14}`} />
            </g>
          ))}
        </g>

        {/* Pilha de livros */}
        <g>
          <rect x="44" y="394" width="176" height="30" rx="6" fill="#fbbf24" />
          <rect x="196" y="398" width="18" height="22" rx="3" fill="#fef3c7" />
          <rect x="62" y="402" width="40" height="5" rx="2.5" fill="#b45309" fillOpacity=".5" />
          <rect x="58" y="366" width="152" height="28" rx="6" fill="#2dd4bf" />
          <rect x="186" y="370" width="18" height="20" rx="3" fill="#ccfbf1" />
          <rect x="74" y="374" width="34" height="5" rx="2.5" fill="#0f766e" fillOpacity=".5" />
          <rect x="50" y="338" width="164" height="28" rx="6" fill="#f472b6" />
          <rect x="190" y="342" width="18" height="20" rx="3" fill="#fce7f3" />
          <rect x="66" y="346" width="46" height="5" rx="2.5" fill="#9d174d" fillOpacity=".45" />
        </g>
        <g className="sp-owl">
          <OwlShapes />
        </g>
        <ellipse cx="300" cy="440" rx="270" ry="14" fill="#000" fillOpacity=".18" />
      </svg>

      <div className="lg-chip is-streak">
        <span>
          <Flame size={16} />
        </span>
        <div>
          <strong>7 dias seguidos</strong>
          <small>lendo todos os dias</small>
        </div>
      </div>
      <div className="lg-chip is-cert">
        <span>
          <Trophy size={16} />
        </span>
        <div>
          <strong>Certificado!</strong>
          <small>O Pequeno Príncipe</small>
        </div>
      </div>
      <div className="lg-chip is-page">
        <span>
          <BookOpen size={16} />
        </span>
        <div>
          <strong>Página 42 de 96</strong>
          <span className="lg-chip-bar">
            <i />
          </span>
        </div>
      </div>
    </div>
  );
}
