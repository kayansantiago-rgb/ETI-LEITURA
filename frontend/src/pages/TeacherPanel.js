import {getUser} from '@/lib/auth';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Video, Users, Library, FileText, PenTool, ImageIcon, CalendarDays, Plus, ArrowUpRight, GraduationCap, ClipboardList } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const areas = [
 {icon:Users,title:'Minhas turmas',description:'Alunos, atividades, materiais e notas reunidos por turma.',path:'/admin/classes',category:'ENSINO'},
 {icon:FileText,title:'Banco de notas',description:'Notas por aluno, disciplina e bimestre, com lançamentos e médias.',path:'/gradebook',category:'AVALIAÇÃO'},
 {icon:ClipboardList,title:'Critérios de correção',description:'Defina os pontos de cada critério e reutilize seus modelos.',path:'/admin/rubrics',category:'AVALIAÇÃO'},
 {icon:Sparkles,title:'Assistente IA',description:'Prepare atividades e revise sugestões de correção.',path:'/admin/assistant',category:'PLANEJAMENTO'},
 {icon:Video,title:'Vídeos e materiais',description:'Compartilhe aulas e materiais de estudo por disciplina e turma.',path:'/videos',category:'ENSINO'},
 {icon: ClipboardList,title:'Entregas e pendências',description:'Quem entregou, quem falta entregar e o que precisa de correção.',path:'/workspace',category:'PRIORIDADES'},
 {icon: FileText,title:'Relatórios',description:'Leituras, participação, médias e exportação por turma.',path:'/admin/reports',category:'RESULTADOS'},
 {icon: Users,title:'Contas dos professores',description:'Contas individuais e permissões por turma.',path:'/admin/teachers',category:'ADMINISTRAÇÃO'},
 { icon: ClipboardList, title: 'Atividades', description: 'Crie perguntas por turma, receba respostas e envie correções.', path: '/admin/activities', category: 'ENSINO E APRENDIZAGEM' },
 { icon: Users, title: 'Alunos e turmas', description: 'Consulte os alunos e acompanhe suas entregas por turma.', path: '/admin/users', category: 'COMUNIDADE' },
 { icon: FileText, title: 'Resumos dos alunos', description: 'Leia os resumos, atribua notas e envie seu feedback.', path: '/admin/summaries', category: 'ACOMPANHAMENTO' },
 { icon: PenTool, title: 'Produções textuais', description: 'Acompanhe a escrita dos alunos e faça as correções.', path: '/admin/text-productions', category: 'ACOMPANHAMENTO' },
 { icon: Library, title: 'Acervo de livros', description: 'Organize os livros, os PDFs e os níveis de ensino.', path: '/admin/books', category: 'BIBLIOTECA' },
 { icon: ImageIcon, title: 'Mural da escola', description: 'Compartilhe avisos, imagens e vídeos com os alunos.', path: '/admin/mural', category: 'COMUNICAÇÃO' },
];
export default function TeacherPanel() {
 const [stats,setStats]=useState(null);
 const [failed,setFailed]=useState(false);
 const load=()=>{setFailed(false);api.get('/admin/stats').then(r=>setStats(r.data)).catch(()=>setFailed(true));};
 useEffect(()=>{load();},[]);
 const available=areas.filter(a=>getUser()?.role==='admin'||!['/admin/teachers','/admin/mural'].includes(a.path));
 return <DashboardLayout><div data-testid="teacher-panel" className="educator-home">
  <header className="educator-heading"><div><p className="eyebrow">ORGANIZE. ENSINE. ACOMPANHE.</p><h1>Painel do professor<span className="title-dot" aria-hidden="true">.</span></h1><p>Olá, {getUser()?.nome?.split(' ')[0]}. O que vamos organizar hoje?</p></div></header>
  <section className="teacher-quick-actions" aria-label="Ações rápidas">{[[Plus,'Criar atividade','Prepare uma proposta para a turma.','/admin/activities?nova=1'],[ClipboardList,'Corrigir entregas','Veja o que aguarda sua avaliação.','/workspace'],[FileText,'Lançar nota','Registre uma avaliação no banco de notas.','/gradebook?novo=1']].map(([Icon,title,text,to])=><Link to={to} key={to}><span className="quick-action-icon"><Icon size={22}/></span><div><h2>{title}</h2><p>{text}</p></div><ArrowUpRight size={18}/></Link>)}</section>
  {failed?<div className="empty-state" role="alert">Não foi possível carregar os indicadores. <button onClick={load} className="underline">Tentar novamente</button></div>:<section className="educator-numbers" aria-label="Indicadores da escola">{[[Users,'Alunos',stats?.total_users,'/admin/users'],[Library,'Livros no acervo',stats?.total_books,'/admin/books'],[FileText,'Resumos',stats?.total_summaries,'/admin/summaries'],[PenTool,'Produções',stats?.total_productions,'/admin/text-productions']].map(([Icon,label,value,path])=><Link key={label} to={path}><span><Icon size={17}/>{label}</span><strong>{value??'—'}<ArrowUpRight size={20}/></strong></Link>)}</section>}
  <section className="educator-workbench"><div className="workbench-heading"><span className="eyebrow">ÁREAS DE TRABALHO</span><h2>Ferramentas da escola.</h2><Button asChild variant="outline"><Link to="/admin/add-book"><Plus size={16}/>Adicionar livro</Link></Button></div><div className="workbench-list">{available.filter(a=>a.path!=='/workspace').map(({icon:Icon,title,description,path},i)=><Link to={path} className="workbench-row" key={path}><span className="workbench-number">{String(i+1).padStart(2,'0')}</span><Icon size={21}/><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight size={20} className="workbench-arrow"/></Link>)}</div></section>
 </div></DashboardLayout>;
}
