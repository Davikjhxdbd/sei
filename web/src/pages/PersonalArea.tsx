import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/layout/Shell';
import type { NavGroup } from '../modules/registry';
import { AlertCircle, ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, Home, ListTodo, Sparkles, Users } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { useAuth } from '../lib/auth';
import { patch } from '../lib/api';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, LoadingBlock } from '../components/ui';

const nav: NavGroup[] = [{
  title: 'Meu espaço',
  items: [
    { label: 'Visão pessoal', to: '/pessoal', icon: Home, end: true },
    { label: 'Escala de limpeza', to: '/pessoal#limpeza', icon: ClipboardCheck },
  ],
}];

const cleaners = ['Davi', 'João Neto', 'Maria Fernanda', 'Evelyn', 'João Pedro'];
const startDate = new Date(2026, 10, 23);

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayOffset(date: Date) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current.getTime() - startDate.getTime()) / 86400000);
}

function assignmentFor(date: Date) {
  const offset = dayOffset(date);
  return cleaners[((offset % cleaners.length) + cleaners.length) % cleaners.length];
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}


type PersonalTask = { id: string; title: string; status: string; priority: string; due_date: string | null; project_name: string | null };
type PersonalProject = { id: string; name: string; status: string; task_count: number; completed_tasks: number };
type PersonalWorkspace = { tasks: PersonalTask[]; projects: PersonalProject[]; totals: { open_tasks: number; doing_tasks: number; completed_this_week: number; overdue_tasks: number } };
type PersonalSchedule = { id: string; role_title: string; event_name: string; starts_at: string; readiness: string | null; status: string };
type PersonalEvent = { id: string; title: string; starts_at: string; category: string; location: string | null; all_day: boolean };

function shortDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value.slice(0, 10) + 'T12:00:00'));
}
function priorityText(value: string) {
  return value === 'urgent' ? 'Urgente' : value === 'high' ? 'Alta' : value === 'low' ? 'Baixa' : 'Normal';
}

