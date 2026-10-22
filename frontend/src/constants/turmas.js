import { useEffect, useState } from 'react';

// Lista inicial (usada até o servidor responder). As turmas de verdade vêm de /api/classes,
// cadastradas pela coordenação; o array é atualizado no lugar para todas as telas.
export const TURMAS = [
  { value: '7º ANO', label: '7º ANO - Ensino Fundamental' },
  { value: '8º ANO', label: '8º ANO - Ensino Fundamental' },
  { value: '9º ANO', label: '9º ANO - Ensino Fundamental' },
  { value: '1º SÉRIE A', label: '1º SÉRIE A - Ensino Médio' },
  { value: '1º SÉRIE B', label: '1º SÉRIE B - Ensino Médio' },
  { value: '2º SÉRIE', label: '2º SÉRIE - Ensino Médio' },
  { value: '2º SÉRIE A', label: '2º SÉRIE A - Ensino Médio' },
  { value: '2º SÉRIE B', label: '2º SÉRIE B - Ensino Médio' },
  { value: '3º SÉRIE A', label: '3º SÉRIE A - Ensino Médio' },
  { value: '3º SÉRIE B', label: '3º SÉRIE B - Ensino Médio' },
];

const EVENT = 'eti-turmas-updated';

export async function loadTurmas() {
  try {
    const base = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
    const response = await fetch(`${base}/api/classes`, { cache: 'no-store' });
    if (!response.ok) return TURMAS;
    const list = await response.json();
    if (Array.isArray(list) && list.length) {
      TURMAS.splice(0, TURMAS.length, ...list.map(t => ({ value: t.value, label: t.label })));
      window.dispatchEvent(new Event(EVENT));
    }
  } catch {
    // Sem internet: segue com a última lista conhecida.
  }
  return TURMAS;
}

// Faz a tela atualizar quando a coordenação cria ou exclui uma turma.
export function useTurmas() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const update = () => setVersion(v => v + 1);
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, []);
  return TURMAS;
}
