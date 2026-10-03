import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Medal, Target, Sparkles, X } from 'lucide-react';
import { Owl } from '@/components/LoginScene';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

const COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6', '#fde047'];
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const key = id => `eti-celebrated:${id}`;
const read = id => {
  try {
    return JSON.parse(localStorage.getItem(key(id)));
  } catch {
    return null;
  }
};
const write = (id, value) => {
  try {
    localStorage.setItem(key(id), JSON.stringify(value));
  } catch {}
};

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 46 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2.2 + Math.random() * 1.6,
      rotate: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 7,
      round: Math.random() > 0.6
    }))
  ).current;
  return (
    <div className="cb-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? '50%' : 2,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--r': `${p.rotate}deg`
          }}
        />
      ))}
    </div>
  );
}

function CelebrationModal({ item, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const Icon = item.type === 'goal' ? Target : Medal;
  return createPortal(
    <div className="ws-overlay is-center cb-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <Confetti />
      <section className="cb" role="dialog" aria-modal="true" aria-labelledby="cb-title">
        <button type="button" className="cb-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <div className="cb-art" aria-hidden="true">
          <span className="cb-rays" />
          <span className="cb-owl">
            <Owl size={92} />
          </span>
          <span className={`cb-badge ${item.type === 'goal' ? 'is-goal' : ''}`}>
            <Icon size={22} />
          </span>
        </div>
        <p className="ws-eyebrow">{item.type === 'goal' ? 'Meta do dia batida!' : 'Nova medalha!'}</p>
        <h2 id="cb-title">{item.title}</h2>
        <p className="cb-text">{item.text}</p>
        {item.rewards?.length > 0 && (
          <p className="cb-rewards">
            <Sparkles size={15} /> Você liberou: <b>{item.rewards.join(', ')}</b>
          </p>
        )}
        <div className="cb-actions">
          {item.type === 'medal' ? (
            <Link to="/profile#conquistas" className="cb-secondary" onClick={onClose}>
              {item.rewards?.length ? 'Equipar no perfil' : 'Ver minhas conquistas'}
            </Link>
          ) : (
            <span />
          )}
          <button type="button" className="a11y-done" onClick={onClose}>
            {item.type === 'goal' ? 'Continuar lendo' : 'Uhuu!'}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

// Observa o progresso de leitura do aluno e comemora medalhas novas e a meta do dia.
export default function CelebrationWatcher() {
  const user = getUser();
  const student = user?.role === 'student';
  const [queue, setQueue] = useState([]);
  const busy = useRef(false);

  useEffect(() => {
    if (!student) return;
    let timer;
    const check = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const { data: stats } = await api.get('/reading/stats');
        const earned = stats.medalhas.filter(m => m.conquistada);
        const seen = read(user.id);
        const day = today();
        const goalDone = stats.meta_paginas > 0 && stats.paginas_hoje >= stats.meta_paginas;
        // Primeira vez neste aparelho: só registra o que já existe, sem festa atrasada.
        if (!seen) {
          write(user.id, { medals: earned.map(m => m.id), goalDay: goalDone ? day : null });
          return;
        }
        const fresh = earned.filter(m => !seen.medals.includes(m.id));
        const items = [];
        if (fresh.length) {
          let unlocked = [];
          try {
            const { data } = await api.get('/auth/me/rewards');
            unlocked = data.itens.filter(r => fresh.some(m => m.id === r.medalha)).map(r => r.nome);
          } catch {}
          fresh.forEach((m, i) => items.push({ type: 'medal', title: m.titulo, text: m.descricao + '. Que orgulho!', rewards: i === 0 ? unlocked : [] }));
        }
        if (goalDone && seen.goalDay !== day)
          items.push({ type: 'goal', title: `${stats.paginas_hoje} páginas hoje!`, text: `Você bateu a meta de ${stats.meta_paginas} páginas. Sua sequência agora é de ${stats.sequencia} dia${stats.sequencia === 1 ? '' : 's'}.` });
        write(user.id, { medals: earned.map(m => m.id), goalDay: goalDone ? day : seen.goalDay });
        if (items.length) setQueue(q => [...q, ...items]);
      } catch {
        // Sem internet ou servidor dormindo: tenta na próxima vez.
      } finally {
        busy.current = false;
      }
    };
    check();
    const onProgress = () => {
      clearTimeout(timer);
      timer = setTimeout(check, 4000);
    };
    window.addEventListener('eti-progress', onProgress);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('eti-progress', onProgress);
    };
  }, [student, user?.id]);

  if (!queue.length) return null;
  return <CelebrationModal key={queue.length} item={queue[0]} onClose={() => setQueue(q => q.slice(1))} />;
}
