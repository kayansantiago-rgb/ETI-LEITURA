import { useEffect, useState } from 'react';
import { PageSkeleton } from '@/components/Skeleton';
import { Link } from 'react-router-dom';
import { Trophy, Flame, BookOpen, Award, ArrowRight } from 'lucide-react';
import api from '@/lib/api';

const initials = name =>
  (name || 'A')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

// Ranking de leitores: livros concluídos valem 100 pontos, certificados 50 e cada página do mês 1.
export default function ClassRanking({ turma, limit, compact = false }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    api
      .get('/reading/ranking', { params: turma ? { turma } : {} })
      .then(r => setData(r.data))
      .catch(() => setFailed(true));
  }, [turma]);

  if (failed) return <div className="ws-card ws-empty">Não foi possível carregar o ranking.</div>;
  if (!data)
    return (
      <PageSkeleton cards={0} rows={5} label="Carregando ranking…" />
    );

  const rows = data.alunos;
  const me = rows.find(r => r.voce);
  const shown = limit ? rows.slice(0, limit) : rows;
  const podium = !compact && rows.length >= 3 && rows[0].pontos > 0 ? rows.slice(0, 3) : [];
  const list = podium.length ? shown.slice(3) : shown;

  return (
    <section className={`rk ${compact ? 'is-compact' : ''}`} aria-label={`Ranking de leitores da turma ${data.turma}`}>
      {compact && (
        <header className="rk-head">
          <h2>
            <Trophy size={18} /> Leitores da turma
          </h2>
          <Link to="/ranking">
            Ver ranking <ArrowRight size={13} />
          </Link>
        </header>
      )}

      {!rows.length ? (
        <div className="ws-empty">Nenhum aluno nesta turma ainda.</div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="rk-podium">
              {[podium[1], podium[0], podium[2]].map((r, i) => (
                <div key={r.nome} className={`rk-step is-${[2, 1, 3][i]} ${r.voce ? 'is-you' : ''}`}>
                  <span className={`rk-avatar ${r.moldura ? `av-frame ${r.moldura}` : ''}`}>{r.avatar_url ? <img src={r.avatar_url} alt="" /> : initials(r.nome)}</span>
                  <strong>{r.nome.split(' ').slice(0, 2).join(' ')}</strong>
                  {r.titulo && <em className="rk-title">{r.titulo}</em>}
                  <small>{r.pontos} pts</small>
                  <span className="rk-block">{r.posicao}º</span>
                </div>
              ))}
            </div>
          )}
          <ol className="rk-list">
            {list.map(r => (
              <li key={r.nome} className={r.voce ? 'is-you' : ''}>
                <span className={`rk-pos ${r.posicao <= 3 ? `is-top-${r.posicao}` : ''}`}>{r.posicao}º</span>
                <span className={`rk-avatar is-sm ${r.moldura ? `av-frame ${r.moldura}` : ''}`}>{r.avatar_url ? <img src={r.avatar_url} alt="" /> : initials(r.nome)}</span>
                <span className="rk-name">
                  <strong>
                    {r.nome}
                    {r.voce && <em>Você</em>}
                  </strong>
                  {r.titulo && <span className="rk-title">✦ {r.titulo}</span>}
                  {!compact && (
                    <small>
                      <span>
                        <BookOpen size={12} /> {r.livros} livro(s)
                      </span>
                      <span>
                        <Award size={12} /> {r.certificados} certificado(s)
                      </span>
                      <span>
                        <Flame size={12} /> {r.sequencia} dia(s)
                      </span>
                      <span>{r.paginas_mes} páginas no mês</span>
                    </small>
                  )}
                </span>
                <b className="rk-points">{r.pontos}</b>
              </li>
            ))}
          </ol>
          {compact && me && me.posicao > (limit || 0) && (
            <p className="rk-me">
              Você está em <b>{me.posicao}º</b> com {me.pontos} pontos.
            </p>
          )}
        </>
      )}
    </section>
  );
}
