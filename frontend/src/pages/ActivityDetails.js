import { confirmAction } from '@/components/ConfirmHost';
import CorrectionWorkspace from '@/components/CorrectionWorkspace';
import ActivitySteps from '@/components/ActivitySteps';
import { publicationLabel } from '@/lib/publication';
import AttemptHistory from '@/components/AttemptHistory';
import { activityDraft } from '@/components/ActivityLibrary';
import ActivityForm from '@/components/ActivityForm';
import useDraft, { readDraft, clearDraft } from '@/hooks/useDraft';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Award, BookOpen, Calendar, ChevronDown, ChevronUp, Paperclip, RotateCcw, Clock3, MessageSquareText, User, Pencil, Lock, LockOpen, Copy, BookmarkPlus, Trash2, Inbox, Printer } from 'lucide-react';
import OwlEmpty from '@/components/OwlEmpty';
import { PageSkeleton } from '@/components/Skeleton';
import DashboardLayout from '@/components/DashboardLayout';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';
import { deadline, activityError } from '@/pages/Activities';

function dueLabel(prazo) {
  if (!prazo) return ['Sem prazo', ''];
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T00:00:00');
  const days = Math.round((new Date(prazo + 'T00:00:00') - today) / 864e5);
  if (days < 0) return ['Prazo encerrado', 'is-late'];
  if (days === 0) return ['Entrega até hoje, 23h59', 'is-urgent'];
  if (days === 1) return ['Entrega até amanhã, 23h59', 'is-urgent'];
  return [`Entrega em ${days} dias (${deadline(prazo)})`, days <= 3 ? 'is-soon' : ''];
}

function StudentActivity({ id, activity, answers, setAnswers, canAnswer, busy, onSubmit, draftStatus }) {
  const mine = activity.minha_resposta;
  const retry = mine?.reenvio;
  const prazo = retry?.prazo || activity.prazo;
  const [due, dueClass] = dueLabel(prazo);
  const max = activity.valor_nota ?? 10;
  const state = retry && activity.pode_reenviar ? ['Refazer', 'is-retry'] : mine?.nota != null ? ['Corrigida', 'is-graded'] : mine ? ['Entregue', 'is-sent'] : activity.encerrada ? ['Encerrada', 'is-closed'] : ['A entregar', 'is-open'];
  return (
    <div className="ad">
      <header className="ad-hero">
        <div className="ad-tags">
          <span className="ws-chip">{activity.turma === 'TODAS' ? 'Todas as turmas' : activity.turma}</span>
          {activity.disciplina && <span className="ws-chip is-soft">{activity.disciplina}</span>}
          <span className={`ad-state ${state[1]}`}>{state[0]}</span>
        </div>
        <h1>{activity.titulo}</h1>
        <div className="ad-meta">
          <span>
            <User size={14} /> {activity.professor_nome}
          </span>
          <span>
            <Award size={14} /> Vale {max.toLocaleString('pt-BR')} pontos
          </span>
          <span className={`ad-due ${canAnswer ? dueClass : ''}`}>
            <Clock3 size={14} /> {canAnswer ? due : `Prazo ${deadline(prazo)}`}
          </span>
        </div>
        {activity.descricao && <p className="ad-desc">{activity.descricao}</p>}
        {(activity.book_id || !!activity.anexos?.length) && (
          <div className="ad-links">
            {activity.book_id && (
              <Link to={`/book/${activity.book_id}`}>
                <BookOpen size={14} /> Livro da atividade
              </Link>
            )}
            {activity.anexos?.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer">
                <Paperclip size={14} /> {a.nome}
              </a>
            ))}
          </div>
        )}
      </header>

      {retry && activity.pode_reenviar && (
        <section className="ad-retry">
          <RotateCcw size={20} />
          <div>
            <strong>O professor pediu para você refazer</strong>
            <p>{retry.orientacoes}</p>
            <small>Nova entrega até {deadline(retry.prazo)}, 23h59.</small>
          </div>
        </section>
      )}

      {mine && mine.nota != null && !activity.pode_reenviar && (
        <section className="ad-result">
          <div className="ad-score">
            <strong>{mine.nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong>
            <span>de {max.toLocaleString('pt-BR')}</span>
          </div>
          <div className="ad-feedback">
            <span>
              <MessageSquareText size={15} /> Comentário do professor
            </span>
            <p>{mine.feedback || 'Sem comentário.'}</p>
            <small>Tentativa {mine.tentativa || 1}</small>
          </div>
        </section>
      )}

      {mine && mine.nota == null && !activity.pode_reenviar && (
        <section className="ad-sent">
          <CheckCircle2 size={20} />
          <div>
            <strong>Respostas enviadas!</strong>
            <p>Agora é só aguardar a correção. Você recebe um aviso quando a nota sair.</p>
          </div>
        </section>
      )}

      <ActivitySteps
        key={id}
        activity={activity}
        answers={answers}
        setAnswers={setAnswers}
        canAnswer={canAnswer}
        busy={busy}
        onSubmit={onSubmit}
        draftStatus={draftStatus}
      />
    </div>
  );
}

