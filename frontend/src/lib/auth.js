import {detachPush,savedDevice} from '@/lib/push';
const parseUser = value => { try { return JSON.parse(value); } catch { return null; } };

export const setAuth = (token, user) => {
  if(savedDevice()?.userId && savedDevice().userId!==user.id)detachPush().catch(()=>{});
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('eti-auth-transition', {detail:'login'}));
};

export const getAuth = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? parseUser(userStr) : null;
  return { token, user };
};

export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? parseUser(userStr) : null;
};

// Atualiza só alguns campos do usuário salvo (ex.: moldura, termos aceitos).
export const updateUser = patch => {
  const user = getUser();
  if (!user) return;
  localStorage.setItem('user', JSON.stringify({ ...user, ...patch }));
  window.dispatchEvent(new CustomEvent('eti-user-updated'));
};

// Livros guardados para leitura sem internet pertencem a quem estava logado: saem junto com a conta.
const clearOfflineBooks = async () => {
  try {
    Object.keys(localStorage).filter(k => k.startsWith('eti-offline-book:')).forEach(k => localStorage.removeItem(k));
    if ('caches' in window) await caches.delete('eti-books-v1');
  } catch {}
};

export const clearAuth = async () => {
  await detachPush().catch(()=>{});
  await clearOfflineBooks();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('eti-auth-transition', {detail:'logout'}));
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
