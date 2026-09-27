export default function LoadingCards({label='Carregando…',count=3}){
 return <div role="status" aria-live="polite"><span className="sr-only">{label}</span><div className="loading-cards" aria-hidden="true">{Array.from({length:count},(_,i)=><div className="loading-card" key={i}><div/><span/><span/></div>)}</div></div>;
}
