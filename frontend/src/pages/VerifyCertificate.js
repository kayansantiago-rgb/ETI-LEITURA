import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, BookOpen, CalendarDays, GraduationCap, Trophy, XCircle } from 'lucide-react';
import Brand from '@/components/Brand';
import OwlEmpty from '@/components/OwlEmpty';
import { Skeleton } from '@/components/Skeleton';
import api from '@/lib/api';

const date = v => (v ? new Date(v).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// Página pública aberta pelo QR code do certificado em PDF.
export default function VerifyCertificate() {
  const { code } = useParams();
  const [cert, setCert] = useState(undefined);

  useEffect(() => {
    api
      .get(`/certificates/verify/${encodeURIComponent(code)}`)
      .then(r => setCert(r.data))
      .catch(() => setCert(null));
  }, [code]);

  return (
    <main className="pv vc">
      <header className="pv-head">
        <Brand />
        <Link to="/login" className="pv-back">
          Conhecer a plataforma
        </Link>
      </header>
      <section className="pv-card vc-card">
        {cert === undefined ? (
          <Skeleton lines={4} height={18} />
        ) : cert ? (
          <>
            <span className="vc-ok">
              <BadgeCheck size={30} />
            </span>
            <p className="ws-eyebrow">Certificado autêntico</p>
            <h1>Leitura confirmada!</h1>
            <p className="vc-lead">
              Este certificado foi emitido pela ETI LEITURA para <b>{cert.aluno}</b>.
            </p>
            <ul className="vc-list">
              <li>
                <BookOpen size={17} />
                <span>
                  <small>Livro</small>
                  <strong>
                    {cert.livro}
                    {cert.autor ? ` — ${cert.autor}` : ''}
                  </strong>
                </span>
              </li>
              <li>
                <Trophy size={17} />
                <span>
                  <small>Questionário final</small>
                  <strong>{cert.percentual}% de acertos</strong>
                </span>
              </li>
              {cert.turma && (
                <li>
                  <GraduationCap size={17} />
                  <span>
                    <small>Turma</small>
                    <strong>{cert.turma}</strong>
                  </span>
                </li>
              )}
              <li>
                <CalendarDays size={17} />
                <span>
                  <small>Emitido em</small>
                  <strong>{date(cert.emitido_em)}</strong>
                </span>
              </li>
            </ul>
            <p className="vc-code">Código {cert.codigo}</p>
          </>
        ) : (
          <>
            <span className="vc-bad">
              <XCircle size={30} />
            </span>
            <OwlEmpty compact mood="search" bubble="Hmm…" title="Certificado não encontrado" text={`Não existe certificado com o código ${code}. Confira se o código foi digitado corretamente.`} />
          </>
        )}
      </section>
    </main>
  );
}
