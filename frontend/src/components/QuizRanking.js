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
  return <section className="quiz-ranking" aria-label="Ranking da turma">
    <div className="quiz-ranking-title"><Trophy size={30}/><div><h3>Ranking da turma</h3><p>{data?.encerrado ? 'Resultado final do desafio' : 'A competição continua: o ranking se atualiza a cada 15 segundos.'}</p></div></div>
    <p>Mais acertos, melhor posição. Pontuações iguais ficam empatadas.</p>
    {error && <p role="alert">Não foi possível atualizar o ranking. <button onClick={()=>setRetry(v=>v+1)}><RefreshCw size={14}/> Tentar novamente</button></p>}
    {!data && !error && <p role="status">Preparando a classificação…</p>}
    {data && <><span className="quiz-ranking-count">{data.participantes.length} participantes concluíram</span><ol>{data.participantes.map((r,i)=><li key={i} className={`${r.voce?'is-you':''} ${r.posicao<=3?'is-podium':''}`}><span className="quiz-rank-position">{r.posicao}º</span><span className="quiz-rank-name">{r.nome}{r.voce && <b>Você</b>}</span><strong>{r.acertos}<small> / {r.total} acertos</small></strong></li>)}</ol>{!data.participantes.length&&<p>Aguardando os primeiros resultados.</p>}</>}
  </section>;
}
