import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Owl } from '@/components/LoginScene';

const DURATION = 4500;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

const SUBTITLE = {
  student: 'Sua estante está pronta. Bora ler um pouquinho hoje?',
  teacher: 'Suas turmas, atividades e correções estão te esperando.',
  admin: 'O painel da escola está pronto para você.'
};

function WelcomeCard({ id, user, created }) {
  const first = (user?.nome || '').split(' ')[0];
  return (
    <div className="wt" role="status">
      <span className="wt-owl" aria-hidden="true">
        <Owl size={46} />
      </span>
      <div className="wt-copy">
        <strong>{created ? `Conta criada${first ? `, ${first}` : ''}! 🎉` : `${greeting()}${first ? `, ${first}` : ''}! 👋`}</strong>
        <span>{created ? 'Bem-vindo(a) à ETI LEITURA. Vamos começar sua jornada?' : SUBTITLE[user?.role] || SUBTITLE.student}</span>
      </div>
      <button type="button" className="wt-close" onClick={() => toast.dismiss(id)} aria-label="Fechar">
        <X size={15} />
      </button>
      <i className="wt-bar" style={{ animationDuration: `${DURATION}ms` }} aria-hidden="true" />
    </div>
  );
}

// Cartão de boas-vindas mostrado logo após entrar ou criar a conta.
export function showWelcome(user, created = false) {
  toast.custom(id => <WelcomeCard id={id} user={user} created={created} />, { duration: DURATION, position: 'top-center', unstyled: true });
}
