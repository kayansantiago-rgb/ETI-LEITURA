import CorrectionWorkspace from '@/components/CorrectionWorkspace';
import ActivitySteps from '@/components/ActivitySteps';
import { publicationLabel } from '@/lib/publication';
import AttemptHistory from '@/components/AttemptHistory';
import { activityDraft } from '@/components/ActivityLibrary';
import ActivityForm from '@/components/ActivityForm';
import useDraft, { readDraft, clearDraft } from '@/hooks/useDraft';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Award, BookOpen, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';
import { deadline, activityError } from '@/pages/Activities';

export default function ActivityDetails() {
  const { id } = useParams();
  const admin = ['admin', 'teacher'].includes(getUser()?.role);

  const [activity, setActivity] = useState(null);
  const [responses, setResponses] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);

  const canAnswer = !!activity && (activity.minha_resposta ? activity.pode_reenviar : !activity.encerrada);

  const saveModel = async () => {
    setBusy(true);
    try {
      await api.post('/admin/activity-templates', { ...activity, prazo: null });
      toast.success('Atividade salva em Meus modelos.');
    } catch (e) {
      toast.error(activityError(e, 'Não foi possível salvar o modelo.'));
    } finally {
      setBusy(false);
    }
  };

  const draftStatus = useDraft(`activity:${id}`, answers, !!activity && !admin && canAnswer);
  const canManage = admin && (getUser()?.role === 'admin' || activity?.professor_id === getUser()?.id);

  const load = async () => {
    setError(false);
    try {
      const a = (await api.get(`/activities/${id}`)).data;
      setActivity(a);
      const saved = Object.fromEntries((a.minha_resposta?.respostas || []).map(r => [r.pergunta_id, r.resposta]));
      setAnswers(a.minha_resposta && !a.pode_reenviar ? saved : readDraft(`activity:${id}`, saved));
      if (admin) setResponses((await api.get(`/admin/activities/${id}/responses`)).data);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.put(`/activities/${id}/response`, {
        respostas: activity.perguntas.map(q => ({ pergunta_id: q.id, resposta: answers[q.id] || '' }))
      });
      setActivity({ ...activity, minha_resposta: r.data, pode_reenviar: false });
      clearDraft(`activity:${id}`);
      toast.success('Resposta enviada ao professor!');
    } catch (e) {
      toast.error(activityError(e, 'Não foi possível enviar. Suas respostas continuam nesta tela.'));
    } finally {
      setBusy(false);
    }
  };

  const status = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/activities/${id}/status`, { status: activity.status === 'aberta' ? 'encerrada' : 'aberta' });
      await load();
      toast.success(activity.status === 'aberta' ? 'Atividade encerrada.' : 'Atividade reaberta.');
    } catch (e) {
      toast.error(activityError(e, 'Não foi possível alterar a atividade.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Excluir esta atividade sem respostas?')) return;
    setBusy(true);
    try {
      await api.delete(`/admin/activities/${id}`);
      setDeleted(true);
    } catch (e) {
      toast.error(activityError(e, 'Não foi possível excluir.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <Link to={admin ? '/admin/activities' : '/activities'} className="inline-flex items-center gap-2 text-xs font-semibold text-primary mb-5 hover:underline">
        <ArrowLeft size={15} /> Voltar às atividades
      </Link>

      {deleted ? (
        <div className="empty-state">Atividade excluída com sucesso.</div>
      ) : error ? (
        <div className="empty-state" role="alert">
          Atividade indisponível ou sem permissão de acesso.{' '}
          <button onClick={load} className="underline font-bold">
            Tentar novamente
          </button>
        </div>
      ) : !activity ? (
        <p className="empty-state" role="status">Carregando atividade…</p>
      ) : (
        <div className="space-y-6">
          {duplicate && (
            <ActivityForm
              draft={activityDraft(activity)}
              onCancel={() => setDuplicate(false)}
              onSaved={() => {
                setDuplicate(false);
                toast.success('A cópia está na lista de atividades.');
              }}
            />
          )}

          {editing && (
            <ActivityForm
              initial={activity}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                load();
              }}
            />
          )}

          {/* Cabeçalho Minimalista da Atividade */}
          <header className="panel p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="activity-badge font-bold">
                  {activity.turma === 'TODAS' ? 'Todas as turmas' : activity.turma}
                </span>
                <span className="activity-score-badge">
                  <Award size={13} /> Valor: {(activity.valor_nota || 10).toFixed(1)} pts
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${activity.status === 'aberta' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                  {activity.agendada ? 'Agendada' : activity.encerrada ? 'Encerrada' : 'Aberta'}
                </span>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar size={13} /> Prazo: {deadline(activity.prazo)} {activity.prazo ? 'às 23h59' : ''}
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{activity.titulo}</h1>
              <p className="text-xs text-muted-foreground mt-1">Por: {activity.professor_nome}</p>
            </div>

            {activity.descricao && (
              <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed pt-2">
                {activity.descricao}
              </p>
            )}

            {activity.book_id && (
              <div className="pt-2">
                <Link to={`/book/${activity.book_id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                  <BookOpen size={14} /> Abrir livro relacionado ↗
                </Link>
              </div>
            )}

            {!!activity.anexos?.length && (
              <div className="pt-3 border-t">
                <span className="text-xs font-bold text-muted-foreground block mb-2">Materiais de apoio:</span>
                <div className="flex flex-wrap gap-2">
                  {activity.anexos.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline bg-accent/10 px-3 py-1.5 rounded-lg">
                      {a.nome} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Ações do Professor em Barra Limpa */}
            {admin && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {canManage && !responses.length && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                )}
                {canManage && (
                  <Button size="sm" variant="outline" onClick={status} disabled={busy}>
                    {activity.status === 'aberta' ? 'Encerrar' : 'Reabrir'}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setDuplicate(true)}>
                  Duplicar turma
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={saveModel}>
                  Salvar modelo
                </Button>
                {canManage && !responses.length && (
                  <Button size="sm" variant="ghost" className="text-destructive text-xs" onClick={remove} disabled={busy}>
                    Excluir
                  </Button>
                )}
              </div>
            )}
          </header>

          {/* Perguntas Recolhíveis (Collapsible) */}
          <div className="panel p-4">
            <button
              className="w-full flex items-center justify-between text-sm font-bold text-foreground"
              onClick={() => setShowQuestions(!showQuestions)}
            >
              <span>Perguntas da atividade ({activity.perguntas.length})</span>
              {showQuestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showQuestions && (
              <ol className="list-decimal pl-5 space-y-3 text-sm mt-4 pt-3 border-t">
                {activity.perguntas.map(q => (
                  <li key={q.id} className="whitespace-pre-wrap leading-relaxed">
                    {q.enunciado}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Workspace de Correção do Professor vs Resposta do Aluno */}
          {admin ? (
            <section className="space-y-4">
              <div className="section-heading-row">
                <h2 className="text-lg font-bold">Respostas dos alunos ({responses.length})</h2>
                <button onClick={load} className="text-xs font-semibold text-primary hover:underline">
                  Atualizar
                </button>
              </div>

              {responses.length ? (
                <CorrectionWorkspace
                  activity={activity}
                  responses={responses}
                  onGraded={updated => setResponses(list => list.map(x => (x.id === updated.id ? updated : x)))}
                />
              ) : (
                <div className="empty-state">As respostas dos alunos aparecerão aqui assim que forem enviadas.</div>
              )}
            </section>
          ) : (
            <>
              {activity.minha_resposta && (
                <div className="panel p-6 space-y-4">
                  <p className="flex gap-2 items-center text-primary font-bold">
                    <CheckCircle2 size={18} /> Tentativa {activity.minha_resposta.tentativa || 1} enviada
                  </p>
                  {activity.minha_resposta.nota != null ? (
                    <div className="bg-accent/10 p-4 rounded-xl border border-accent/20">
                      <p className="text-sm font-bold">
                        Nota atribuída: <span className="text-primary text-base">{activity.minha_resposta.nota.toFixed(1)} / {(activity.valor_nota || 10).toFixed(1)}</span>
                      </p>
                      {activity.minha_resposta.feedback && (
                        <p className="text-xs italic text-muted-foreground mt-2">
                          "{activity.minha_resposta.feedback}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aguardando correção do professor.</p>
                  )}
                </div>
              )}
              <ActivitySteps
                key={id}
                activity={activity}
                answers={answers}
                setAnswers={setAnswers}
                canAnswer={canAnswer}
                busy={busy}
                onSubmit={submit}
                draftStatus={draftStatus}
              />
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
