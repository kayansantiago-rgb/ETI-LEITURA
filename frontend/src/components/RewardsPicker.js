import { useEffect, useState } from 'react';
import { Lock, Check, Sparkles, Crown } from 'lucide-react';
import { updateUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

const initials = name =>
  (name || 'E')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

// Molduras e títulos que o aluno libera conquistando medalhas de leitura.
export default function RewardsPicker({ user, medals = [], onChange }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const medalName = id => medals.find(m => m.id === id)?.titulo || 'uma medalha';

  useEffect(() => {
    api
      .get('/auth/me/rewards')
      .then(r => setData(r.data))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const choose = async (field, id) => {
    const next = { moldura: data.moldura, titulo: data.titulo, [field]: data[field] === id ? null : id };
    setBusy(true);
    try {
      const r = await api.put('/auth/me/style', next);
      setData(d => ({ ...d, ...next }));
      const patch = { moldura: r.data.moldura, titulo: r.data.titulo, titulo_nome: r.data.titulo_nome };
      updateUser(patch);
      onChange?.(patch);
      toast.success(next[field] ? 'Recompensa equipada!' : 'Recompensa removida.');
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };

  const frames = data.itens.filter(i => i.tipo === 'moldura');
  const titles = data.itens.filter(i => i.tipo === 'titulo');
  const unlocked = data.itens.filter(i => i.desbloqueada).length;
  const current = titles.find(t => t.id === data.titulo);

  return (
    <section className="ws-card rw" aria-label="Personalizar perfil">
      <header className="rw-head">
        <div>
          <h2>
            <Sparkles size={18} /> Personalize seu perfil
          </h2>
          <p>
            {unlocked} de {data.itens.length} recompensas liberadas. Conquiste medalhas lendo para liberar mais!
          </p>
        </div>
        <div className="rw-preview" aria-hidden="true">
          <span className={`rw-avatar ${data.moldura ? `av-frame ${data.moldura}` : ''}`}>{user.avatar_url ? <img src={user.avatar_url} alt="" /> : initials(user.nome)}</span>
          <span>
            <strong>{user.nome.split(' ')[0]}</strong>
            <small>{current ? current.nome : 'Sem título'}</small>
          </span>
        </div>
      </header>

      <h3 className="rw-label">Molduras</h3>
      <div className="rw-frames">
        {frames.map(f => (
          <button
            key={f.id}
            type="button"
            className={`rw-frame ${data.moldura === f.id ? 'is-on' : ''}`}
            disabled={!f.desbloqueada || busy}
            aria-pressed={data.moldura === f.id}
            onClick={() => choose('moldura', f.id)}
            title={f.desbloqueada ? f.nome : `Libere com a medalha "${medalName(f.medalha)}"`}
          >
            <span className={`rw-avatar av-frame ${f.id}`}>{f.desbloqueada ? initials(user.nome) : <Lock size={14} />}</span>
            <strong>{f.nome}</strong>
            <small>{f.desbloqueada ? (data.moldura === f.id ? 'Equipada' : 'Usar') : `Medalha: ${medalName(f.medalha)}`}</small>
            {data.moldura === f.id && (
              <i className="rw-check">
                <Check size={11} strokeWidth={3} />
              </i>
            )}
          </button>
        ))}
      </div>

      <h3 className="rw-label">Títulos</h3>
      <div className="rw-titles">
        {titles.map(t => (
          <button
            key={t.id}
            type="button"
            className={`rw-title ${data.titulo === t.id ? 'is-on' : ''}`}
            disabled={!t.desbloqueada || busy}
            aria-pressed={data.titulo === t.id}
            onClick={() => choose('titulo', t.id)}
            title={t.desbloqueada ? t.nome : `Libere com a medalha "${medalName(t.medalha)}"`}
          >
            {t.desbloqueada ? <Crown size={14} /> : <Lock size={13} />}
            <span>
              <strong>{t.nome}</strong>
              {!t.desbloqueada && <small>Medalha: {medalName(t.medalha)}</small>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
