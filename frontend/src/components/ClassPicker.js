import { Check } from 'lucide-react';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';

// Turmas que podem ver o livro. Professor escolhe entre as suas; sem nenhuma marcada (só administração), o livro é de todos.
export default function ClassPicker({ value, onChange }) {
  const user = getUser();
  const admin = user?.role === 'admin';
  const options = TURMAS.filter(t => admin || user?.turmas?.includes(t.value));
  const toggle = turma => onChange(value.includes(turma) ? value.filter(t => t !== turma) : [...value, turma]);
  return (
    <fieldset className="cp">
      <legend>Quem pode ver este livro</legend>
      <div className="cp-options">
        {options.map(t => (
          <button key={t.value} type="button" aria-pressed={value.includes(t.value)} onClick={() => toggle(t.value)}>
            {value.includes(t.value) && <Check size={13} />} {t.value}
          </button>
        ))}
      </div>
      <small>
        {admin
          ? value.length
            ? `Somente ${value.join(', ')} verão este livro.`
            : 'Nenhuma turma marcada: o livro aparece para todas as turmas da etapa escolhida.'
          : value.length
            ? `Somente ${value.join(', ')} verão este livro.`
            : 'Marque pelo menos uma das suas turmas.'}
      </small>
    </fieldset>
  );
}

export const defaultClasses = () => {
  const user = getUser();
  return user?.role === 'teacher' ? [...(user.turmas || [])] : [];
};
