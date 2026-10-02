import { useEffect, useRef } from 'react';
import { ArrowLeft, Save, Loader2, Maximize2, Minimize2, Lightbulb, Star, MessageSquare, Cloud } from 'lucide-react';

const words = text => (text.trim() ? text.trim().split(/\s+/).length : 0);

// Mesa de escrita em "modo foco": folha grande, contador com meta, ideias para começar e a correção do professor.
export default function WritingDesk({
  eyebrow,
  heading,
  titleValue,
  onTitleChange,
  value,
  onChange,
  placeholder,
  goal = [80, 400],
  prompts = [],
  draftStatus,
  saving,
  onSave,
  saveLabel = 'Enviar ao professor',
  onBack,
  aside,
  correction,
  focus,
  onFocusChange
}) {
  const area = useRef(null);
  const count = words(value);
  const [min, max] = goal;
  const pct = Math.min(100, Math.round((count / min) * 100));
  const tone = count === 0 ? '' : count < min ? 'is-low' : count > max ? 'is-high' : 'is-ok';

  // A folha cresce com o texto, sem barra de rolagem interna.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(420, el.scrollHeight) + 'px';
  }, [value]);

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSave, saving]);

  const insert = prompt => {
    const text = value.trimEnd();
    onChange((text ? text + '\n\n' : '') + prompt + ' ');
    setTimeout(() => {
      const el = area.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    }, 0);
  };

  return (
    <div className={`wd ${focus ? 'is-focus' : ''}`}>
      <header className="wd-bar">
        <button type="button" className="ws-icon-btn" onClick={onBack} aria-label="Voltar">
          <ArrowLeft size={18} />
        </button>
        <div className="wd-bar-title">
          <p className="ws-eyebrow">{eyebrow}</p>
          <h1>{heading}</h1>
        </div>
        {draftStatus && (
          <span className="wd-saved" title={draftStatus}>
            <Cloud size={15} /> Rascunho salvo
          </span>
        )}
        {onFocusChange && (
          <button type="button" className="ws-icon-btn wd-hide-mobile" onClick={() => onFocusChange(!focus)} aria-label={focus ? 'Sair do modo foco' : 'Modo foco'} title={focus ? 'Sair do modo foco' : 'Modo foco'}>
            {focus ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        )}
        <button type="button" className="wd-save" onClick={onSave} disabled={saving} data-testid="save-summary-button">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? 'Salvando…' : saveLabel}
        </button>
      </header>

      <div className="wd-grid">
        <article className="wd-paper">
          {onTitleChange && (
            <input className="wd-title" aria-label="Título" placeholder="Dê um título ao seu texto" maxLength={160} value={titleValue} onChange={e => onTitleChange(e.target.value)} />
          )}
          <textarea
            ref={area}
            className="wd-text"
            aria-label={heading}
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            data-testid="summary-textarea"
            spellCheck
            lang="pt-BR"
          />
          <footer className="wd-stats">
            <span className={`wd-goal ${tone}`}>
              <span className="wd-goal-bar">
                <span style={{ width: `${pct}%` }} />
              </span>
              <b>{count}</b> palavras
              <small>{count < min ? `sugestão: pelo menos ${min}` : count > max ? `ficou longo (até ${max} é o ideal)` : 'ótimo tamanho!'}</small>
            </span>
            <span className="wd-meta">
              {value.length} caracteres · ~{Math.max(1, Math.round(count / 200))} min de leitura · Ctrl+S salva
            </span>
          </footer>
        </article>

        <aside className="wd-side">
          {correction && correction.nota != null && (
            <section className="wd-card wd-correction">
              <h3>
                <Star size={16} /> Correção do professor
              </h3>
              <strong className="wd-grade">{Number(correction.nota).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong>
              {correction.feedback && (
                <p>
                  <MessageSquare size={14} /> {correction.feedback}
                </p>
              )}
              {correction.corrigido_em && (
                <small>
                  {correction.corrigido_por ? `${correction.corrigido_por} · ` : ''}
                  {new Date(correction.corrigido_em).toLocaleDateString('pt-BR')}
                </small>
              )}
            </section>
          )}
          {aside}
          {prompts.length > 0 && (
            <section className="wd-card">
              <h3>
                <Lightbulb size={16} /> Ideias para começar
              </h3>
              <div className="wd-prompts">
                {prompts.map(p => (
                  <button key={p} type="button" onClick={() => insert(p)}>
                    {p}
                  </button>
                ))}
              </div>
              <small className="wd-tip">Toque numa ideia para começar um parágrafo com ela.</small>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
