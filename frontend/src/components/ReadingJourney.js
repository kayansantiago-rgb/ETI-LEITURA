import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Target, Pencil, Check, ArrowRight, BookOpen, Trophy, Footprints, Award, Medal, Infinity as InfinityIcon, Library, Star } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const WEEKDAY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_NAME = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const days = n => `${n} ${n === 1 ? 'dia' : 'dias'}`;
export const MEDAL_ICONS = {
  'primeira-pagina': Footprints,
  'sequencia-3': Flame,
  'sequencia-7': Flame,
  'sequencia-30': InfinityIcon,
  'livro-1': BookOpen,
  'livro-5': Library,
  'paginas-500': Star,
  'certificado-1': Award,
  'certificado-3': Trophy
};

export function useReadingStats() {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);
  const load = () =>
    api
      .get('/reading/stats')
      .then(r => setStats(r.data))
      .catch(() => setFailed(true));
  useEffect(() => {
    load();
  }, []);
  return [stats, setStats, failed];
}

export function MedalGrid({ medals, compact = false }) {
  const list = compact ? [...medals].sort((a, b) => Number(b.conquistada) - Number(a.conquistada)).slice(0, 5) : medals;
  return (
    <ul className={`rj-medals ${compact ? 'is-compact' : ''}`}>
      {list.map(m => {
        const Icon = MEDAL_ICONS[m.id] || Medal;
        return (
          <li key={m.id} className={m.conquistada ? 'is-earned' : ''} title={`${m.titulo}: ${m.descricao}`}>
            <span className="rj-medal-icon">
              <Icon size={compact ? 18 : 22} />
            </span>
            {!compact && (
              <>
                <strong>{m.titulo}</strong>
                <small>{m.descricao}</small>
                {!m.conquistada && (
                  <span className="rj-medal-progress">
                    <span className="ws-meter">
                      <span style={{ width: `${(m.atual / m.meta) * 100}%` }} />
                    </span>
                    <b>
                      {m.atual}/{m.meta}
                    </b>
                  </span>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Cartão da página inicial: sequência de dias, meta diária e medalhas.
export default function ReadingJourney() {
  const [stats, setStats] = useReadingStats();
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(10);

  if (!stats) return null;

  const done = Math.min(1, stats.paginas_hoje / stats.meta_paginas);
  const r = 34;
  const c = 2 * Math.PI * r;
  const earned = stats.medalhas.filter(m => m.conquistada).length;
  const next = stats.medalhas.find(m => !m.conquistada);
  const maxWeek = Math.max(stats.meta_paginas, ...stats.semana.map(d => d.paginas));

  const saveGoal = async e => {
    e.preventDefault();
    try {
      const value = Math.min(200, Math.max(1, Number(goal) || 1));
      await api.put('/reading/goal', { paginas_dia: value });
      setStats(s => ({ ...s, meta_paginas: value }));
      setEditing(false);
      toast.success(`Meta atualizada: ${value} páginas por dia.`);
    } catch {
      toast.error('Não foi possível salvar a meta.');
    }
  };

  return (
    <section className="rj" aria-label="Minha jornada de leitura">
      <div className="rj-streak">
        <span className={`rj-flame ${stats.sequencia ? 'is-on' : ''}`}>
          <Flame size={30} />
        </span>
        <div>
          <strong>
            {stats.sequencia} {stats.sequencia === 1 ? 'dia' : 'dias'}
          </strong>
          <span>{stats.sequencia ? 'seguidos lendo' : 'Leia hoje para começar sua sequência'}</span>
          <small>Melhor sequência: {days(stats.melhor_sequencia)}</small>
        </div>
      </div>

      <div className="rj-week" aria-label="Páginas lidas nos últimos 7 dias">
        {stats.semana.map(d => {
          const day = new Date(d.dia + 'T12:00:00');
          const isToday = d.dia === stats.semana[stats.semana.length - 1].dia;
          return (
            <div key={d.dia} className={`${d.paginas ? 'is-read' : ''} ${isToday ? 'is-today' : ''}`} title={`${isToday ? 'Hoje' : WEEKDAY_NAME[day.getDay()]}: ${d.paginas} página(s)`}>
              <span className="rj-bar">
                <span style={{ height: `${Math.max(d.paginas ? 12 : 0, (d.paginas / maxWeek) * 100)}%` }} />
              </span>
              <small>{WEEKDAY[day.getDay()]}</small>
            </div>
          );
        })}
      </div>

      <div className="rj-goal">
        <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
          <circle cx="42" cy="42" r={r} className="rj-goal-track" />
          <circle cx="42" cy="42" r={r} className="rj-goal-value" strokeDasharray={c} strokeDashoffset={c * (1 - done)} />
        </svg>
        <div className="rj-goal-center">{done >= 1 ? <Check size={22} /> : <b>{stats.paginas_hoje}</b>}</div>
        <div className="rj-goal-copy">
          <span>
            <Target size={13} /> Meta de hoje
          </span>
          {editing ? (
            <form onSubmit={saveGoal} className="rj-goal-form">
              <input type="number" min="1" max="200" value={goal} onChange={e => setGoal(e.target.value)} aria-label="Páginas por dia" autoFocus />
              <button type="submit" aria-label="Salvar meta">
                <Check size={14} />
              </button>
            </form>
          ) : (
            <strong>
              {stats.paginas_hoje} {stats.paginas_hoje === 1 ? 'página' : 'páginas'} hoje
              <button
                type="button"
                aria-label="Alterar meta diária"
                onClick={() => {
                  setGoal(stats.meta_paginas);
                  setEditing(true);
                }}
              >
                <Pencil size={12} />
              </button>
            </strong>
          )}
          <small>
            Meta: {stats.meta_paginas} por dia
            {done >= 1 ? ' · cumprida! 🎉' : ` · faltam ${stats.meta_paginas - stats.paginas_hoje}`}
          </small>
        </div>
      </div>

      <div className="rj-badges">
        <div className="rj-badges-head">
          <span>
            Medalhas <b>{earned}</b>/{stats.medalhas.length}
          </span>
          <Link to="/profile#conquistas">
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>
        <MedalGrid medals={stats.medalhas} compact />
        {next && (
          <p className="rj-next">
            Próxima: <b>{next.titulo}</b> · {next.atual}/{next.meta}
          </p>
        )}
      </div>
    </section>
  );
}
