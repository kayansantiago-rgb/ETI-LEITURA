import {BookOpen,Calculator,FlaskConical,Landmark,Globe2,Palette,Languages,Dumbbell,GraduationCap} from 'lucide-react';
export const normalizeSubject=value=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function subjectIdentity(value){
 const name=normalizeSubject(value);
 if(/portugues|portuguesa|literatura|redacao/.test(name))return {tone:'violet',Icon:BookOpen};
 if(/matematica/.test(name))return {tone:'blue',Icon:Calculator};
 if(/ciencias|biologia|quimica|fisica/.test(name)&&!name.includes('educacao'))return {tone:'green',Icon:FlaskConical};
 if(/historia/.test(name))return {tone:'amber',Icon:Landmark};
 if(/geografia/.test(name))return {tone:'teal',Icon:Globe2};
 if(/artes?/.test(name))return {tone:'rose',Icon:Palette};
 if(/ingles|espanhol/.test(name))return {tone:'blue',Icon:Languages};
 if(/educacao fisica/.test(name))return {tone:'green',Icon:Dumbbell};
 return {tone:'neutral',Icon:GraduationCap};
}
export default function SubjectBadge({subject}){
 const {tone,Icon}=subjectIdentity(subject);
 return <span className={`subject-badge subject-${tone}`}><Icon size={15} aria-hidden="true"/><span>{subject||'Sem disciplina'}</span></span>;
}
