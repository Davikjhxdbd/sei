import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, BriefcaseBusiness, CalendarDays, Check,
  CheckCircle2, Circle, Clock3, FolderKanban, ListTodo, Plus, Search,
  Sparkles, Target, X, Pause, Play, Archive,
} from 'lucide-react';
import { get, patch, post } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useToast } from '../components/Toast';
import { useAuth } from '../lib/auth';

type Project = {
  id: string; owner_id: string; owner_name: string; name: string; description: string | null; status: 'active'|'paused'|'completed'|'archived';
  due_date: string | null; task_count: number; completed_tasks: number;
};
type Task = {
  id: string; owner_id: string; created_by: string; assignee_name: string; project_id: string | null; title: string; description: string | null;
  status: 'todo'|'doing'|'waiting'|'done'|'archived'; priority: 'low'|'normal'|'high'|'urgent';
  due_date: string | null; project_name: string | null;
};
type Overview = { projects: Project[]; tasks: Task[]; totals: {open_tasks:number;doing_tasks:number;completed_this_week:number;overdue_tasks:number} };

const taskStatus: Record<Task['status'], string> = { todo:'A fazer', doing:'Em andamento', waiting:'Aguardando', done:'Concluída', archived:'Arquivada' };
const priorityLabel: Record<Task['priority'], string> = { low:'Baixa', normal:'Normal', high:'Alta', urgent:'Urgente' };
const projectStatus: Record<Project['status'], string> = { active:'Em andamento', paused:'Pausado', completed:'Concluído', archived:'Arquivado' };
const dateText = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value.slice(0,10)}T00:00:00Z`)) : 'Sem prazo';

export default function ManagementWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'projetos' ? 'projetos' : 'tarefas';
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Overview>('/workspace/overview');
  const { level, user } = useAuth();
  const people = useApi<{items:{id:string;full_name:string}[]}> (level >= 3 ? '/catalog/people' : null);
  const [query,setQuery] = useState('');
  const [showForm,setShowForm] = useState(false);
  const [saving,setSaving] = useState(false);
  const [editingTask,setEditingTask] = useState<Task | null>(null);
  const [taskTitle,setTaskTitle] = useState('');
  const [taskDescription,setTaskDescription] = useState('');
  const [taskProject,setTaskProject] = useState('');
  const [taskDue,setTaskDue] = useState('');
  const [taskPriority,setTaskPriority] = useState<Task['priority']>('normal');
  const [taskAssignee,setTaskAssignee] = useState('');
  const [projectName,setProjectName] = useState('');
  const [projectDescription,setProjectDescription] = useState('');
  const [projectDue,setProjectDue] = useState('');
  const [projectAssignee,setProjectAssignee] = useState('');
  const [editingProject,setEditingProject] = useState<Project | null>(null);

  const tasks = useMemo(() => (data?.tasks ?? []).filter(t => t.status !== 'archived').filter(t => {
    const q=query.trim().toLocaleLowerCase('pt-BR');
    return !q || t.title.toLocaleLowerCase('pt-BR').includes(q) || (t.project_name ?? '').toLocaleLowerCase('pt-BR').includes(q);
  }),[data,query]);
  const projects = useMemo(() => (data?.projects ?? []).filter(p => p.status !== 'archived').filter(p => {
    const q=query.trim().toLocaleLowerCase('pt-BR');
    return !q || p.name.toLocaleLowerCase('pt-BR').includes(q);
  }),[data,query]);

  function newTask() {
    setEditingTask(null); setTaskTitle(''); setTaskDescription(''); setTaskProject('');
    setTaskDue(''); setTaskPriority('normal'); setTaskAssignee(user?.id ?? ''); setShowForm(true);
  }
  function editTask(task:Task) {
    setEditingTask(task); setTaskTitle(task.title); setTaskDescription(task.description ?? '');
    setTaskProject(task.project_id ?? ''); setTaskDue(task.due_date?.slice(0,10) ?? '');
    setTaskPriority(task.priority); setTaskAssignee(task.owner_id); setShowForm(true);
  }
  function newProject() {
    setEditingProject(null); setProjectName(''); setProjectDescription(''); setProjectDue(''); setProjectAssignee(user?.id ?? ''); setShowForm(true);
  }
  function editProject(project:Project) {
    setEditingProject(project); setProjectName(project.name); setProjectDescription(project.description ?? '');
    setProjectDue(project.due_date?.slice(0,10) ?? ''); setProjectAssignee(project.owner_id); setShowForm(true);
  }
  async function saveTask(event:React.FormEvent) {
    event.preventDefault(); if(!taskTitle.trim()) return;
    setSaving(true);
    try {
      const body={title:taskTitle,description:taskDescription,project_id:taskProject||null,due_date:taskDue||null,priority:taskPriority,assigned_to:taskAssignee||user?.id};
      if(editingTask) await patch(`/workspace/tasks/${editingTask.id}`,body); else await post('/workspace/tasks',body);
      setShowForm(false); reload(); toast.push(editingTask?'Tarefa atualizada.':'Tarefa adicionada à sua mesa.');
    } catch(e:any){toast.push(e?.message ?? 'Não foi possível salvar a tarefa.','error');}
    finally{setSaving(false);}
  }
  async function saveProject(event:React.FormEvent) {
    event.preventDefault(); if(!projectName.trim()) return;
    setSaving(true);
    try {
      const body={name:projectName,description:projectDescription,due_date:projectDue||null,owner_id:projectAssignee||user?.id};
      if(editingProject) await patch(`/workspace/projects/${editingProject.id}`,body); else await post('/workspace/projects',body);
      setShowForm(false); reload(); toast.push(editingProject?'Projeto atualizado.':'Projeto criado no seu escritório.');
    } catch(e:any){toast.push(e?.message ?? 'Não foi possível salvar o projeto.','error');}
    finally{setSaving(false);}
  }
  async function updateTask(task:Task, changes:Partial<Task>) {
    try { await patch(`/workspace/tasks/${task.id}`,changes); reload(); }
    catch(e:any){toast.push(e?.message ?? 'Não foi possível atualizar.','error');}
  }
  async function updateProject(project:Project,status:Project['status']) {
    try { await patch(`/workspace/projects/${project.id}`,{status}); reload(); }
    catch(e:any){toast.push(e?.message ?? 'Não foi possível atualizar.','error');}
  }

  const activeProjects=(data?.projects??[]).filter(p=>p.status==='active').length;
  const overdue=(data?.totals?.overdue_tasks??0);
  return <main className="min-h-screen bg-[#0b0d10] px-4 py-5 text-white sm:px-7 sm:py-8">
    <div className="mx-auto max-w-6xl">
      <Link to="/ambiente/gestao" className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3.5 py-2 text-[11px] font-semibold text-white/55 hover:text-white"><ArrowLeft size={14}/>Seu escritório</Link>
      <header className="relative overflow-hidden rounded-[26px] border border-[#d7bd8d]/20 bg-[radial-gradient(ellipse_at_90%_10%,rgba(196,166,106,.17),transparent_42%),linear-gradient(120deg,#25221c,#151719_72%)] p-6 sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <p className="flex items-center gap-2 text-[9px] font-bold tracking-[.24em] text-[#d7bd8d]"><BriefcaseBusiness size={13}/> GESTÃO · SUA MESA DE TRABALHO</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">{tab==='tarefas'?'O que precisa avançar?':'O que você está construindo?'}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">{tab==='tarefas'?level>=3?'Acompanhe as entregas da equipe, distribua responsabilidades e mantenha cada prioridade visível.':'Organize o próximo passo, mantenha o foco e acompanhe o que já saiu do papel.':'Reúna objetivos, etapas e entregas em projetos que você consegue acompanhar.'}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-white/55"><span className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5"><CalendarDays size={11} className="mr-1 inline"/> {new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(new Date())}</span><span className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5"><Sparkles size={11} className="mr-1 inline"/> Pessoal · responsabilidades da equipe</span></div>
        </div>
        <div className="pointer-events-none absolute -right-4 -bottom-16 hidden h-64 w-64 rounded-full border border-[#d7bd8d]/15 sm:block"><div className="absolute inset-7 rounded-full border border-[#d7bd8d]/15"/><div className="absolute inset-16 rounded-full border border-[#d7bd8d]/15"/><div className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-[#d7bd8d] shadow-[0_0_35px_12px_rgba(215,189,141,.25)]"/></div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {label:'Tarefas abertas',value:data?.totals.open_tasks??0,icon:ListTodo},
          {label:'Em andamento',value:data?.totals.doing_tasks??0,icon:Play},
          {label:'Concluídas na semana',value:data?.totals.completed_this_week??0,icon:CheckCircle2},
          {label:'Atrasadas',value:overdue,icon:Clock3},
        ].map(item=><article key={item.label} className="rounded-2xl border border-white/[.08] bg-white/[.035] p-4"><div className="flex items-center justify-between text-white/40"><span className="text-[10px]">{item.label}</span><item.icon size={15}/></div><p className="mt-3 text-2xl font-semibold tabular-nums">{loading?'—':item.value}</p></article>)}
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl border border-white/10 bg-white/[.035] p-1">
            <button onClick={()=>{setSearchParams({tab:'tarefas'});setShowForm(false);}} className={`rounded-lg px-4 py-2 text-xs font-semibold ${tab==='tarefas'?'bg-[#d7bd8d] text-[#17140e]':'text-white/55'}`}><ListTodo size={13} className="mr-1.5 inline"/>Tarefas</button>
            <button onClick={()=>{setSearchParams({tab:'projetos'});setShowForm(false);}} className={`rounded-lg px-4 py-2 text-xs font-semibold ${tab==='projetos'?'bg-[#d7bd8d] text-[#17140e]':'text-white/55'}`}><FolderKanban size={13} className="mr-1.5 inline"/>Projetos</button>
          </div>
          <button onClick={()=>tab==='tarefas'?newTask():newProject()} className="inline-flex items-center gap-2 rounded-xl bg-[#d7bd8d] px-4 py-2.5 text-xs font-bold text-[#17140e] hover:bg-[#e4cca0]"><Plus size={15}/>{tab==='tarefas'?'Nova tarefa':'Novo projeto'}</button>
        </div>

        {showForm && <form onSubmit={tab==='tarefas'?saveTask:saveProject} className="mt-4 rounded-2xl border border-[#d7bd8d]/25 bg-[#1b1c1b] p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-[9px] font-bold tracking-[.2em] text-[#d7bd8d]">{tab==='tarefas'?'REGISTRO DE TAREFA':'NOVO PROJETO'}</p><h2 className="mt-1 text-lg font-semibold">{tab==='tarefas'?(editingTask?'Editar tarefa':'Adicionar à sua mesa'):(editingProject?'Editar projeto':'Criar projeto')}</h2></div><button type="button" onClick={()=>setShowForm(false)} className="rounded-lg p-2 text-white/45 hover:bg-white/5 hover:text-white"><X size={17}/></button></div>
          {tab==='tarefas'?<div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/60 sm:col-span-2">O que precisa ser feito?<input required maxLength={180} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d7bd8d]/60"/></label>
            <label className="text-xs text-white/60 sm:col-span-2">Detalhes<textarea value={taskDescription} onChange={e=>setTaskDescription(e.target.value)} rows={3} maxLength={3000} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#d7bd8d]/60"/></label>
            <label className="text-xs text-white/60">Projeto<select value={taskProject} onChange={e=>setTaskProject(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#17191d] px-3 text-sm text-white"><option value="">Sem projeto</option>{(data?.projects??[]).filter(p=>p.status!=='archived'&&p.owner_id===taskAssignee).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="text-xs text-white/60">Prazo<input type="date" value={taskDue} onChange={e=>setTaskDue(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white"/></label>
            <label className="text-xs text-white/60">Prioridade<select value={taskPriority} onChange={e=>setTaskPriority(e.target.value as Task['priority'])} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#17191d] px-3 text-sm text-white">{Object.entries(priorityLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
            {level>=3&&<label className="text-xs text-white/60">Responsável<select value={taskAssignee} onChange={e=>{setTaskAssignee(e.target.value);setTaskProject('');}} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#17191d] px-3 text-sm text-white">{(people.data?.items??[]).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>}
          </div>:<div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/60 sm:col-span-2">Nome do projeto<input required maxLength={140} value={projectName} onChange={e=>setProjectName(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d7bd8d]/60"/></label>
            <label className="text-xs text-white/60 sm:col-span-2">Objetivo / descrição<textarea value={projectDescription} onChange={e=>setProjectDescription(e.target.value)} rows={3} maxLength={3000} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#d7bd8d]/60"/></label>
            <label className="text-xs text-white/60">Prazo<input type="date" value={projectDue} onChange={e=>setProjectDue(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white"/></label>
            {level>=3&&<label className="text-xs text-white/60">Responsável<select disabled={Boolean(editingProject)} value={projectAssignee} onChange={e=>setProjectAssignee(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#17191d] px-3 text-sm text-white">{(people.data?.items??[]).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>}
          </div>}
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/60">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#d7bd8d] px-4 py-2.5 text-xs font-bold text-[#17140e] disabled:opacity-50">{saving?'Salvando…':'Salvar'}</button></div>
        </form>}

        <div className="relative mt-4 max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tab==='tarefas'?'Buscar tarefas ou projetos…':'Buscar projetos…'} className="h-10 w-full rounded-xl border border-white/10 bg-white/[.035] pl-9 pr-3 text-xs text-white outline-none focus:border-[#d7bd8d]/40"/></div>

        {loading?<div className="mt-5 rounded-2xl border border-white/10 p-8 text-center text-sm text-white/45">Preparando sua mesa…</div>:error?<div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-center text-sm text-white/65">{error}<button onClick={reload} className="ml-2 text-[#d7bd8d] underline">Tentar novamente</button></div>:tab==='tarefas'?(
          <div className="mt-4 space-y-2">{tasks.length?tasks.map(task=><article key={task.id} className="group flex flex-wrap items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.035] p-4 transition hover:border-[#d7bd8d]/25">
            <button onClick={()=>void updateTask(task,{status:task.status==='done'?'todo':'done'})} aria-label={task.status==='done'?'Reabrir tarefa':'Concluir tarefa'} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 text-white/45 hover:border-[#d7bd8d]/40 hover:text-[#d7bd8d]">{task.status==='done'?<Check size={17}/>:<Circle size={17}/>}</button>
            {(level>=3||task.created_by===user?.id)?<button onClick={()=>editTask(task)} className="min-w-0 flex-1 text-left"><p className={`text-sm font-semibold ${task.status==='done'?'text-white/35 line-through':'text-white/90'}`}>{task.title}</p><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/35"><span>{task.project_name??'Pessoal'}</span><span>{task.assignee_name}</span><span>{dateText(task.due_date)}</span><span>{priorityLabel[task.priority]}</span></p></button>:<div className="min-w-0 flex-1 text-left"><p className={`text-sm font-semibold ${task.status==='done'?'text-white/35 line-through':'text-white/90'}`}>{task.title}</p><p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/35"><span>{task.project_name??'Pessoal'}</span><span>{task.assignee_name}</span><span>{dateText(task.due_date)}</span></p></div>}
            <select aria-label={`Situação da tarefa ${task.title}`} value={task.status} onChange={e=>void updateTask(task,{status:e.target.value as Task['status']})} className="rounded-lg border border-white/10 bg-[#17191d] px-2 py-2 text-[10px] text-white/65">{Object.entries(taskStatus).filter(([v])=>v!=='archived').map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          </article>):<div className="rounded-2xl border border-dashed border-white/15 px-5 py-12 text-center"><Target size={24} className="mx-auto text-[#d7bd8d]/60"/><h3 className="mt-3 text-sm font-semibold">Sua mesa está livre.</h3><p className="mt-1 text-xs text-white/40">Adicione a primeira tarefa e transforme intenção em próximo passo.</p></div>}</div>
        ):(
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{projects.length?projects.map(project=>{
            const progress=project.task_count?Math.round(project.completed_tasks/project.task_count*100):0;
            return <article key={project.id} className="rounded-2xl border border-white/[.08] bg-white/[.035] p-5">
              <div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-[#d7bd8d]/20 bg-[#d7bd8d]/10 text-[#d7bd8d]"><FolderKanban size={18}/></span><span className="text-[9px] text-white/40">{projectStatus[project.status]}</span></div>
              <button onClick={()=>editProject(project)} className="mt-4 block text-left"><h3 className="text-base font-semibold">{project.name}</h3><p className="mt-1 line-clamp-2 min-h-9 text-xs leading-5 text-white/45">{project.description||'Projeto sem descrição definida.'}</p><p className="mt-2 text-[10px] text-white/35">Responsável: {project.owner_name}</p></button>
              <div className="mt-4"><div className="mb-2 flex justify-between text-[10px] text-white/40"><span>{project.completed_tasks} de {project.task_count} tarefas</span><span>{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#d7bd8d]" style={{width:`${progress}%`}}/></div></div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[.08] pt-3"><span className="text-[10px] text-white/35"><CalendarDays size={11} className="mr-1 inline"/>{dateText(project.due_date)}</span><div className="flex gap-1"><button title="Pausar projeto" onClick={()=>void updateProject(project,project.status==='paused'?'active':'paused')} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white">{project.status==='paused'?<Play size={14}/>:<Pause size={14}/>}</button><button title="Concluir projeto" onClick={()=>void updateProject(project,'completed')} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-[#d7bd8d]"><CheckCircle2 size={14}/></button><button title="Arquivar projeto" onClick={()=>void updateProject(project,'archived')} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"><Archive size={14}/></button></div></div>
            </article>;
          }):<div className="col-span-full rounded-2xl border border-dashed border-white/15 px-5 py-12 text-center"><FolderKanban size={24} className="mx-auto text-[#d7bd8d]/60"/><h3 className="mt-3 text-sm font-semibold">Comece com um projeto.</h3><p className="mt-1 text-xs text-white/40">Defina um objetivo e acompanhe as pequenas entregas até concluir.</p></div>}</div>
        )}
      </section>
      <footer className="mt-10 flex items-center justify-between border-t border-white/[.08] pt-5 text-[9px] tracking-[.15em] text-white/25"><span>MMV CREATIVE · GESTÃO PESSOAL</span><span>{activeProjects} projetos ativos</span></footer>
    </div>
  </main>;
}
