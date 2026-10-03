import { useEffect, useRef, useState } from 'react';
import { Star, Zap, Flame, Target, ShieldCheck, Crown, Trophy, Medal, Lock } from 'lucide-react';
import { Owl } from '@/components/LoginScene';
import api from '@/lib/api';

const COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6', '#fde047'];

function useCountUp(target, ms = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 40 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.6, duration: 2 + Math.random() * 1.5, color: COLORS[i % COLORS.length], size: 6 + Math.random() * 6, r: Math.random() * 360 }))
  ).current;
  return (
    <div className="qv-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.5, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, '--r': `${p.r}deg` }} />
      ))}
    </div>
  );
}

const bestStreak = history => {
  let best = 0;
  let run = 0;
  history.forEach(h => {
    run = h?.acertou ? run + 1 : 0;
    best = Math.max(best, run);
  });
  return best;
};

/**
 * Tela de vitória do quiz: estrelas, XP com bônus, conquistas, posição na turma e próximo objetivo.
 * history: [{ acertou, esgotado, tempo (segundos gastos, opcional) }]
 */
export default function QuizVictory({ quizId, hits, total, history, seconds = 0, grade, max }) {
  const pct = total ? hits / total : 0;
  const stars = pct === 1 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
  const streak = bestStreak(history);
  const timeouts = history.filter(h => h?.esgotado).length;
  const fastest = history.filter(h => h?.acertou && h.tempo != null).reduce((m, h) => Math.min(m, h.tempo), Infinity);
  const speedBonus = seconds ? Math.round(history.reduce((s, h) => s + (h?.acertou && h.tempo != null ? Math.max(0, (1 - h.tempo / seconds) * 50) : 0), 0)) : 0;
  const parts = [
    ['Acertos', hits * 100],
    ['Sequência', streak >= 2 ? streak * 25 : 0],
    ['Velocidade', speedBonus],
    ['Estrelas', stars * 50]
  ].filter(([, v]) => v > 0);
  const xp = parts.reduce((s, [, v]) => s + v, 0);
  const shown = useCountUp(xp);
  const [rank, setRank] = useState(null);

  useEffect(() => {
    if (!quizId) return;
    api
      .get(`/quizzes/${quizId}/ranking`)
      .then(r => {
        const me = r.data.participantes.find(p => p.voce);
        if (me) setRank({ posicao: me.posicao, total: r.data.participantes.length });
      })
      .catch(() => {});
  }, [quizId]);

  const badges = [
    [Crown, 'Gabarito', 'Acertou todas', pct === 1],
    [Flame, `Em chamas`, 'Acertou 3 seguidas', streak >= 3],
    [Zap, 'Relâmpago', 'Acertou em menos de 5s', fastest <= 5, !seconds],
    [ShieldCheck, 'Sem vacilo', 'Respondeu tudo dentro do tempo', timeouts === 0 && history.length === total, !seconds],
    [Target, 'Na mosca', 'Acertou pelo menos 70%', pct >= 0.7]
  ].filter(([, , , , hide]) => !hide);
  const earned = badges.filter(b => b[3]).length;
  const needed = stars < 3 ? Math.ceil((stars === 0 ? 0.4 : stars === 1 ? 0.7 : 1) * total) - hits : 0;
  const title = stars === 3 ? 'Gabaritou! Você é fera!' : stars === 2 ? 'Mandou muito bem!' : stars === 1 ? 'Bom trabalho!' : 'Não desista, leitor!';

  return (
    <section className={`qv stars-${stars}`} aria-label="Resultado do desafio">
      {stars >= 2 && <Confetti />}
      <div className="qv-hero">
        <span className="qv-rays" aria-hidden="true" />
        <div className="qv-owl" aria-hidden="true">
          <Owl size={86} />
        </div>
        <div className="qv-stars" aria-label={`${stars} de 3 estrelas`}>
          {[0, 1, 2].map(i => (
            <Star key={i} size={i === 1 ? 46 : 36} className={i < stars ? 'is-on' : ''} style={{ animationDelay: `${0.3 + i * 0.25}s` }} fill="currentColor" />
          ))}
        </div>
        <h2>{title}</h2>
        <p>
          <b>{hits}</b> de {total} acertos{grade != null ? ` · nota ${Number(grade).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de ${max}` : ''}
        </p>
      </div>

      <div className="qv-grid">
        <div className="qv-card qv-xp">
          <span className="qv-label">XP ganho</span>
          <strong>
            +{shown}
            <small> XP</small>
          </strong>
          <div className="qv-parts">
            {parts.map(([label, value]) => (
              <span key={label}>
                {label} <b>+{value}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="qv-card qv-rank">
          <span className="qv-label">Na turma</span>
          {rank ? (
            <>
              <strong>
                {rank.posicao <= 3 ? <Medal size={26} className={`is-${rank.posicao}`} /> : <Trophy size={24} />} {rank.posicao}º
                <small> de {rank.total}</small>
              </strong>
              <span>{rank.posicao === 1 ? 'Você lidera este desafio! 👑' : rank.posicao <= 3 ? 'Você está no pódio!' : 'Continue treinando para subir!'}</span>
            </>
          ) : (
            <>
              <strong>
                <Trophy size={24} /> —
              </strong>
              <span>Ranking sendo atualizado…</span>
            </>
          )}
        </div>
      </div>

      <div className="qv-badges">
        <span className="qv-label">
          Conquistas · {earned} de {badges.length}
        </span>
        <div>
          {badges.map(([Icon, name, desc, ok], i) => (
            <span key={name} className={`qv-badge ${ok ? 'is-on' : ''}`} style={{ animationDelay: `${0.8 + i * 0.12}s` }} title={desc}>
              <i>{ok ? <Icon size={18} /> : <Lock size={14} />}</i>
              <b>{name}</b>
              <small>{desc}</small>
            </span>
          ))}
        </div>
      </div>

      {needed > 0 && (
        <p className="qv-goal">
          <Target size={16} /> Faltou <b>{needed}</b> acerto{needed > 1 ? 's' : ''} para {stars === 2 ? 'a 3ª estrela' : stars === 1 ? 'a 2ª estrela' : 'a 1ª estrela'}. No próximo você consegue!
        </p>
      )}
    </section>
  );
}
