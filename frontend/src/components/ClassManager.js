import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Users, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { loadTurmas } from '@/constants/turmas';
import { confirmAction } from '@/components/ConfirmHost';

const LEVELS = [
  ['MÉDIO', 'Ensino Médio'],
  ['FUNDAMENTAL', 'Ensino Fundamental'],
  ['AMBOS', 'Outro / não se aplica']
];
const detail = e => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : null);

// Coordenação: criar e excluir turmas da escola.
export default function ClassManager({ onClose }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ nome: '', nivel: 'MÉDIO' });
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get('/admin/classes')
      .then(r => setList(r.data))
      .catch(() => toast.error('Não foi possível carregar as turmas.'));

  useEffect(() => {
    load();
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const create = async e => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error('Digite o nome da turma.');
    setBusy(true);
    try {
      const { data } = await api.post('/admin/classes', form);
      toast.success(`Turma ${data.value} criada.`);
      setForm(f => ({ ...f, nome: '' }));
      await Promise.all([load(), loadTurmas()]);
    } catch (err) {
      toast.error(detail(err) || 'Não foi possível criar a turma.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async item => {
    const ok = await confirmAction({
      title: `Excluir ${item.value}?`,
      message: item.professores
        ? `A turma sai da lista e dos professores vinculados (${item.professores}). Atividades e notas antigas continuam guardadas.`
        : 'A turma sai da lista. Atividades e notas antigas continuam guardadas.',
      confirmLabel: 'Excluir turma'
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.delete('/admin/classes/' + encodeURIComponent(item.value));
      toast.success(`Turma ${item.value} excluída.`);
      await Promise.all([load(), loadTurmas()]);
    } catch (err) {
      toast.error(detail(err) || 'Não foi possível excluir a turma.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="vd-form cm" role="dialog" aria-modal="true" aria-label="Gerenciar turmas">
        <header>
          <div>
            <p className="ws-eyebrow">Coordenação</p>
            <h2>Gerenciar turmas</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="vd-form-body">
          <form className="cm-new" onSubmit={create}>
            <label>
              <span>Nova turma</span>
              <input
                value={form.nome}
                maxLength={40}
                placeholder="Ex.: 1º SÉRIE C"
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                disabled={busy}
              />
            </label>
            <label>
              <span>Etapa</span>
              <select value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} disabled={busy}>
                {LEVELS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="a11y-done cm-add" disabled={busy}>
              <Plus size={16} /> Criar
            </button>
          </form>

          {!list ? (
            <p className="cm-empty">Carregando turmas…</p>
          ) : (
            <ul className="cm-list">
              {list.map(item => (
                <li key={item.value}>
                  <span className="cm-icon">
                    <GraduationCap size={17} />
                  </span>
                  <div className="cm-copy">
                    <strong>{item.value}</strong>
                    <small>
                      {item.label.split(' - ')[1] || 'Sem etapa'} · <Users size={12} /> {item.alunos} aluno{item.alunos === 1 ? '' : 's'} · {item.professores} professor{item.professores === 1 ? '' : 'es'}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="ws-icon-btn is-danger"
                    disabled={busy || item.alunos > 0}
                    onClick={() => remove(item)}
                    title={item.alunos > 0 ? 'Mude os alunos de turma antes de excluir' : 'Excluir turma'}
                    aria-label={`Excluir ${item.value}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="cm-note">Só dá para excluir turmas sem alunos. Para esvaziar uma turma, abra a turma, clique no nome do aluno e use “Mudar turma”.</p>
        </div>
      </section>
    </div>,
    document.body
  );
}
