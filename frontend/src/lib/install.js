import { useEffect, useState } from 'react';
import { isIOS, isStandalone } from '@/lib/push';

// O navegador avisa uma única vez, logo no carregamento, que a plataforma pode ser instalada.
// Guardamos o aviso aqui (fora do React) para usá-lo quando o aluno tocar em "Instalar".
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    try {
      localStorage.setItem('eti-app-installed', '1');
    } catch {}
    notify();
  });
}

export function registerAppWorker() {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => navigator.serviceWorker.register('/push-sw.js', { scope: '/' }).catch(() => {}));
}

const installedBefore = () => {
  try {
    return localStorage.getItem('eti-app-installed') === '1';
  } catch {
    return false;
  }
};

// 'installed' | 'prompt' (Chrome, Edge, Android) | 'ios' (Safari) | 'manual' (outros navegadores)
function currentMode() {
  if (isStandalone()) return 'installed';
  if (deferred) return 'prompt';
  if (isIOS()) return 'ios';
  if (installedBefore()) return 'installed';
  return 'manual';
}

export function useInstall() {
  const [mode, setMode] = useState(currentMode);
  useEffect(() => {
    const update = () => setMode(currentMode());
    listeners.add(update);
    update();
    return () => listeners.delete(update);
  }, []);
  const install = async () => {
    if (!deferred) return false;
    const event = deferred;
    deferred = null;
    event.prompt();
    const { outcome } = await event.userChoice.catch(() => ({ outcome: 'dismissed' }));
    notify();
    return outcome === 'accepted';
  };
  return { mode, install };
}
