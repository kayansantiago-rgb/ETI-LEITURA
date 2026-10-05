import { useEffect, useState } from 'react';
import { DatabaseBackup, Download, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const when = v => (v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const size = b => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Cópia de segurança: status do backup automático e download manual (só coordenação).
export default function BackupCard() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get('/admin/backup/status')
      .then(r => setStatus(r.data))
      .catch(() => setStatus({ ultimos: [] }));
  useEffect(() => {
    load();
  }, []);

  const download = async withFiles => {
    setBusy(true);
    try {
      const r = await api.get('/admin/backup', { params: { arquivos: withFiles ? 1 : 0 }, responseType: 'blob', timeout: 15 * 60 * 1000 });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eti-leitura-${new Date().toLocaleDateString('en-CA')}${withFiles ? '' : '-banco'}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success('Cópia de segurança baixada. Guarde em local seguro.');
      load();
    } catch (e) {
      toast.error(e.response?.status === 409 ? 'Já existe um backup sendo gerado. Tente em alguns minutos.' : 'Não foi possível gerar o backup.');
    } finally {
      setBusy(false);
    }
  };

  const last = status?.ultimos?.[0];
  const auto = status?.ultimos?.find(b => b.por === 'github');
  return (
    <section className="ws-card bk">
      <span className="bk-icon">
        <DatabaseBackup size={22} />
      </span>
      <div className="bk-copy">
        <h3>Cópia de segurança</h3>
        {status?.configurado ? (
          <p className="bk-ok">
            <ShieldCheck size={14} /> Backup automático ativo{auto ? ` · último em ${when(auto.criado_em)}` : ' · aguardando a primeira cópia'}
          </p>
        ) : status ? (
          <p className="bk-warn">
            <AlertTriangle size={14} /> Backup automático ainda não configurado (veja docs/BACKUP.md).
          </p>
        ) : (
          <p>Verificando…</p>
        )}
        {last && (
          <small>
            Última cópia: {when(last.criado_em)} · {last.documentos} registros · {size(last.tamanho)} {last.arquivos ? '· com PDFs' : '· só o banco'}
          </small>
        )}
      </div>
      <div className="bk-actions">
        <button type="button" onClick={() => download(false)} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Só o banco
        </button>
        <button type="button" className="is-primary" onClick={() => download(true)} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Completo (com PDFs)
        </button>
      </div>
    </section>
  );
}
