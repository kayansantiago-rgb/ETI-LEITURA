import { useState } from 'react';
import { Info } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import ClassRanking from '@/components/ClassRanking';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';

export default function Ranking() {
  const user = getUser();
  const student = user?.role === 'student';
  const classes = TURMAS.filter(t => user?.role === 'admin' || user?.turmas?.includes(t.value));
  const [turma, setTurma] = useState(student ? '' : classes[0]?.value || '');

  return (
    <DashboardLayout>
      <PageIntro
        section="LEITURA / RANKING"
        title={student ? `Leitores do ${user.turma || 'turma'}` : 'Ranking de leitores'}
        description="Quem mais leu na turma: livros concluídos, certificados conquistados e páginas lidas no último mês."
      >
        {!student && (
          <select aria-label="Escolher turma" className="rp-select" value={turma} onChange={e => setTurma(e.target.value)}>
            {classes.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        )}
      </PageIntro>
      <div className="rk-page">
        <ClassRanking turma={turma || undefined} />
        <aside className="ws-card rk-rules">
          <h2>
            <Info size={16} /> Como funciona
          </h2>
          <ul>
            <li>
              <b>100 pontos</b> por livro concluído no leitor
            </li>
            <li>
              <b>50 pontos</b> por certificado de leitura
            </li>
            <li>
              <b>1 ponto</b> por página avançada nos últimos 30 dias
            </li>
          </ul>
          <p>A sequência mostra quantos dias seguidos cada leitor abriu um livro. Pontuações iguais ficam empatadas.</p>
        </aside>
      </div>
    </DashboardLayout>
  );
}
