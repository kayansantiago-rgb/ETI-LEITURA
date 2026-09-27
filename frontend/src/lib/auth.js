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

export const clearAuth = async () => {
  await detachPush().catch(()=>{});
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('eti-auth-transition', {detail:'logout'}));
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