// Visão do professor: dados da atividade, ações, números das entregas e correção.
function TeacherActivity({ activity, responses, setResponses, canManage, busy, editing, setEditing, duplicate, setDuplicate, showQuestions, setShowQuestions, onStatus, onSaveModel, onRemove, reload }) {
  const max = activity.valor_nota ?? 10;
  const graded = responses.filter(r => r.nota != null);
  const pending = responses.filter(r => r.nota == null && !r.reenvio).length;
  const avg = graded.length ? graded.reduce((s, r) => s + r.nota, 0) / graded.length : null;
  const state = activity.agendada ? ['Agendada', 'is-sent'] : activity.encerrada ? ['Encerrada', 'is-closed'] : ['Aberta', 'is-open'];
  const fmt = v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  if (editing || duplicate)
    return (
      <ActivityForm
        {...(editing ? { initial: activity } : { draft: activityDraft(activity) })}
        onCancel={() => (editing ? setEditing(false) : setDuplicate(false))}
        onSaved={() => {
          if (editing) {
            setEditing(false);
            reload();
          } else {
            setDuplicate(false);
            toast.success('A cópia está na lista de atividades.');
          }
        }}
      />
    );

  return (
    <div className="ad adm">
      <header className="ad-hero">
        <div className="ad-tags">
          <span className="ws-chip">{activity.turma === 'TODAS' ? 'Todas as turmas' : activity.turma}</span>
          {activity.disciplina && <span className="ws-chip is-soft">{activity.disciplina}</span>}
          <span className={`ad-state ${state[1]}`}>{state[0]}</span>
        </div>
        <h1>{activity.titulo}</h1>
        <div className="ad-meta">
          <span>
            <User size={14} /> {activity.professor_nome}
          </span>
          <span>
            <Award size={14} /> Vale {max.toLocaleString('pt-BR')} pontos
          </span>
          <span>
            <Calendar size={14} /> {activity.prazo ? `Prazo ${deadline(activity.prazo)}, 23h59` : 'Sem prazo'}
          </span>
          {activity.agendada && activity.publicar_em && (
            <span>
              <Clock3 size={14} /> {publicationLabel(activity.publicar_em)}
            </span>
          )}
        </div>
        {activity.descricao && <p className="ad-desc">{activity.descricao}</p>}
        {(activity.book_id || !!activity.anexos?.length) && (
          <div className="ad-links">
            {activity.book_id && (
              <Link to={`/book/${activity.book_id}`}>
                <BookOpen size={14} /> Livro da atividade
              </Link>
            )}
            {activity.anexos?.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer">
                <Paperclip size={14} /> {a.nome}
              </a>
            ))}
          </div>
        )}
        <div className="adm-actions">
          {canManage && !responses.length && (
            <button type="button" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Editar
            </button>
          )}
          {canManage && (
            <button type="button" onClick={onStatus} disabled={busy}>
              {activity.status === 'aberta' ? <Lock size={14} /> : <LockOpen size={14} />} {activity.status === 'aberta' ? 'Encerrar' : 'Reabrir'}
            </button>
          )}
          <button type="button" onClick={() => setDuplicate(true)}>
            <Copy size={14} /> Duplicar para outra turma
          </button>
          <button type="button" onClick={onSaveModel} disabled={busy}>
            <BookmarkPlus size={14} /> Salvar como modelo
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </button>
          {canManage && !responses.length && (
            <button type="button" className="is-danger" onClick={onRemove} disabled={busy}>
              <Trash2 size={14} /> Excluir
            </button>
          )}
        </div>
      </header>

      <section className="adm-stats" aria-label="Resumo das entregas">
        <div>
          <Inbox size={17} />
          <strong>{responses.length}</strong>
          <span>entregas</span>
        </div>
        <div>
          <CheckCircle2 size={17} />
          <strong>{graded.length}</strong>
          <span>corrigidas</span>
        </div>
        <div className={pending ? 'is-alert' : ''}>
          <Clock3 size={17} />
          <strong>{pending}</strong>
          <span>para corrigir</span>
        </div>
        <div className="is-featured">
          <Award size={17} />
          <strong>{avg == null ? '—' : fmt(avg)}</strong>
          <span>média (de {fmt(max)})</span>
        </div>
      </section>

      <section className="ws-card adm-questions">
        <button type="button" className="adm-questions-head" onClick={() => setShowQuestions(!showQuestions)} aria-expanded={showQuestions}>
          <span>
            <MessageSquareText size={17} /> Perguntas da atividade <b>{activity.perguntas.length}</b>
          </span>
          {showQuestions ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
          <ol className={showQuestions ? '' : 'is-collapsed'}>
            {activity.perguntas.map((q, i) => (
              <li key={q.id}>
                <span className="qz-q-number">{i + 1}</span>
                <div>
                  <p>{q.enunciado}</p>
                  {q.tipo === 'alternativa' && !!q.alternativas?.length && (
                    <ul>
                      {q.alternativas.map((alt, j) => (
                        <li key={j}>
                          <b>{String.fromCharCode(65 + j)}</b> {alt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
      </section>

      <section className="adm-responses">
        <div className="adm-responses-head">
          <h2>
            Respostas dos alunos <span>{responses.length}</span>
          </h2>
          <button type="button" onClick={reload}>
            <RotateCcw size={14} /> Atualizar
          </button>
        </div>
        {responses.length ? (
          <CorrectionWorkspace activity={activity} responses={responses} onGraded={updated => setResponses(list => list.map(x => (x.id === updated.id ? updated : x)))} />
        ) : (
          <div className="ws-card">
            <OwlEmpty compact title="Nenhuma resposta ainda" text="As respostas dos alunos aparecem aqui assim que forem enviadas." />
          </div>
        )}
      </section>
    </div>
  );
}

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
    if (!(await confirmAction({ title: 'Apagar atividade?', message: 'Tem certeza que deseja apagar esta atividade? Esta ação é permanente e removerá a atividade e todas as entregas dos alunos.', confirmLabel: 'Apagar' }))) return;
    setBusy(true);
    try {
      await api.delete(`/admin/activities/${id}`);
      setDeleted(true);
      toast.success('Atividade apagada com sucesso!');
    } catch (e) {
      toast.error(activityError(e, 'Não foi possível apagar a atividade.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <Link to={admin ? '/admin/activities' : '/activities'} className="ws-back">
        <ArrowLeft size={15} /> Voltar às atividades
      </Link>

      {deleted ? (
        <div className="ws-card">
          <OwlEmpty compact title="Atividade apagada" text="Ela e as entregas dos alunos foram removidas." action="Voltar às atividades" to={admin ? '/admin/activities' : '/activities'} />
        </div>
      ) : error ? (
        <div className="ws-card">
          <OwlEmpty compact mood="search" title="Atividade indisponível" text="Ela pode ter sido removida ou você não tem acesso a esta turma." action="Tentar novamente" onAction={load} />
        </div>
      ) : !activity ? (
        <PageSkeleton cards={0} rows={4} label="Carregando atividade…" />
      ) : !admin ? (
        <StudentActivity
          id={id}
          activity={activity}
          answers={answers}
          setAnswers={setAnswers}
          canAnswer={canAnswer}
          busy={busy}
          onSubmit={submit}
          draftStatus={draftStatus}
        />
      ) : (
        <TeacherActivity
          activity={activity}
          responses={responses}
          setResponses={setResponses}
          canManage={canManage}
          busy={busy}
          editing={editing}
          setEditing={setEditing}
          duplicate={duplicate}
          setDuplicate={setDuplicate}
          showQuestions={showQuestions}
          setShowQuestions={setShowQuestions}
          onStatus={status}
          onSaveModel={saveModel}
          onRemove={remove}
          reload={load}
        />
      )}
    </DashboardLayout>
  );
}
