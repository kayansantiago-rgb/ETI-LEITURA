import { useEffect, useState } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

export default function QuizRanking({ quizId }) {
  const [data, setData] = useState(null), [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true, timer;
    const refresh = async () => {
      try {
        const response = await api.get(`/quizzes/${quizId}/ranking`);
        if (!active) return;
        setData(response.data); setError(false);
        if (!response.data.encerrado) timer = setTimeout(refresh, 15000);
      } catch { if (active) setError(true); }
    };
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [quizId, retry]);
  return <section className="qz-ranking" aria-label="Ranking da turma">
    <header><span className="qz-ranking-icon"><Trophy size={20}/></span><div><h3>Ranking da turma</h3><p>{data?.encerrado ? 'Resultado final do desafio' : 'Atualiza a cada 15 segundos enquanto o quiz estiver aberto.'}</p></div>{data && <span className="ws-chip">{data.participantes.length} participantes</span>}</header>
    {error && <p role="alert" className="qz-ranking-note">Não foi possível atualizar o ranking. <button className="underline inline-flex items-center gap-1" onClick={()=>setRetry(v=>v+1)}><RefreshCw size={13}/> Tentar novamente</button></p>}
    {!data && !error && <p role="status" className="qz-ranking-note">Preparando a classificação…</p>}
    {data && <ol className="qz-leaderboard">{data.participantes.map((r,i)=><li key={i} className={`${r.voce?'is-you':''} ${r.posicao<=3?`is-top is-top-${r.posicao}`:''}`}><span className="qz-pos">{r.posicao}º</span><span className="qz-lb-name"><strong>{r.nome}{r.voce && <em>Você</em>}</strong><span className="ws-meter"><span style={{width:`${r.total?(r.acertos/r.total)*100:0}%`}}/></span></span><span className="qz-lb-score"><strong>{r.acertos}/{r.total}</strong><small>acertos</small></span></li>)}</ol>}
    {data && !data.participantes.length && <p className="qz-ranking-note">Aguardando os primeiros resultados.</p>}
    <p className="qz-ranking-note">Mais acertos, melhor posição. Pontuações iguais ficam empatadas.</p>
  </section>;
}
