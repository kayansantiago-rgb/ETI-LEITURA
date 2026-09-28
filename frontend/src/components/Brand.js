export default function Brand({ light = false }) {
  return <div className={`brand eti-brand ${light ? 'brand-light' : ''}`}>
    <img className="eti-brand-mark" src="/eti-logo.svg" width="44" height="44" alt="" />
    <span><strong>ETI <span>LEITURA</span></strong><small>LER, IMAGINAR, TRANSFORMAR</small></span>
  </div>;
}
