import OwlEmpty from '@/components/OwlEmpty';

// Falha ao carregar: a coruja explica e oferece tentar de novo (sem o aluno precisar recarregar a página).
export default function ErrorState({ title = 'Ops! Algo não carregou', text = 'Pode ser a internet ou o servidor acordando. Tente de novo em alguns segundos.', onRetry, card = true }) {
  const body = <OwlEmpty compact mood="search" bubble="Ops!" title={title} text={text} action="Tentar de novo" onAction={onRetry || (() => window.location.reload())} />;
  return (
    <div className={card ? 'ws-card es' : 'es'} role="alert">
      {body}
    </div>
  );
}
