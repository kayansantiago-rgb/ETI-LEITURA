import { useState } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProgressBar from '@/components/ProgressBar';
export default function BookCard({book,isAdmin=false,onDelete}) {
 const [failed,setFailed]=useState(false);
 return <article className="book-card" data-testid={`book-card-${book.id}`}><Link to={`/book/${book.id}`} className="book-link"><div className="book-cover">{book.capa_url&&!failed?<img src={book.capa_url} alt={`Capa de ${book.titulo}`} loading="lazy" onError={()=>setFailed(true)}/>:<BookOpen size={45} className="text-slate-400"/>}</div><div className="book-card-copy"><div className="book-level">{book.nivel_ensino==='AMBOS'?'Para todos os leitores':book.nivel_ensino||'Acervo digital'}</div><h3 className="font-semibold line-clamp-2">{book.titulo}</h3><p className="truncate">{book.autor || 'Autor não informado'}</p></div></Link>{book.progress!==undefined&&<div className="book-card-progress"><ProgressBar percentage={book.progress}/></div>}{isAdmin&&onDelete&&<Button variant="destructive" size="icon" className="book-delete" aria-label={`Excluir ${book.titulo}`} onClick={()=>onDelete(book.id)}><Trash2 size={15}/></Button>}</article>;
}