export default function PersonalArea() {
  const { user } = useAuth();
  const toast = useToast();
  const workspace = useApi<PersonalWorkspace>('/workspace/overview');
  const schedules = useApi<{ items: PersonalSchedule[] }>('/studio/schedules?mine=1');
  const agenda = useApi<{ items: PersonalEvent[] }>('/calendar');
  const [completing, setCompleting] = useState<string | null>(null);
  const openTasks = (workspace.data?.tasks ?? []).filter(task => task.status !== 'done');
  const nextSchedules = (schedules.data?.items ?? []).filter(item => item.status === 'published' && new Date(item.starts_at).getTime() >= Date.now()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at)).slice(0,4);
  const nextEvents = (agenda.data?.items ?? []).filter(item => new Date(item.starts_at).getTime() >= Date.now()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at)).slice(0,4);

  async function completeTask(task: PersonalTask) {
    setCompleting(task.id);
    try {
      await patch('/workspace/tasks/' + task.id, { status: 'done' });
      await workspace.reload();
      toast.push('Tarefa concluída.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível concluir a tarefa.', 'error');
    } finally {
      setCompleting(null);
    }
  }

  const today = new Date();
  const currentPerson = assignmentFor(today);
  const rotation = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index);
    return { date, person: assignmentFor(date), isToday: localDateKey(date) === localDateKey(today) };
  }), []);

  return (
    <Shell nav={nav} sidebarEyebrow="Meu espaço">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mmv-label">Organização pessoal</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Meu espaço{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}.</h1>
            <p className="mt-1 text-sm text-muted">Rotinas, tarefas e responsabilidades do dia a dia.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted">
            <CalendarDays size={14} /> {formatDate(today, { weekday: 'long', day: '2-digit', month: 'long' })}
          </span>
        </header>


        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Tarefas em aberto', value: workspace.data?.totals.open_tasks ?? openTasks.length, icon: ListTodo },
            { label: 'Em andamento', value: workspace.data?.totals.doing_tasks ?? 0, icon: Clock3 },
            { label: 'Concluídas na semana', value: workspace.data?.totals.completed_this_week ?? 0, icon: CheckCircle2 },
            { label: 'Atrasadas', value: workspace.data?.totals.overdue_tasks ?? 0, icon: AlertCircle },
          ].map(item => <article key={item.label} className="mmv-surface p-4"><div className="flex items-center justify-between text-muted"><span className="text-[10px]">{item.label}</span><item.icon size={15} className="text-brass"/></div><p className="mt-3 text-2xl font-semibold tabular-nums text-ink">{workspace.loading ? '—' : item.value}</p></article>)}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <article className="mmv-surface overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line p-5"><div><p className="mmv-label">Prioridades</p><h2 className="mt-1 text-base font-semibold text-ink">Próximos passos</h2></div><Link to="/gestao?tab=tarefas" className="text-[11px] font-semibold text-brass hover:underline">Ver todas <ArrowUpRight size={12} className="inline"/></Link></div>
            {workspace.loading ? <div className="p-5"><LoadingBlock/></div> : workspace.error ? <p className="p-5 text-xs text-muted">{workspace.error}</p> : openTasks.length ? <div className="divide-y divide-line">
              {openTasks.slice(0,6).map(task=><div key={task.id} className="flex items-start gap-3 px-5 py-4">
                <button type="button" onClick={()=>void completeTask(task)} disabled={completing===task.id} aria-label={'Concluir ' + task.title} className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line text-muted hover:border-brass hover:bg-brass/10 hover:text-brass disabled:opacity-50">{completing===task.id?<span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-r-transparent"/>:<CheckCircle2 size={13}/>}</button>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{task.title}</p><p className="mt-1 text-[10px] text-muted">{task.project_name || 'Tarefa pessoal'} · {priorityText(task.priority)}</p></div>
                <div className="shrink-0 text-right">{task.due_date ? <p className={task.due_date < localDateKey(today) ? 'text-[10px] font-semibold text-red-500' : 'text-[10px] text-muted'}>{shortDate(task.due_date)}</p> : <p className="text-[10px] text-muted">Sem prazo</p>}<Badge tone={task.status==='doing'?'info':task.status==='waiting'?'warning':'neutral'}>{task.status==='doing'?'Em andamento':task.status==='waiting'?'Aguardando':'A fazer'}</Badge></div>
              </div>)}
            </div> : <div className="p-5"><EmptyState icon={CheckCircle2} title="Tudo em dia" description="Não há tarefas pendentes atribuídas a você."/></div>}
          </article>
          <div className="space-y-4">
            <article className="mmv-surface p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><Sparkles size={15} className="text-brass"/> Seu espaço</div><h2 className="mt-3 text-lg font-semibold text-ink">Um passo de cada vez.</h2><p className="mt-1 text-sm leading-relaxed text-muted">Priorize o que importa e mantenha suas entregas e compromissos visíveis.</p><div className="mt-4 flex flex-wrap gap-2"><Link to="/gestao?tab=espaco" className="rounded-lg border border-line px-3 py-2 text-[11px] font-medium text-ink hover:border-brass/40">Minha gestão</Link><Link to="/calendar" className="rounded-lg border border-line px-3 py-2 text-[11px] font-medium text-ink hover:border-brass/40">Abrir agenda</Link></div></article>
            <article className="mmv-surface p-5"><div className="mb-3 flex items-center justify-between"><div><p className="mmv-label">Responsabilidades</p><h2 className="mt-1 text-sm font-semibold text-ink">Minhas escalas</h2></div><Users size={16} className="text-brass"/></div>{schedules.loading?<LoadingBlock/>:nextSchedules.length?<div className="space-y-3">{nextSchedules.map(item=><div key={item.id} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="text-xs font-semibold text-ink">{item.role_title}</p><p className="mt-1 truncate text-[10px] text-muted">{item.event_name} · {shortDate(item.starts_at)}</p></div><Badge tone={item.readiness==='ready'?'success':item.readiness==='attention'?'warning':'neutral'}>{item.readiness==='ready'?'Confirmada':item.readiness==='attention'?'Atenção':item.readiness==='unavailable'?'Indisponível':'A confirmar'}</Badge></div>)}</div>:<p className="py-3 text-xs text-muted">Nenhuma escala publicada para você nos próximos eventos.</p>}<Link to="/m/studio/schedules" className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs font-medium text-ink hover:text-brass">Abrir escalas <ChevronRight size={14}/></Link></article>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="mmv-surface p-5"><div className="mb-4 flex items-center justify-between"><div><p className="mmv-label">Planejamento</p><h2 className="mt-1 text-sm font-semibold text-ink">Próximos compromissos</h2></div><Link to="/calendar" className="text-[11px] font-semibold text-brass hover:underline">Agenda completa</Link></div>{agenda.loading?<LoadingBlock/>:nextEvents.length?<div className="space-y-3">{nextEvents.map(event=><div key={event.id} className="flex items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canvas"><span className="text-[9px] uppercase text-muted">{formatDate(new Date(event.starts_at),{month:'short'})}</span><span className="text-sm font-semibold text-ink">{new Date(event.starts_at).getDate()}</span></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-ink">{event.title}</p><p className="mt-1 text-[10px] text-muted">{event.all_day?'Dia inteiro':formatDate(new Date(event.starts_at),{hour:'2-digit',minute:'2-digit'})} · {event.category}</p>{event.location&&<p className="mt-1 text-[10px] text-muted">{event.location}</p>}</div></div>)}</div>:<p className="py-5 text-center text-xs text-muted">Nenhum compromisso próximo cadastrado.</p>}</article>
          <article className="mmv-surface p-5"><div className="mb-4 flex items-center justify-between"><div><p className="mmv-label">Projetos</p><h2 className="mt-1 text-sm font-semibold text-ink">Sob minha responsabilidade</h2></div><Link to="/gestao?tab=projetos" className="text-[11px] font-semibold text-brass hover:underline">Ver projetos</Link></div>{workspace.loading?<LoadingBlock/>:(workspace.data?.projects??[]).filter(project=>project.status==='active').slice(0,4).map(project=>{const progress=project.task_count?Math.round(project.completed_tasks/project.task_count*100):0;return <div key={project.id} className="mb-3 border-b border-line pb-3 last:mb-0 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-semibold text-ink">{project.name}</p><span className="text-[10px] tabular-nums text-muted">{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[.06]"><div className="h-full rounded-full bg-brass" style={{width:progress+'%'}}/></div><p className="mt-1 text-[10px] text-muted">{project.completed_tasks} de {project.task_count} tarefas concluídas</p></div>})}</article>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="mmv-surface p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><Sparkles size={15} className="text-brass" /> Seu espaço</div>
            <h2 className="mt-3 text-lg font-semibold text-ink">Tudo organizado em um só lugar.</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">Aqui ficam as escalas e pequenas responsabilidades que fazem parte da rotina.</p>
          </article>
          <article className="mmv-surface p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><Users size={15} className="text-brass" /> Escala de hoje</div>
            <p className="mt-3 text-2xl font-semibold text-ink">{currentPerson}</p>
            <p className="mt-1 text-sm text-muted">Responsável pela limpeza de hoje.</p>
            <a href="#limpeza" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brass hover:underline">Ver escala completa <ChevronRight size={14} /></a>
          </article>
        </section>

        <section id="limpeza" className="mmv-surface overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mmv-label">Rotina compartilhada</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">ESCALA DE LIMPEZA DIÁRIA — LIVE</h2>
              <p className="mt-1 text-sm text-muted">Um responsável por dia. Início: 23 de novembro de 2026.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-canvas px-3 py-1.5 text-xs font-medium text-muted"><CalendarDays size={13} /> 23/11/2026 a 06/12/2026</span>
          </div>
          <div className="divide-y divide-line">
            {rotation.map(({ date, person, isToday }) => {
              return (
                <div key={localDateKey(date)} className={`flex items-center justify-between gap-4 px-5 py-4 ${isToday ? 'bg-canvas/70' : ''}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${isToday ? 'border-brass/40 bg-brass/10 text-brass' : 'border-line bg-canvas text-muted'}`}>
                      {isToday ? <CheckCircle2 size={17} /> : <span className="text-sm font-semibold">{date.getDate()}</span>}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{formatDate(date, { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                      <p className="mt-0.5 text-xs text-muted">{person}</p>
                    </div>
                  </div>
                  {isToday && <span className="rounded-full bg-brass/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brass">Hoje</span>}
                </div>
              );
            })}
          </div>
          <div className="border-t border-line bg-canvas/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Regras da escala</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>• A limpeza deve ser realizada diariamente.</li>
              <li>• O responsável do dia deve deixar a sala da LIVE limpa e organizada.</li>
              <li>• Após o último nome, o rodízio recomeça.</li>
              <li>• A responsabilidade é individual e não deve ser transferida sem combinar com a equipe.</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link to="/escalas" className="mmv-surface group flex items-center justify-between p-4 transition hover:border-brass/40">
            <div><p className="text-sm font-semibold text-ink">Escalas dos cultos</p><p className="mt-1 text-xs text-muted">Equipe, funções e organização dos cultos.</p></div>
            <ChevronRight size={17} className="text-muted transition group-hover:translate-x-1 group-hover:text-brass" />
          </Link>
          <div className="mmv-surface flex items-center justify-between p-4 opacity-70">
            <div><p className="text-sm font-semibold text-ink">Minhas tarefas</p><p className="mt-1 text-xs text-muted">Área preparada para próximas rotinas.</p></div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Em breve</span>
          </div>
        </section>
      </div>
    </Shell>
  );
}
