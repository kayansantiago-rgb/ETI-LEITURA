import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Download, BookOpen } from 'lucide-react';
import { downloadCertificate } from '@/pages/BookQuiz';
import api from '@/lib/api';
import { toast } from 'sonner';

// Estante com os certificados de leitura conquistados pelo aluno.
export default function CertificateShelf() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api
      .get('/certificates')
      .then(r => setItems(r.data))
      .catch(() => setItems([]));
  }, []);

  const download = async cert => {
    setBusy(cert.book_id);
    try {
      await downloadCertificate(cert.book_id, cert.book_titulo);
    } catch {
      toast.error('Não foi possível gerar o certificado agora.');
    } finally {
      setBusy('');
    }
  };

  if (!items) return null;

  return (
    <section className="cs" aria-label="Meus certificados">
      <header>
        <h2>
          <Trophy size={18} /> Meus certificados <span>{items.length}</span>
        </h2>
      </header>
      {!items.length ? (
        <div className="cs-empty">
          <BookOpen size={26} />
          <p>Termine um livro e acerte 70% do questionário final para ganhar seu primeiro certificado.</p>
          <Link to="/library">Escolher um livro</Link>
        </div>
      ) : (
        <div className="cs-shelf">
          {items.map(c => (
            <article key={c.codigo} className="cs-cert">
              <span className="cs-ribbon">
                <Trophy size={16} />
              </span>
              <small>Certificado de leitura</small>
              <strong>{c.book_titulo}</strong>
              <span className="cs-meta">
                {c.percentual}% de acertos · {new Date(c.emitido_em).toLocaleDateString('pt-BR')}
              </span>
              <button type="button" disabled={busy === c.book_id} onClick={() => download(c)}>
                <Download size={14} /> {busy === c.book_id ? 'Gerando…' : 'Baixar PDF'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
