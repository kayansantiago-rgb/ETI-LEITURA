import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, ClipboardList, Trophy, Bell, Accessibility, Headphones, Users, PenLine, CalendarDays, Smartphone, Sparkles, LineChart } from 'lucide-react';
import { Owl } from '@/components/LoginScene';
import { getUser } from '@/lib/auth';

const KEY = id => `eti-tour-v1:${id}`;

const STUDENT = [
  [Sparkles, 'Bem-vindo(a) à ETI LEITURA!', 'Eu sou a Coruja e vou te mostrar a plataforma em um minutinho. Aqui você lê, aprende e coleciona conquistas.'],
  [BookOpen, 'Biblioteca e leitor', 'Abra um livro na Biblioteca e leia direto aqui. Seu progresso é salvo sozinho, e no fim do livro tem um questionário que vale certificado!'],
  [Headphones, 'Ouça o livro', 'No leitor, toque no fone de ouvido para ouvir a página em voz alta. Ele vira as páginas sozinho.'],
  [ClipboardList, 'Atividades e pendências', 'Seus professores publicam atividades aqui. Em "Pendências" você vê o que falta entregar e os prazos.'],
  [Trophy, 'Sequência, medalhas e ranking', 'Leia um pouco todo dia para manter a sequência, ganhar medalhas, liberar molduras e títulos e subir no ranking da turma.'],
  [Bell, 'Avisos no celular', 'No sininho ficam os avisos. Ative as notificações e instale o app para receber tudo na tela do celular.'],
  [Accessibility, 'Do seu jeito', 'No botão de acessibilidade você aumenta a letra, usa fonte mais legível e mais. Boa leitura!']
];

const STAFF = [
  [Sparkles, 'Bem-vindo(a) à ETI LEITURA!', 'Eu sou a Coruja e vou te mostrar as ferramentas do professor em um minutinho.'],
  [Users, 'Minhas turmas', 'Acompanhe médias, participação e o histórico de cada aluno. O painel "Precisam de atenção" mostra quem está parado ou atrasado, com botão de lembrete.'],
  [ClipboardList, 'Atividades e correção', 'Crie atividades, agende a publicação e corrija sem sair da página, com notas rápidas e "Salvar e próximo".'],
  [PenLine, 'Resumos e produções', 'Os textos dos alunos chegam em Pendências de correção, prontos para nota e comentário.'],
  [CalendarDays, 'Calendário e mural', 'Os prazos das atividades entram sozinhos no calendário. No mural, compartilhe fotos e vídeos da escola.'],
  [LineChart, 'Relatórios', 'Gere o relatório da turma em PDF a qualquer momento em Minhas turmas.'],
  [Smartphone, 'No celular também', 'Instale a plataforma como aplicativo e ative os avisos para saber de cada nova entrega.']
];

// Tour de boas-vindas no primeiro acesso (pode ser revisto pelo Perfil).
export default function WelcomeTour() {
  const user = getUser();
  const slides = user?.role === 'student' ? STUDENT : STAFF;
  const [open, setOpen] = useState(() => {
    try {
      return !!user?.id && !localStorage.getItem(KEY(user.id));
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reopen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener('eti-tour-open', reopen);
    return () => window.removeEventListener('eti-tour-open', reopen);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(KEY(user.id), new Date().toISOString());
    } catch {}
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setStep(s => Math.min(slides.length - 1, s + 1));
      if (e.key === 'ArrowLeft') setStep(s => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open || !user) return null;
  const [Icon, title, text] = slides[step];
  const last = step === slides.length - 1;

  return createPortal(
    <div className="ws-overlay is-center wt-overlay">
      <section className="wtour" role="dialog" aria-modal="true" aria-label="Tour de boas-vindas">
        <div className="wtour-art" aria-hidden="true">
          <span className="wtour-owl">
            <Owl size={step === 0 ? 96 : 76} />
          </span>
          {step > 0 && (
            <span className="wtour-icon" key={step}>
              <Icon size={26} />
            </span>
          )}
        </div>
        <div className="wtour-body" aria-live="polite">
          <p className="ws-eyebrow">
            {step === 0 ? `Olá, ${user.nome.split(' ')[0]}!` : `Passo ${step} de ${slides.length - 1}`}
          </p>
          <h2 key={'t' + step}>{title}</h2>
          <p key={'p' + step}>{text}</p>
        </div>
        <div className="wtour-dots" role="tablist" aria-label="Passos do tour">
          {slides.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === step} aria-label={`Passo ${i + 1}`} onClick={() => setStep(i)} />
          ))}
        </div>
        <footer className="wtour-foot">
          {step === 0 ? (
            <button type="button" className="wtour-skip" onClick={close}>
              Pular
            </button>
          ) : (
            <button type="button" className="wtour-skip" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft size={15} /> Voltar
            </button>
          )}
          <button type="button" className="a11y-done" onClick={() => (last ? close() : setStep(s => s + 1))}>
            {last ? 'Começar!' : step === 0 ? 'Mostrar' : 'Próximo'} {!last && <ArrowRight size={16} />}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
