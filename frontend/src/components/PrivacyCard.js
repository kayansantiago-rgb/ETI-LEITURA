import { useEffect, useState } from 'react';
import { ShieldCheck, Download, Trash2, Undo2, Compass } from 'lucide-react';
import { confirmAction } from '@/components/ConfirmHost';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

// Direitos do titular (LGPD): baixar os dados, pedir exclusão e rever o tour.
export default function PrivacyCard() {
  const student = getUser()?.role === 'student';
  const [request, setRequest] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!student) return;
    api
      .get('/auth/me/deletion-request')
      .then(r => setRequest(r.data?.created_at ? r.data : null))
      .catch(() => {});
  }, [student]);

  const download = async () => {
    setBusy(true);
    try {
      const r = await api.get('/auth/me/export', { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meus-dados-eti-leitura.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Seus dados foram baixados.');
    } catch {
      toast.error('Não foi possível baixar os dados.');
    } finally {
      setBusy(false);
    }
  };

  const askDeletion = async () => {
    const ok = await confirmAction({
      title: 'Pedir exclusão da conta?',
      message: 'A coordenação vai receber o pedido. Depois de confirmado, sua conta e todo o histórico (leituras, atividades, notas e certificados) serão apagados.',
      confirmLabel: 'Enviar pedido'
    });
    if (!ok) return;
    setBusy(true);
    try {
      setRequest((await api.post('/auth/me/deletion-request', {})).data);
      toast.success('Pedido enviado à coordenação.');
    } catch {
      toast.error('Não foi possível enviar o pedido.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await api.delete('/auth/me/deletion-request');
      setRequest(null);
      toast.success('Pedido de exclusão cancelado.');
    } catch {
      toast.error('Não foi possível cancelar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ws-card pf-card pc">
      <h3>
        <ShieldCheck size={18} /> Privacidade e dados
      </h3>
      <p>Você controla seus dados. Saiba mais na <a href="/privacidade" target="_blank" rel="noreferrer">política de privacidade</a>.</p>
      <div className="pc-actions">
        <button type="button" onClick={download} disabled={busy}>
          <Download size={15} /> Baixar meus dados
        </button>
        <button type="button" onClick={() => window.dispatchEvent(new Event('eti-tour-open'))}>
          <Compass size={15} /> Rever o tour
        </button>
        {student &&
          (request ? (
            <button type="button" onClick={cancel} disabled={busy}>
              <Undo2 size={15} /> Cancelar pedido de exclusão
            </button>
          ) : (
            <button type="button" className="is-danger" onClick={askDeletion} disabled={busy}>
              <Trash2 size={15} /> Pedir exclusão da conta
            </button>
          ))}
      </div>
      {request && <p className="pc-pending">Pedido de exclusão enviado em {new Date(request.created_at).toLocaleDateString('pt-BR')}. A coordenação vai entrar em contato.</p>}
    </div>
  );
}
