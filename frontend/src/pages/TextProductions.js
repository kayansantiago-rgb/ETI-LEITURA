import { useEffect, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import WritingDesk from '@/components/WritingDesk';
import WritingList from '@/components/WritingList';
import OwlEmpty from '@/components/OwlEmpty';
import { PageSkeleton } from '@/components/Skeleton';
import { confirmAction } from '@/components/ConfirmHost';
import { Button } from '@/components/ui/button';
import useDraft, { readDraft, clearDraft } from '@/hooks/useDraft';
import api from '@/lib/api';
import { toast } from 'sonner';

const PROMPTS = ['Era uma vez…', 'Onde e quando acontece:', 'O problema da história:', 'Como termina:', 'Minha opinião sobre o tema:', 'Um argumento importante:'];
const THEMES = ['Um dia que mudou tudo', 'Se eu pudesse entrar num livro', 'A escola daqui a 50 anos', 'Carta para o meu eu do futuro', 'Uma amizade improvável'];

export default function TextProductions() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [focus, setFocus] = useState(false);
  const draftKey = `production:${editing?.id || 'new'}`;
  const draftStatus = useDraft(draftKey, editing ? { titulo: editing.titulo, conteudo: editing.conteudo } : null, !!editing);

  const load = () =>
    api
      .get('/text-productions')
      .then(r => setItems(r.data))
      .catch(() => {
        setItems([]);
        toast.error('Não foi possível carregar suas produções.');
      });
  useEffect(() => {
    load();
  }, []);

  const open = item => {
    const draft = readDraft(`production:${item?.id || 'new'}`, null);
    setEditing({ ...(item || {}), titulo: draft?.titulo ?? item?.titulo ?? '', conteudo: draft?.conteudo ?? item?.conteudo ?? '' });
    window.scrollTo({ top: 0 });
  };

  const save = async () => {
    if (!editing.titulo.trim()) return toast.error('Dê um título ao seu texto.');
    if (!editing.conteudo.trim()) return toast.error('Escreva seu texto antes de enviar.');
    setSaving(true);
    try {
      const body = { titulo: editing.titulo, conteudo: editing.conteudo };
      if (editing.id) await api.put(`/text-productions/${editing.id}`, body);
      else {
        const r = await api.post('/text-productions', body);
        setEditing(e => ({ ...e, id: r.data.id }));
      }
      clearDraft(draftKey);
      toast.success(editing.id ? 'Texto atualizado e enviado!' : 'Texto enviado ao professor!');
      load();
    } catch {
      toast.error('Não foi possível salvar. Seu rascunho continua guardado neste aparelho.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async item => {
    if (!(await confirmAction({ title: 'Excluir produção?', message: `“${item.titulo}” será apagado.`, confirmLabel: 'Excluir' }))) return;
    try {
      await api.delete(`/text-productions/${item.id}`);
      setItems(list => list.filter(p => p.id !== item.id));
      toast.success('Produção excluída.');
    } catch {
      toast.error('Não foi possível excluir.');
    }
  };

  if (editing)
    return (
      <DashboardLayout focusMode={focus}>
        <div data-testid="text-productions-page">
          <WritingDesk
            eyebrow={editing.id ? 'Produção textual' : 'Nova produção textual'}
            heading={editing.titulo || 'Texto sem título'}
            titleValue={editing.titulo}
            onTitleChange={titulo => setEditing(e => ({ ...e, titulo }))}
            value={editing.conteudo}
            onChange={conteudo => setEditing(e => ({ ...e, conteudo }))}
            placeholder="Solte a imaginação: escreva sua história, crônica, poema ou opinião…"
            goal={[120, 600]}
            prompts={PROMPTS}
            draftStatus={draftStatus}
            saving={saving}
            onSave={save}
            saveLabel={editing.id ? 'Atualizar texto' : 'Enviar ao professor'}
            onBack={() => {
              setEditing(null);
              setFocus(false);
            }}
            correction={editing}
            focus={focus}
            onFocusChange={setFocus}
            aside={
              !editing.id && (
                <section className="wd-card">
                  <h3>
                    <Sparkles size={16} /> Sem ideia de tema?
                  </h3>
                  <div className="wd-prompts">
                    {THEMES.map(t => (
                      <button key={t} type="button" onClick={() => setEditing(e => ({ ...e, titulo: e.titulo || t }))}>
                        {t}
                      </button>
                    ))}
                  </div>
                </section>
              )
            }
          />
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div data-testid="text-productions-page">
        <PageIntro section="MINHA ESCRITA / CRIAÇÃO" title="Produção textual" description="Dê espaço às suas ideias. Escreva, revise e veja o que o professor achou.">
          <Button className="qz-btn-primary" data-testid="new-production-button" onClick={() => open(null)}>
            <Plus size={16} /> Novo texto
          </Button>
        </PageIntro>
        {!items ? (
          <PageSkeleton cards={4} rows={3} label="Carregando suas produções…" />
        ) : (
          <WritingList
            items={items}
            kind="producao"
            onOpen={open}
            onDelete={remove}
            empty={<OwlEmpty title="Sua próxima ideia começa aqui" text="Escreva uma história, crônica, poema ou texto de opinião." action="Escrever meu primeiro texto" onAction={() => open(null)} />}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
