import { useEffect, useState } from 'react';
import { getUser } from '@/lib/auth';
const key = name => `eti-draft:${getUser()?.id}:${name}`;
export function readDraft(name, fallback) { try { return JSON.parse(localStorage.getItem(key(name)))?.value ?? fallback; } catch { return fallback; } }
export function clearDraft(name) { try { localStorage.removeItem(key(name)); } catch {} }
export default function useDraft(name, value, enabled=true) {
 const [status,setStatus]=useState('');
 useEffect(()=>{if(!enabled)return;try{localStorage.setItem(key(name),JSON.stringify({value,at:Date.now()}));setStatus('Rascunho salvo neste navegador, mesmo sem internet. Envie quando terminar.');}catch{setStatus('Não foi possível guardar o rascunho. Mantenha esta página aberta e envie seu texto.');}},[name,value,enabled]);
 return status;
}
