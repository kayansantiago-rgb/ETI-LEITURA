import {useCallback,useEffect,useState} from 'react';
import {BookOpen,ArrowRight} from 'lucide-react';

const seenKey='eti-splash-seen';
function unseen(){try{return sessionStorage.getItem(seenKey)!=='1';}catch{return true;}}
function reducedMotion(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches||!!JSON.parse(localStorage.getItem('eti-accessibility'))?.motion;}catch{return false;}}

export default function SplashScreen({children}){
 const [visible,setVisible]=useState(unseen),[quiet,setQuiet]=useState(reducedMotion),[kind,setKind]=useState('welcome');
 useEffect(()=>{const show=e=>{if(!['login','logout'].includes(e.detail))return;try{sessionStorage.removeItem(seenKey);}catch{}setKind(e.detail);setQuiet(reducedMotion());setVisible(true);};window.addEventListener('eti-auth-transition',show);return()=>window.removeEventListener('eti-auth-transition',show);},[]);
 const finish=useCallback(()=>{try{sessionStorage.setItem(seenKey,'1');}catch{}setVisible(false);},[]);
 useEffect(()=>{if(!visible)return;const timer=setTimeout(finish,quiet?500:1800);const skip=e=>{if(e.key==='Escape')finish();};window.addEventListener('keydown',skip);return()=>{clearTimeout(timer);window.removeEventListener('keydown',skip);};},[visible,quiet,finish]);
 if(!visible)return children;
 return <main className={`eti-splash ${quiet?'splash-quiet':''}`} aria-label="Abertura da ETI LEITURA" data-transition={kind}><div className="splash-orbit splash-orbit-one" aria-hidden="true"/><div className="splash-orbit splash-orbit-two" aria-hidden="true"/><div className="splash-content"><div className="splash-emblem" aria-hidden="true"><BookOpen strokeWidth={1.4}/><span className="splash-spark"/></div><p className="splash-eyebrow">UM NOVO CAPÍTULO COMEÇA AQUI</p><h1><strong>ETI</strong> <span>LEITURA<span className="splash-dot">.</span></span></h1><p className="splash-tagline">Conhecimento que transforma.</p><div className="splash-line" aria-hidden="true"><span/></div></div><button autoFocus type="button" className="splash-skip" onClick={finish}>{kind==='logout'?'Voltar ao login':'Entrar na plataforma'} <ArrowRight size={16}/></button><span className="splash-caption" aria-hidden="true">LER. DESCOBRIR. TRANSFORMAR.</span></main>;
}
