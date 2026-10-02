import OwlEmpty from '@/components/OwlEmpty';

// Coleção vazia (biblioteca, mural, resumos…) com a coruja da plataforma.
export default function EmptyCollection({ title, description, action, to, onAction, mood }) {
  return (
    <section className="ws-card collection-owl">
      <OwlEmpty title={title} text={description} action={action} to={to} onAction={onAction} mood={mood} />
    </section>
  );
}
