import {Clock3,CheckCircle2,ClipboardList,LockKeyhole} from 'lucide-react';
const states={scheduled:['Agendada',Clock3],returned:['Devolvida para refazer',ClipboardList],pending:['A entregar',ClipboardList],review:['Aguardando correção',Clock3],graded:['Corrigida',CheckCircle2],closed:['Prazo encerrado',LockKeyhole],open:['Aberta',ClipboardList],correction:['A corrigir',Clock3]};
export function activityState(activity,staff=false){
 if(staff)return activity.agendada?'scheduled':activity.encerrada?'closed':activity.entregas>activity.corrigidas+(activity.devolvidas||0)?'correction':'open';
 if(activity.minha_resposta?.reenvio)return activity.pode_reenviar?'returned':'closed';
 if(activity.minha_resposta?.nota!=null)return 'graded';
 if(activity.minha_resposta)return 'review';
 return activity.encerrada?'closed':'pending';
}
export default function StatusBadge({state='pending',label}){const [text,Icon]=states[state]||states.pending;return <span className={`status-label status-${state}`}><Icon size={13} aria-hidden="true"/>{label||text}</span>;}
