import { BookOpen, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function EmptyCollection({icon:Icon=BookOpen,title,description,action,to,onAction}) {
 return <section className="collection-empty"><div className="empty-visual" aria-hidden="true"><span/><span/><div><Icon size={34} strokeWidth={1.4}/></div></div><div><p className="eyebrow">UM NOVO COMEÇO</p><h2>{title}</h2><p>{description}</p>{action&&(to?<Link className="empty-action" to={to}>{action}<ArrowUpRight size={17}/></Link>:<button type="button" className="empty-action" onClick={onAction}>{action}<ArrowUpRight size={17}/></button>)}</div></section>;
}
