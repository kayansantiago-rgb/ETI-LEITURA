import { Bell, CheckCheck, ArrowUpRight, Inbox, TrendingUp, Users, BookOpen, AlertTriangle, Search, FileDown, FileSpreadsheet, ArrowUp, ArrowDown } from 'lucide-react';
import '@/notifications.css';
import StatusBadge from '@/components/StatusBadge';
import PushSettings from '@/components/PushSettings';
import PageIntro from '@/components/PageIntro';
import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';
import { deadline, activityError } from '@/pages/Activities';
function useLoad(path) {
 const [data,setData]=useState(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;setData(null);setFailed(false);api.get(path).then(r=>{if(alive)setData(r.data);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[path]);
 return [data,setData,failed];
}
function Page({title,description,children}) {return <DashboardLayout><PageIntro section={getUser()?.role==='student'?'SEU ESPAÇO / APRENDIZAGEM':'GESTÃO / ACOMPANHAMENTO'} title={title} description={description}/><div className="school-page-content">{children}</div></DashboardLayout>;}
function Loading({failed}) {return <p role={failed?'alert':'status'} className="empty-state">{failed?'Não foi possível carregar. Atualize a página para tentar novamente.':'Carregando…'}</p>;}
export function Workspace() {
 const [data,,failed]=useLoad('/workspace'),student=getUser()?.role==='student';
 return <Page title={student?'Minhas pendências':'Entregas e pendências'} description={student?'Organize as próximas entregas e acompanhe suas correções.':'Veja quem entregou, quem falta entregar e o que precisa de correção.'}>{!data?<Loading failed={failed}/>:<div className="space-y-5"><div className="flex flex-wrap gap-3">{data.correcoes.map(c=><Button variant="outline" asChild key={c.link}><Link to={c.link}>{c.titulo}: {c.quantidade} para corrigir</Link></Button>)}</div>{!data.atividades.length&&<p className="empty-state">Nenhuma atividade disponível.</p>}{[...data.atividades].sort((a,b)=>(a.prazo||'9999').localeCompare(b.prazo||'9999')).map(a=><article key={a.id} className="panel space-y-3"><div className="flex justify-between flex-wrap gap-3"><h2>{a.titulo}</h2><StatusBadge state={student?({'Devolvida':'returned','Corrigida':'graded','Entregue':'review','Prazo encerrado':'closed'}[a.estado]||'pending'):a.corrigir?'correction':'graded'} label={student?undefined:`${a.corrigir} para corrigir`}/></div><p className="text-sm text-muted-foreground">Prazo: {deadline(a.prazo)}</p>{!student&&<div className="grid sm:grid-cols-2 gap-4"><details><summary className="cursor-pointer text-primary">Entregaram ({a.entregaram.length})</summary><ul className="text-sm mt-3 space-y-1">{a.entregaram.map((name,i)=><li key={i}>{name}</li>)}</ul></details><details><summary className="cursor-pointer text-primary">Faltam entregar ({a.faltam.length})</summary><ul className="text-sm mt-3 space-y-1">{a.faltam.map((name,i)=><li key={i}>{name}</li>)}</ul></details></div>}<Button asChild variant="outline"><Link to={a.link}>Abrir atividade</Link></Button></article>)}</div>}</Page>;
}
export function Notifications() {
 const [data,setData,failed]=useLoad('/notifications');
 const [onlyUnread,setOnlyUnread]=useState(false);
 const readAll=async()=>{try{await api.post('/notifications/read-all');setData(list=>list.map(n=>({...n,lida:true})));window.dispatchEvent(new Event('eti-notices'));}catch{toast.error('Não foi possível marcar os avisos.');}};
 const read=async item=>{try{await api.post('/notifications/read',{id:item.id});setData(list=>list.map(x=>x.id===item.id?{...x,lida:true}:x));window.dispatchEvent(new Event('eti-notices'));}catch{toast.error('Não foi possível marcar o aviso como lido.');}};
 const unread=data?.filter(n=>!n.lida).length||0;
 return <Page title="Sua central de avisos" description="Tudo o que merece sua atenção, em um só lugar."><div className="notice-center"><PushSettings/>{!data?<Loading failed={failed}/>:<><div className="notice-toolbar"><div className="notice-tabs"><button aria-pressed={!onlyUnread} onClick={()=>setOnlyUnread(false)}>Todos <span>{data.length}</span></button><button aria-pressed={onlyUnread} onClick={()=>setOnlyUnread(true)}>Não lidos <span>{unread}</span></button></div><Button variant="ghost" disabled={!unread} onClick={readAll}><CheckCheck size={16}/>Marcar todos como lidos</Button></div><div className="notice-list">{data.filter(n=>!onlyUnread||!n.lida).map(n=><article key={n.id} className={`notice-card ${n.lida?'is-read':'is-new'}`}><div className="notice-icon"><Bell size={20}/></div><div className="notice-copy"><div className="notice-meta"><span>{n.lida?'Lido':'Novo aviso'}</span><time>{Number.isNaN(Date.parse(n.data))?'':new Date(n.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</time></div><h2>{n.titulo}</h2><div className="notice-actions"><Link to={n.link} onClick={()=>read(n)}>Abrir aviso <ArrowUpRight size={15}/></Link>{!n.lida&&<button onClick={()=>read(n)}><CheckCheck size={15}/>Marcar como lido</button>}</div></div>{!n.lida&&<span className="notice-dot" aria-label="Não lido"/>}</article>)}</div>{!data.some(n=>!onlyUnread||!n.lida)&&<div className="notice-empty"><Inbox size={36}/><h2>Tudo em dia por aqui</h2><p>Os próximos avisos aparecerão neste espaço.</p></div>}</>}</div></Page>;
}
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const brNum = (value, digits = 1) => (value == null ? '—' : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
const gradeTone = value => (value == null ? 'is-none' : value >= 7 ? 'is-high' : value >= 5 ? 'is-mid' : 'is-low');
const nameInitials = name => (name || 'A').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
const plain = text => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function EvolutionChart({ data }) {
  const items = data.slice(-12);
  if (!items.length)
    return (
      <div className="ws-empty">
        <TrendingUp size={26} />
        <h3>Sem correções ainda</h3>
        <p>As médias mensais aparecem após as primeiras correções.</p>
      </div>
    );
  const w = 560, h = 220, pad = { l: 28, r: 8, t: 22, b: 26 };
  const step = (w - pad.l - pad.r) / items.length;
  const bar = Math.min(34, step * 0.56);
  const y = v => pad.t + (h - pad.t - pad.b) * (1 - v / 10);
  return (
    <svg className="rp-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Evolução mensal das médias">
      <defs>
        <linearGradient id="rp-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(258 72% 62%)" />
          <stop offset="100%" stopColor="hsl(238 70% 58%)" />
        </linearGradient>
      </defs>
      {[0, 2, 4, 6, 8, 10].map(v => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} className="rp-gridline" />
          <text x={pad.l - 8} y={y(v) + 3} textAnchor="end" className="rp-axis">
            {v}
          </text>
        </g>
      ))}
      {items.map((m, i) => {
        const x = pad.l + step * i + (step - bar) / 2;
        const [year, month] = m.mes.split('-');
        return (
          <g key={m.mes}>
            <title>{`${MONTHS[Number(month) - 1]}/${year}: média ${brNum(m.media)} em ${m.avaliacoes} avaliações`}</title>
            <rect x={x} y={y(m.media)} width={bar} height={y(0) - y(m.media)} rx="6" fill="url(#rp-bar)" />
            <text x={x + bar / 2} y={y(m.media) - 6} textAnchor="middle" className="rp-value">
              {brNum(m.media)}
            </text>
            <text x={x + bar / 2} y={h - 8} textAnchor="middle" className="rp-axis">
              {`${MONTHS[Number(month) - 1]}/${year.slice(2)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Distribution({ students }) {
  const graded = students.filter(s => s.media != null).map(s => s.media);
  const buckets = [
    ['Abaixo de 5', 0, 5, 'is-low'],
    ['De 5 a 6,9', 5, 7, 'is-mid'],
    ['De 7 a 8,9', 7, 9, 'is-high'],
    ['9 ou mais', 9, 10.01, 'is-top']
  ];
  return (
    <div className="rp-dist">
      {buckets.map(([label, low, high, cls]) => {
        const count = graded.filter(v => v >= low && v < high).length;
        return (
          <div key={label} className={cls}>
            <span>{label}</span>
            <span className="rp-dist-bar">
              <span style={{ width: graded.length ? `${(count / graded.length) * 100}%` : 0 }} />
            </span>
            <strong>{count}</strong>
          </div>
        );
      })}
      <p>{students.length - graded.length} aluno(s) ainda sem nota</p>
    </div>
  );
}

export function Reports() {
  const user = getUser();
  const [turma, setTurma] = useState('');
  const [data, , failed] = useLoad('/admin/reports' + (turma ? '?turma=' + encodeURIComponent(turma) : ''));
  const [sort, setSort] = useState(['nome', 1]);
  const [query, setQuery] = useState('');
  const [downloading, setDownloading] = useState('');
  const classes = TURMAS.filter(t => user?.role === 'admin' || user?.turmas?.includes(t.value));

  const download = async kind => {
    setDownloading(kind);
    try {
      const r = await api.get(`/admin/reports.${kind}`, { params: turma ? { turma } : {}, responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eti-relatorio${turma ? '-' + plain(turma).replace(/[^a-z0-9]+/g, '-') : ''}.${kind}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(kind === 'pdf' ? 'Relatório em PDF gerado.' : 'Planilha exportada.');
    } catch {
      toast.error('Não foi possível gerar o arquivo. Tente novamente.');
    } finally {
      setDownloading('');
    }
  };

  const students = data?.alunos || [];
  const graded = students.filter(s => s.media != null);
  const participation = students.filter(s => s.participacao != null);
  const stats = {
    media: graded.length ? graded.reduce((s, a) => s + a.media, 0) / graded.length : null,
    participacao: participation.length ? participation.reduce((s, a) => s + a.participacao, 0) / participation.length : null,
    leituras: students.reduce((s, a) => s + (a.leituras_concluidas || 0), 0),
    atencao: graded.filter(s => s.media < 6).length
  };
  const [key, dir] = sort;
  const rows = students
    .filter(s => plain(s.nome).includes(plain(query)))
    .sort((a, b) => {
      const x = a[key], y = b[key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y, 'pt-BR') : x - y) * dir;
    });
  const column = (k, label, cls = '') => (
    <th className={cls} aria-sort={key === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="rp-sort" onClick={() => setSort([k, key === k ? -dir : k === 'nome' || k === 'turma' ? 1 : -1])}>
        {label}
        {key === k && (dir > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <DashboardLayout>
      <PageIntro
        section="GESTÃO / RELATÓRIOS"
        title="Relatório escolar"
        description="Participação, leituras e desempenho da turma, prontos para baixar em PDF e compartilhar com a coordenação."
      >
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filtrar relatório por turma" className="rp-select" value={turma} onChange={e => setTurma(e.target.value)}>
            <option value="">Todas as minhas turmas</option>
            {classes.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Button variant="outline" disabled={!data || !!downloading} onClick={() => download('csv')}>
            <FileSpreadsheet size={16} /> {downloading === 'csv' ? 'Gerando…' : 'CSV'}
          </Button>
          <Button className="qz-btn-primary" disabled={!data || !!downloading} onClick={() => download('pdf')}>
            <FileDown size={16} /> {downloading === 'pdf' ? 'Gerando PDF…' : 'Baixar PDF'}
          </Button>
        </div>
      </PageIntro>
      {!data ? (
        <div className="ws-card ws-empty" role={failed ? 'alert' : 'status'}>
          {failed ? 'Não foi possível carregar. Atualize a página para tentar novamente.' : 'Carregando relatório…'}
        </div>
      ) : (
        <>
          <section className="ws-kpis">
            <article className="ws-card ws-kpi is-featured">
              <span className="ws-kpi-icon">
                <TrendingUp size={18} />
              </span>
              <span>Média da turma</span>
              <strong>
                {brNum(stats.media)}
                <small> /10</small>
              </strong>
              <p>{graded.length} aluno(s) com nota</p>
            </article>
            <article className="ws-card ws-kpi">
              <span className="ws-kpi-icon">
                <Users size={18} />
              </span>
              <span>Alunos</span>
              <strong>{students.length}</strong>
              <p>{turma || 'Todas as turmas'}</p>
            </article>
            <article className="ws-card ws-kpi">
              <span className="ws-kpi-icon">
                <CheckCheck size={18} />
              </span>
              <span>Participação média</span>
              <strong>
                {stats.participacao == null ? '—' : Math.round(stats.participacao)}
                <small>%</small>
              </strong>
              <p>Atividades entregues</p>
            </article>
            <article className="ws-card ws-kpi">
              <span className="ws-kpi-icon">
                <BookOpen size={18} />
              </span>
              <span>Leituras concluídas</span>
              <strong>{stats.leituras}</strong>
              <p>Livros lidos até o fim</p>
            </article>
            <article className="ws-card ws-kpi">
              <span className="ws-kpi-icon gb-warn">
                <AlertTriangle size={18} />
              </span>
              <span>Em atenção</span>
              <strong>{stats.atencao}</strong>
              <p>Média abaixo de 6</p>
            </article>
          </section>

          <div className="rp-grid">
            <section className="ws-card rp-panel">
              <header>
                <h2>Evolução mensal das notas</h2>
                <span>Média das avaliações corrigidas em cada mês</span>
              </header>
              <EvolutionChart data={data.evolucao} />
            </section>
            <section className="ws-card rp-panel">
              <header>
                <h2>Distribuição das médias</h2>
                <span>Quantos alunos em cada faixa</span>
              </header>
              <Distribution students={students} />
            </section>
          </div>

          <section className="ws-card rp-table-card">
            <header className="rp-table-head">
              <h2>Desempenho por aluno</h2>
              <label className="ws-search">
                <Search size={16} />
                <input aria-label="Buscar aluno" placeholder="Buscar aluno…" value={query} onChange={e => setQuery(e.target.value)} />
              </label>
            </header>
            <div className="ws-table-wrap">
              <table className="ws-table">
                <thead>
                  <tr>
                    {column('nome', 'Aluno')}
                    {column('turma', 'Turma')}
                    {column('leituras_concluidas', 'Leituras', 'is-center')}
                    {column('resumos', 'Resumos', 'is-center')}
                    {column('producoes', 'Produções', 'is-center')}
                    {column('participacao', 'Participação')}
                    {column('media', 'Média', 'is-center')}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="ws-person">
                          <span className="ws-avatar">{nameInitials(a.nome)}</span>
                          <div className="min-w-0">
                            <strong>{a.nome}</strong>
                            <small>{a.atividades_entregues} atividade(s) entregue(s)</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="ws-chip">{a.turma || '—'}</span>
                      </td>
                      <td className="is-center">{a.leituras_concluidas}</td>
                      <td className="is-center">{a.resumos}</td>
                      <td className="is-center">{a.producoes}</td>
                      <td>
                        {a.participacao == null ? (
                          <span className="rp-muted">Sem atividades</span>
                        ) : (
                          <div className="rp-part">
                            <span className="ws-meter">
                              <span style={{ width: `${a.participacao}%` }} />
                            </span>
                            <b>{a.participacao}%</b>
                          </div>
                        )}
                      </td>
                      <td className="is-center">
                        <span className={`ws-score ${gradeTone(a.media)}`}>{brNum(a.media)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <div className="ws-empty">
                  <Users size={26} />
                  <h3>Nenhum aluno encontrado</h3>
                  <p>Ajuste a turma ou a busca.</p>
                </div>
              )}
            </div>
          </section>
          <p className="gb-footnote">
            Médias na escala de 0 a 10; atividades que valem outra pontuação são convertidas proporcionalmente. Sem nota não conta como zero e o relatório não
            define aprovação escolar.
          </p>
        </>
      )}
    </DashboardLayout>
  );
}
export function RecoveryButton({userId}) {
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false);
 const generate=async()=>{setBusy(true);try{setUrl((await api.post(`/admin/users/${userId}/recovery`)).data.url);}catch{toast.error('Não foi possível gerar o link.');}finally{setBusy(false);}};
 return <div><Button type="button" variant="outline" size="sm" disabled={busy} onClick={generate}>Gerar link de nova senha</Button>{url&&<div className="mt-3 space-y-2"><p className="text-xs text-muted-foreground">Copie e entregue apenas ao titular da conta. Uso único, válido por 30 minutos.</p><Input aria-label="Link para redefinir senha" readOnly value={url} onFocus={e=>e.target.select()}/><Button size="sm" variant="ghost" onClick={()=>setUrl('')}>Ocultar link</Button></div>}</div>;
}
function TeacherCard({teacher,onChange}) {
 const [classes,setClasses]=useState(teacher.turmas||[]),[busy,setBusy]=useState(false);
 const save=async(active)=>{setBusy(true);try{await api.put(`/admin/teachers/${teacher.id}`,{turmas:classes,active});toast.success('Permissões atualizadas.');onChange();}catch(e){toast.error(activityError(e,'Selecione pelo menos uma turma.'));}finally{setBusy(false);}};
 return <article className="panel space-y-4"><div><h2>{teacher.nome}</h2><p className="text-sm text-muted-foreground">{teacher.email} · {teacher.active===false?'Conta desativada':'Conta ativa'}</p></div><ClassChoices value={classes} onChange={setClasses}/><div className="flex flex-wrap gap-3"><Button disabled={busy||!classes.length} onClick={()=>save(teacher.active!==false)}>Salvar turmas</Button><Button variant="outline" disabled={busy||!classes.length} onClick={()=>save(teacher.active===false)}>{teacher.active===false?'Ativar conta':'Desativar conta'}</Button></div><RecoveryButton userId={teacher.id}/></article>;
}
function ClassChoices({value,onChange}) {return <fieldset><legend className="text-sm font-semibold mb-3">Turmas autorizadas</legend><div className="flex flex-wrap gap-3">{TURMAS.map(t=><label className="border rounded-lg p-2 text-sm flex gap-2" key={t.value}><input type="checkbox" checked={value.includes(t.value)} onChange={e=>onChange(e.target.checked?[...value,t.value]:value.filter(x=>x!==t.value))}/>{t.label}</label>)}</div></fieldset>;}
export function Teachers() {
 const [revision,setRevision]=useState(0),[data,,failed]=useLoad('/admin/teachers?revision='+revision),[busy,setBusy]=useState(false);
 const empty={nome:'',email:'',password:'',turmas:[]},[form,setForm]=useState(empty);
 const create=async e=>{e.preventDefault();setBusy(true);try{await api.post('/admin/teachers',form);setForm(empty);setRevision(v=>v+1);toast.success('Conta do professor criada.');}catch(e){toast.error(activityError(e,'Confira os dados e selecione uma turma.'));}finally{setBusy(false);}};
 return <Page title="Contas dos professores" description="Cada professor acessa com sua conta e acompanha apenas as turmas autorizadas."><form className="panel space-y-4 mb-6" onSubmit={create}><h2>Novo professor</h2>{[['nome','Nome','text'],['email','E-mail','email'],['password','Senha inicial (mínimo 10 caracteres)','password']].map(([key,label,type])=><div key={key}><Label htmlFor={'teacher-'+key}>{label}</Label><Input id={'teacher-'+key} type={type} required minLength={key==='password'?10:2} maxLength={key==='password'?72:160} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></div>)}<ClassChoices value={form.turmas} onChange={turmas=>setForm({...form,turmas})}/><Button disabled={busy||!form.turmas.length} type="submit">Criar conta do professor</Button></form>{!data?<Loading failed={failed}/>:<div className="space-y-5">{data.map(t=><TeacherCard key={t.id+JSON.stringify(t)} teacher={t} onChange={()=>setRevision(v=>v+1)}/>)}{!data.length&&<p className="empty-state">Cadastre o primeiro professor.</p>}</div>}</Page>;
}
export function PasswordRecovery() {
 const [params]=useSearchParams(),token=params.get('token'),navigate=useNavigate();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const submit=async e=>{e.preventDefault();setBusy(true);try{const r=await api.post(token?'/auth/reset-password':'/auth/forgot-password',token?{token,password}:{email});setMessage(r.data.message);if(token){toast.success('Senha atualizada.');navigate('/login');}}catch(e){setMessage(activityError(e,'Não foi possível concluir. Tente novamente.'));}finally{setBusy(false);}};
 return <main className="min-h-screen bg-background flex items-center justify-center p-5"><form onSubmit={submit} className="panel w-full max-w-md space-y-5"><p className="eyebrow">ETI LEITURA</p><h1 className="text-2xl">{token?'Escolha uma nova senha':'Recuperar acesso'}</h1><p className="text-sm text-muted-foreground">{token?'O link pode ser utilizado uma única vez.':'Informe seu e-mail. Se o envio de e-mails ainda não estiver configurado, solicite um link ao administrador da escola.'}</p><div><Label htmlFor="recovery-value">{token?'Nova senha (mínimo 10 caracteres)':'E-mail'}</Label><Input id="recovery-value" type={token?'password':'email'} minLength={token?10:undefined} maxLength={token?72:254} required value={token?password:email} onChange={e=>token?setPassword(e.target.value):setEmail(e.target.value)}/></div><Button type="submit" disabled={busy}>{busy?'Aguarde…':token?'Salvar nova senha':'Solicitar recuperação'}</Button>{message&&<p role="status" className="text-sm">{message}</p>}<Link className="block text-sm text-primary" to="/login">Voltar para entrar</Link></form></main>;
}
