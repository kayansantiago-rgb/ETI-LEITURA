import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AttemptHistory from '@/components/AttemptHistory';
import RubricPicker from '@/components/RubricPicker';
import AIReview from '@/components/AIReview';
import QuickComments from '@/components/QuickComments';
import useDraft, { readDraft, clearDraft } from '@/hooks/useDraft';
import api from '@/lib/api';
import { toast } from 'sonner';
import { deadline, activityError } from '@/pages/Activities';

function ResponseCard({ activity, response, onGraded, onNext, onPrevious, index, total, onBusy }) {
  const draftKey = `correction:${response.id}:${response.updated_at}`;
  const [savedDraft] = useState(() => readDraft(draftKey, { nota: response.nota ?? '', feedback: response.feedback || '' }));

  const [grade, setGrade] = useState(savedDraft.nota);
  const [feedback, setFeedback] = useState(savedDraft.feedback);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('answer');

  const maxScore = activity?.valor_nota || 10;
  const dirty = String(grade) !== String(response.nota ?? '') || feedback !== (response.feedback || '');
  const draftStatus = useDraft(draftKey, { nota: grade, feedback }, dirty && !response.reenvio);

  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);

  const [returning, setReturning] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [retryDate, setRetryDate] = useState('');

  const returnWork = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post(`/admin/activities/${activity.id}/responses/${response.id}/return`, {
        orientacoes: instructions,
        prazo: retryDate,
        versao: response.updated_at
      });
      onGraded(r.data);
      setReturning(false);
      toast.success('Nova tentativa liberada ao estudante.');
    } catch (e) {
      toast.error(activityError(e, 'Não foi possível devolver a atividade.'));
    } finally {
      setBusy(false);
    }
  };

  const correct = async e => {
    e.preventDefault();
    const advance = e.nativeEvent.submitter?.value === 'next';
    setBusy(true);
    try {
      const r = await api.put(`/admin/activities/${activity.id}/responses/${response.id}/correction`, {
        nota: Number(grade),
        feedback,
        versao: response.updated_at
      });
      clearDraft(draftKey);
      onGraded(r.data);
      toast.success('Correção salva e enviada ao aluno.');
      if (advance) onNext();
    } catch (e) {
      toast.error(activityError(e, 'Não foi possível salvar a correção.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="correction-desk">
      <header className="correction-heading">
        <div>
          <h3 className="font-bold text-lg">{response.user_nome}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {response.user_turma} · Tentativa {response.tentativa || 1} · Entregue em{' '}
            {new Date(response.updated_at).toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="correction-navigation">
          <Button type="button" variant="outline" size="sm" disabled={busy || index === 0} onClick={onPrevious}>
            ← Anterior
          </Button>
          <span className="text-xs font-bold px-2">
            {index + 1} de {total}
          </span>
          <Button type="button" variant="outline" size="sm" disabled={busy || index === total - 1} onClick={onNext}>
            Próximo →
          </Button>
        </div>
      </header>

      <div className="correction-mobile-tabs">
        <Button
          type="button"
          size="sm"
          variant={tab === 'answer' ? 'default' : 'outline'}
          aria-pressed={tab === 'answer'}
          onClick={() => setTab('answer')}
        >
          Resposta do Aluno
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'grade' ? 'default' : 'outline'}
          aria-pressed={tab === 'grade'}
          onClick={() => setTab('grade')}
        >
          Correção e Nota
        </Button>
      </div>

      <div className="correction-columns">
        {/* Coluna 1: Respostas do Aluno */}
        <section className={`correction-reading ${tab === 'answer' ? 'mobile-selected' : ''}`} aria-label="Respostas do aluno">
          <p className="eyebrow">RESPOSTAS DO ESTUDANTE</p>

          <div className="space-y-4 mt-3">
            {activity.perguntas.map((q, i) => (
              <div key={q.id} className="p-4 rounded-xl border bg-card/50 space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Pergunta {i + 1}
                </h4>
                <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{q.enunciado}</p>
                <div className="pt-2 border-t mt-2">
                  <p className="answer-text text-sm whitespace-pre-wrap">
                    {response.respostas.find(a => a.pergunta_id === q.id)?.resposta || '— Sem resposta —'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <AttemptHistory activity={activity} response={response} />
        </section>

        {/* Coluna 2: Formulário de Nota & Devolutiva */}
        <section className={`correction-tools ${tab === 'grade' ? 'mobile-selected' : ''}`} aria-label="Correção da entrega">
          <p className="eyebrow">DEVOLUTIVA DO PROFESSOR</p>

          {response.reenvio && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2 text-sm mb-4">
              <strong className="text-amber-900 dark:text-amber-200">Devolvida para refazer</strong>
              <p className="answer-text text-xs">{response.reenvio.orientacoes}</p>
              <p className="text-xs text-muted-foreground">Novo prazo: {deadline(response.reenvio.prazo)}</p>
            </div>
          )}

          {!response.reenvio && (
            <>
              <div className="space-y-3 mb-4">
                <RubricPicker onApply={r => { setGrade(r.nota); setFeedback(r.feedback); }} />
                <AIReview kind="activity" id={response.id} onApply={r => { setGrade(r.nota); setFeedback(r.feedback); }} />
                <QuickComments onUse={text => setFeedback(value => [value, text].filter(Boolean).join('\n\n').slice(0, 10000))} />
              </div>

              <form onSubmit={correct} className="border-t pt-4 space-y-4">
                <div>
                  <Label htmlFor={`grade-${response.id}`} className="text-xs font-bold">
                    Nota da atividade (0 a {maxScore}) *
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id={`grade-${response.id}`}
                      className="max-w-28 font-bold text-lg"
                      type="number"
                      required
                      min="0"
                      max={maxScore}
                      step="0.1"
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                    />
                    <span className="text-sm font-semibold text-muted-foreground">/ {maxScore} pts</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor={`feedback-${response.id}`} className="text-xs font-bold">
                    Feedback para o estudante
                  </Label>
                  <Textarea
                    id={`feedback-${response.id}`}
                    maxLength={10000}
                    placeholder="Escreva orientações ou pontos fortes da resposta…"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? 'Salvando…' : response.nota != null ? 'Atualizar correção' : 'Enviar correção'}
                  </Button>
                  {index < total - 1 && (
                    <Button type="submit" value="next" variant="outline" disabled={busy}>
                      Salvar e próximo →
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {dirty
                    ? draftStatus.replace('Envie quando terminar.', 'Salve a correção para enviar ao aluno.')
                    : 'A nota e o feedback são enviados ao clicar em Salvar.'}
                </p>
              </form>
            </>
          )}

          <div className="border-t pt-4 mt-4">
            {!returning ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                disabled={busy || !!(response.reenvio && response.reenvio.prazo >= new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()))}
                onClick={() => setReturning(true)}
              >
                {response.reenvio ? 'Ajustar prazo após vencimento' : 'Devolver para nova tentativa'}
              </Button>
            ) : (
              <form className="space-y-3" onSubmit={returnWork}>
                <h4 className="font-bold text-sm">Liberar nova tentativa</h4>
                <p className="text-xs text-muted-foreground">
                  A entrega atual ficará no histórico quando o aluno reenviar.
                </p>
                <div>
                  <Label htmlFor={`retry-instructions-${response.id}`} className="text-xs">Orientações para refazer</Label>
                  <Textarea
                    id={`retry-instructions-${response.id}`}
                    required
                    maxLength={10000}
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor={`retry-date-${response.id}`} className="text-xs">Novo prazo (até 23h59, Brasília)</Label>
                  <Input
                    id={`retry-date-${response.id}`}
                    type="date"
                    required
                    value={retryDate}
                    onChange={e => setRetryDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" disabled={busy}>Liberar tentativa</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setReturning(false)}>Cancelar</Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}

export default function CorrectionWorkspace({ activity, responses, onGraded }) {
  const [selected, setSelected] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const visible = responses.filter(r => filter === 'all' || (!r.reenvio && r.nota == null));
  const current = visible.find(r => r.id === selected) || visible[0];
  const index = visible.findIndex(r => r.id === current?.id);

  const move = offset => {
    if (visible[index + offset]) setSelected(visible[index + offset].id);
  };

  return (
    <section className="correction-workspace">
      <div className="correction-toolbar">
        <div>
          <p className="eyebrow">ACOMPANHAMENTO INDIVIDUAL</p>
          <h2 className="text-base font-extrabold">Correção de Entregas</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filtrar correções"
            className="native-select !text-xs"
            disabled={busy}
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">Todas as entregas ({responses.length})</option>
            <option value="pending">Aguardando correção ({responses.filter(r => !r.reenvio && r.nota == null).length})</option>
          </select>

          <select
            aria-label="Selecionar aluno para corrigir"
            className="native-select !text-xs max-w-60"
            disabled={busy || !visible.length}
            value={current?.id || ''}
            onChange={e => setSelected(e.target.value)}
          >
            {!visible.length && <option value="">Nenhuma entrega</option>}
            {visible.map(r => (
              <option key={r.id} value={r.id}>
                {r.user_nome} {r.reenvio ? ' · Devolvida' : r.nota != null ? ` · Corrigida (${r.nota})` : ' · Pendente'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {current ? (
        <ResponseCard
          key={current.id + ':' + current.updated_at}
          activity={activity}
          response={current}
          onGraded={onGraded}
          onNext={() => move(1)}
          onPrevious={() => move(-1)}
          index={index}
          total={visible.length}
          onBusy={setBusy}
        />
      ) : (
        <div className="empty-state">Nenhuma entrega aguardando correção nesta seleção.</div>
      )}
    </section>
  );
}
