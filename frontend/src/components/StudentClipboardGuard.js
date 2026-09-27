import { useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { toast } from 'sonner';

// A browser interaction rule, not proof of authorship or a security boundary.
export default function StudentClipboardGuard({ children }) {
  useEffect(() => {
    const student = () => getUser()?.role === 'student';
    const block = event => {
      if (!student()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toast.info('Copiar, recortar e colar estão desativados para alunos. Escreva suas respostas diretamente na plataforma.', { id: 'student-clipboard', duration: 4500 });
    };
    const shortcut = event => {
      const key = event.key.toLowerCase();
      const clipboard = ((event.ctrlKey || event.metaKey) && !event.altKey && ['c', 'x', 'v'].includes(key)) ||
        (event.ctrlKey && key === 'insert') || (event.shiftKey && ['insert', 'delete'].includes(key));
      if (clipboard) block(event);
    };
    const beforeInput = event => {
      if (['insertFromPaste', 'insertFromPasteAsQuotation', 'insertFromDrop', 'deleteByCut', 'deleteByDrag'].includes(event.inputType)) block(event);
    };
    const textDrop = event => {
      const types = Array.from(event.dataTransfer?.types || []);
      if (!types.includes('Files') && types.some(type => ['text/plain', 'text/html', 'text/uri-list'].includes(type))) block(event);
    };
    const handlers = { copy: block, cut: block, paste: block, keydown: shortcut, beforeinput: beforeInput, drop: textDrop };
    // Capture at document level also covers dialogs rendered through portals.
    Object.entries(handlers).forEach(([name, handler]) => document.addEventListener(name, handler, true));
    return () => Object.entries(handlers).forEach(([name, handler]) => document.removeEventListener(name, handler, true));
  }, []);
  return children;
}
