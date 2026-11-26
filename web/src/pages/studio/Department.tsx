import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3,
  FolderKanban, Users, Plus, X, Search, Video, UserRound, Clapperboard, Palette, Camera, Radio, Layers,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { post, patch, del } from '../../lib/api';
import type { CSSProperties, FormEvent } from 'react';

type Area = { id: string; name: string; slug: string; description?: string | null; tasks_count: number; open_tasks: number };
type Member = { id: string; full_name: string; function: string | null };
type Task = {
  id: string; title: string; description?: string | null; status: string;
  due_date: string | null; recording_date?: string | null;
  area_id?: string; area_name: string; area_slug: string;
  assignee_name: string | null; assigned_to?: string | null; created_by?: string;
};
type DepartmentData = {
  department: { name: string; description: string | null };
  areas: Area[];
  members: Member[];
  tasks: Task[];
  totals: { tasks: number; open: number; published: number };
};

const FLOW = [
  { id: 'planning', label: 'Planejamento' },
  { id: 'recording', label: 'Captação' },
  { id: 'editing', label: 'Em execução' },
  { id: 'review', label: 'Revisão e aprovação' },
  { id: 'published', label: 'Entregue' },
] as const;

const THEMES: Record<string, { accent: string; glow: string; descriptor: string; craft: string }> = {
  transmissao: { accent: '#8DB7D8', glow: 'rgba(72,133,184,.24)', descriptor: 'OPERAÇÃO TÉCNICA · AO VIVO', craft: 'Sinal, operação e excelência técnica' },
  slide: { accent: '#B7A2E8', glow: 'rgba(137,105,196,.24)', descriptor: 'CONTEÚDO VISUAL · PROJEÇÃO', craft: 'Palavra transformada em experiência visual' },
  audiovisual: { accent: '#D7B779', glow: 'rgba(196,166,106,.24)', descriptor: 'CAPTAÇÃO · EDIÇÃO · FINALIZAÇÃO', craft: 'Histórias captadas, editadas e finalizadas' },
  fotos: { accent: '#D99D9B', glow: 'rgba(190,111,117,.22)', descriptor: 'FOTOGRAFIA · TRATAMENTO · ENTREGA', craft: 'Momentos reais, memória e narrativa' },
  design: { accent: '#A99BE8', glow: 'rgba(128,111,202,.23)', descriptor: 'DIREÇÃO DE ARTE · CRIAÇÃO VISUAL', craft: 'Identidade, conceito e composição' },
  social: { accent: '#9CC7A7', glow: 'rgba(94,157,113,.22)', descriptor: 'ESTRATÉGIA · CONTEÚDO · PUBLICAÇÃO', craft: 'Ideias que viram conteúdo e chegam às pessoas' },
};

function dateLabel(value?: string | null) {
  if (!value) return 'Sem prazo definido';
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
}


function DepartmentShowcase({ slug, tasks, theme }: { slug: string; tasks: Task[]; theme: typeof THEMES[string] }) {
  const active = tasks.filter(task => FLOW.some(stage => stage.id === task.status));
  const delivered = tasks.filter(task => task.status === 'published');
  const iconFor = slug === 'transmissao' ? Radio : slug === 'fotos' ? Camera : slug === 'design' ? Palette : slug === 'slide' ? Layers : Clapperboard;
  const CraftIcon = iconFor;
  const currentStage = (status: string) => Math.max(0, FLOW.findIndex(stage => stage.id === status));
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.24em]" style={{color:theme.accent}}>MMV CREATIVE / WORK IN MOTION</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">O trabalho acontecendo</h2>
          <p className="mt-1 text-xs text-muted">{theme.craft}. Tudo atualizado pelas demandas reais da equipe.</p>
        </div>
        <div className="flex gap-2 text-[10px] text-muted">
          <span className="rounded-full border border-line px-2.5 py-1">{active.length} em andamento</span>
          <span className="rounded-full border border-line px-2.5 py-1">{delivered.length} entregues</span>
        </div>
      </div>
      {active.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.slice(0,6).map(task => {
            const stageIndex = currentStage(task.status);
            const stage = FLOW[stageIndex];
            return (
              <article key={task.id} className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:border-[var(--department-accent)]/50">
                <div className="relative flex min-h-[150px] items-end overflow-hidden bg-[#111419] p-4">
                  <div className="pointer-events-none absolute inset-0" style={{background: `radial-gradient(ellipse at 82% 15%, ${theme.glow}, transparent 52%), linear-gradient(135deg, rgba(255,255,255,.055), transparent 60%)`}} />
                  <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border border-white/[.08]" />
                  <div className="pointer-events-none absolute right-5 top-5 h-16 w-16 rounded-full border border-white/[.08]" />
                  <div className="relative flex w-full items-end justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[8px] font-semibold uppercase tracking-[.2em]" style={{color:theme.accent}}>DEMANDA REAL · {task.area_name}</span>
                      <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-tight text-white">{task.title}</h3>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[.06]" style={{color:theme.accent}}><CraftIcon size={18}/></span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold" style={{color:theme.accent}}>{stage.label}</span>
                    <span className="truncate text-[10px] text-muted">{task.assignee_name || 'Responsável a definir'}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1">{FLOW.map((item,index)=><span key={item.id} title={item.label} className="h-1 rounded-full" style={{background:index<=stageIndex?theme.accent:'rgba(128,128,128,.20)'}}/>)}</div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-muted">
                    <span>{task.recording_date ? dateLabel(task.recording_date) : 'Em execução'}</span>
                    <span>{task.due_date ? `Entrega · ${dateLabel(task.due_date)}` : 'Sem prazo'}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-8 text-center">
          <CraftIcon className="mx-auto h-6 w-6" style={{color:theme.accent}}/>
          <p className="mt-3 text-sm font-medium text-ink">A próxima criação começa aqui</p>
          <p className="mt-1 text-xs text-muted">Quando uma demanda entrar no fluxo, ela aparecerá automaticamente nesta vitrine.</p>
        </div>
      )}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold text-ink">Últimas entregas</h3><p className="mt-1 text-[11px] text-muted">O que a equipe já concluiu.</p></div>
          <span className="text-xs font-semibold" style={{color:theme.accent}}>{delivered.length}</span>
        </div>
        {delivered.length ? <div className="grid gap-2 sm:grid-cols-2">{delivered.slice(0,4).map(task=><div key={task.id} className="flex min-w-0 items-center gap-3 rounded-xl bg-ink/[.035] p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{background:theme.glow,color:theme.accent}}><CheckCircle2 size={17}/></span><div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{task.title}</p><p className="mt-1 truncate text-[10px] text-muted">{task.assignee_name || 'Equipe'}</p></div><span className="ml-auto text-[9px]" style={{color:theme.accent}}>Concluído</span></div>)}</div> : <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[11px] text-muted">As entregas concluídas serão exibidas aqui.</p>}
      </div>
    </section>
  );
}

export default function Department() {
  const { slug = '' } = useParams();
  const { level, user } = useAuth();
  const canManageTeam = level >= 4;
  const canManageTasks = level >= 3;
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [memberFunction, setMemberFunction] = useState('Integrante');
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [taskArea, setTaskArea] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskRecording, setTaskRecording] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, loading, error, reload } = useApi<DepartmentData>(
    slug ? `/studio/departments/${slug}` : null, [slug]
  );
  const { data: memberOptions, reload: reloadMemberOptions } = useApi<{ items: Member[] }>(
    canManageTeam && slug ? `/studio/departments/${slug}/member-options` : null,
    [slug, canManageTeam]
  );

  async function addMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUser) return;
    setMemberSaving(true);
    setMemberError('');
    try {
      await post(`/studio/departments/${slug}/members`, { user_id: selectedUser, function: memberFunction });
      setSelectedUser(''); setMemberFunction('Integrante'); setShowMemberForm(false);
      await Promise.all([reload(), reloadMemberOptions()]);
    } catch (err: any) {
      setMemberError(err.message || 'Não foi possível adicionar o participante.');
    } finally { setMemberSaving(false); }
  }

  async function removeMember(userId: string) {
    if (!window.confirm('Remover esta pessoa da equipe do departamento?')) return;
    try {
      await del(`/studio/departments/${slug}/members/${userId}`);
      await Promise.all([reload(), reloadMemberOptions()]);
    } catch (err: any) { window.alert(err.message || 'Não foi possível remover o participante.'); }
  }

  async function createTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!taskArea || !taskTitle.trim()) return;
    setTaskSaving(true); setTaskError('');
    try {
      await post('/studio/production/tasks', {
        area_id: taskArea, title: taskTitle.trim(), description: taskDescription,
        assigned_to: taskAssignee || null, due_date: taskDue || null,
        recording_date: taskRecording || null,
      });
      setTaskTitle(''); setTaskDescription(''); setTaskAssignee('');
      setTaskDue(''); setTaskRecording(''); setShowTaskForm(false);
      await reload();
    } catch (err: any) { setTaskError(err.message || 'Não foi possível criar a demanda.'); }
    finally { setTaskSaving(false); }
  }

  async function updateTask(id: string, values: Record<string, unknown>) {
    try { await patch(`/studio/production/tasks/${id}`, values); await reload(); }
    catch (err: any) { window.alert(err.message || 'Não foi possível atualizar a demanda.'); }
  }

  const theme = THEMES[slug] ?? THEMES.audiovisual;
  const themeStyle = { '--department-accent': theme.accent, '--department-glow': theme.glow } as CSSProperties;
  const visibleTasks = useMemo(() => (data?.tasks ?? []).filter(task => {
    const matchesSearch = !search.trim() || [task.title, task.area_name, task.assignee_name ?? ''].some(value => value.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch && (statusFilter === 'all' || task.status === statusFilter);
  }), [data?.tasks, search, statusFilter]);

  if (loading) return <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />Carregando departamento...</div>;
  if (error || !data) return (
    <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-line bg-surface p-8">
      <p className="text-sm text-red-400">{error || 'Departamento não encontrado.'}</p>
      <Link to="/ambiente/producao" className="text-sm text-brass">Voltar à Produção Criativa</Link>
    </div>
  );

  const { department, areas, members, totals } = data;
  const overdue = data.tasks.filter(task => task.status !== 'published' && task.due_date && new Date(`${task.due_date}T23:59:59`) < new Date()).length;

  return (
    <div className="mx-auto max-w-[1450px] space-y-6 pb-12" style={themeStyle}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/ambiente/producao" className="inline-flex items-center gap-2 text-xs text-muted transition hover:text-ink"><ArrowLeft size={15} /> Produção Criativa</Link>
        <Link to="/m/studio" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">Visão geral do estúdio <ArrowUpRight size={13}/></Link>
      </div>

      <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111316] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full blur-3xl" style={{ background: theme.glow }} />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[.28em]" style={{ color: theme.accent }}>MMV CREATIVE / {theme.descriptor}</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{department.name}</h1><p className="mt-2 max-w-2xl text-sm text-white/55">{department.description || 'Ambiente de trabalho do departamento.'}</p></div>
            <button type="button" onClick={() => { setTaskArea(areas[0]?.id ?? ''); setShowTaskForm(value => !value); }} disabled={!areas.length || level < 2} className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-[#111] transition disabled:cursor-not-allowed disabled:opacity-40" style={{ background: theme.accent }}><Plus size={15}/> Nova demanda</button>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Demandas totais', value: totals?.tasks ?? 0, icon: FolderKanban },
              { label: 'Em aberto', value: totals?.open ?? 0, icon: Clock3 },
              { label: 'Concluídas', value: totals?.published ?? 0, icon: CheckCircle2 },
              { label: 'Atrasadas', value: overdue, icon: CalendarDays },
            ].map(item => { const Icon = item.icon; return <div key={item.label} className="rounded-xl border border-white/[.08] bg-black/20 p-4"><Icon size={17} style={{ color: theme.accent }}/><p className="mt-3 text-2xl font-semibold text-white">{item.value}</p><p className="mt-1 text-[10px] text-white/45">{item.label}</p></div>; })}
          </div>
        </div>
      </header>

      <DepartmentShowcase slug={slug} tasks={data.tasks} theme={theme} />

      {showTaskForm && <form onSubmit={createTask} className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-ink">Nova demanda de produção</h2><p className="mt-1 text-xs text-muted">Defina a frente, a responsabilidade e os prazos.</p></div><button type="button" onClick={() => setShowTaskForm(false)} className="rounded-lg p-2 text-muted hover:bg-ink/5" aria-label="Fechar"><X size={16}/></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted sm:col-span-2">Título *<input required maxLength={180} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="Ex.: Finalizar vídeo do culto de domingo" className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"/></label>
          <label className="text-xs text-muted sm:col-span-2">Briefing / descrição<textarea value={taskDescription} onChange={e=>setTaskDescription(e.target.value)} rows={3} placeholder="Objetivo, formato, referências e orientações da entrega..." className="mt-1.5 w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink"/></label>
          <label className="text-xs text-muted">Área de trabalho<select required value={taskArea} onChange={e=>setTaskArea(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink">{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
          <label className="text-xs text-muted">Responsável<select value={taskAssignee} onChange={e=>setTaskAssignee(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink"><option value="">Definir depois</option>{members.map(member=><option key={member.id} value={member.id}>{member.full_name} · {member.function || 'Integrante'}</option>)}</select></label>
          <label className="text-xs text-muted">Prazo de entrega<input type="date" value={taskDue} onChange={e=>setTaskDue(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink"/></label>
          <label className="text-xs text-muted">Data de captação / execução<input type="date" value={taskRecording} onChange={e=>setTaskRecording(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink"/></label>
        </div>
        {taskError && <p className="mt-3 text-xs text-red-500">{taskError}</p>}
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setShowTaskForm(false)} className="rounded-lg border border-line px-4 py-2 text-xs text-muted">Cancelar</button><button disabled={taskSaving || !taskTitle.trim() || !taskArea} className="rounded-lg px-4 py-2 text-xs font-semibold text-[#111] disabled:opacity-50" style={{background:theme.accent}}>{taskSaving?'Criando...':'Criar demanda'}</button></div>
      </form>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-sm font-semibold text-ink">Fluxo de produção</h2><p className="mt-1 text-xs text-muted">Acompanhe cada demanda da entrada à entrega.</p></div>
              <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar demanda..." className="h-9 w-full rounded-lg border border-line bg-canvas pl-8 pr-3 text-xs text-ink sm:w-52"/></div>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">{[{id:'all',label:'Todas'},...FLOW.map(s=>({id:s.id,label:s.label}))].map(item=><button key={item.id} type="button" onClick={()=>setStatusFilter(item.id)} className={`rounded-full border px-3 py-1.5 text-[10px] transition ${statusFilter===item.id?'border-transparent bg-ink text-white':'border-line text-muted hover:text-ink'}`}>{item.label}</button>)}</div>
            <div className="space-y-2">
              {visibleTasks.map(task=>{
                const canEdit = canManageTasks || task.created_by === user?.id;
                const canUpdateStatus = canEdit || task.assigned_to === user?.id;
                return <article key={task.id} className="rounded-xl border border-line bg-canvas/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-ink">{task.title}</h3><span className="rounded-full border px-2 py-0.5 text-[9px]" style={{borderColor:`${theme.accent}55`,color:theme.accent}}>{FLOW.find(s=>s.id===task.status)?.label || task.status}</span></div><p className="mt-1.5 text-[11px] text-muted">{task.area_name} · {task.assignee_name || 'Sem responsável'}</p>{task.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{task.description}</p>}</div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">{task.due_date && <span className="inline-flex items-center gap-1"><CalendarDays size={12}/>Entrega: {dateLabel(task.due_date)}</span>}{task.recording_date && <span className="inline-flex items-center gap-1"><Video size={12}/>Execução: {dateLabel(task.recording_date)}</span>}</div>
                  </div>
                  {(canUpdateStatus || (canManageTasks && members.length>0)) && <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    {canUpdateStatus && <label className="flex items-center gap-2 text-[10px] text-muted">Etapa<select value={task.status} onChange={e=>void updateTask(task.id,{status:e.target.value})} className="h-8 rounded-lg border border-line bg-surface px-2 text-[10px] text-ink">{FLOW.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}
                    {canManageTasks && <label className="flex items-center gap-2 text-[10px] text-muted">Responsável<select value={task.assigned_to || ''} onChange={e=>void updateTask(task.id,{assigned_to:e.target.value||null})} className="h-8 max-w-[190px] rounded-lg border border-line bg-surface px-2 text-[10px] text-ink"><option value="">Sem responsável</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label>}
                  </div>}
                </article>;
              })}
              {!visibleTasks.length && <div className="rounded-xl border border-dashed border-line py-10 text-center"><FolderKanban className="mx-auto h-6 w-6 text-muted/50"/><p className="mt-2 text-xs text-muted">{search || statusFilter!=='all'?'Nenhuma demanda corresponde a este filtro.':'Nenhuma demanda cadastrada neste departamento.'}</p></div>}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <div className="mb-4"><h2 className="text-sm font-semibold text-ink">Frentes de trabalho</h2><p className="mt-1 text-xs text-muted">Áreas e projetos vinculados ao departamento.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{areas.map(area=><Link key={area.id} to={`/m/studio/production/${area.slug}`} className="group rounded-xl border border-line bg-canvas/60 p-4 transition hover:border-brass/50"><div className="flex items-start justify-between"><FolderKanban size={17} className="text-brass"/><ArrowUpRight size={14} className="text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/></div><h3 className="mt-3 text-sm font-semibold text-ink">{area.name}</h3><p className="mt-1 text-[11px] text-muted">{area.description || 'Frente de produção do departamento.'}</p><div className="mt-4 flex gap-3 border-t border-line pt-3 text-[10px] text-muted"><span>{area.tasks_count} demandas</span><span>{area.open_tasks} em aberto</span></div></Link>)}</div>
            {!areas.length && <p className="py-6 text-center text-xs text-muted">Nenhuma frente de trabalho cadastrada.</p>}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold text-ink">Equipe responsável</h2><p className="mt-1 text-[11px] text-muted">{members.length} integrantes vinculados</p></div><Users size={17} className="text-brass"/></div>
            {members.length ? <div className="space-y-3">{members.map(member=><div key={member.id} className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/[.05] text-[10px] font-semibold text-ink">{member.full_name.split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-ink">{member.full_name}</p><p className="text-[10px] text-muted">{member.function || 'Integrante'}</p></div>{canManageTeam && <button type="button" onClick={()=>void removeMember(member.id)} aria-label={`Remover ${member.full_name}`} className="rounded-lg p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500"><X size={13}/></button>}</div>)}</div> : <p className="py-5 text-center text-xs text-muted">Equipe ainda não cadastrada.</p>}
            {canManageTeam && <button type="button" onClick={()=>setShowMemberForm(v=>!v)} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-line text-xs text-ink transition hover:border-brass/50"><Plus size={14}/> Gerenciar participantes</button>}
            {canManageTeam && showMemberForm && <form onSubmit={addMember} className="mt-3 space-y-2 rounded-xl border border-line bg-canvas p-3"><select required value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-xs text-ink"><option value="">Selecionar pessoa</option>{(memberOptions?.items||[]).map(person=><option key={person.id} value={person.id}>{person.full_name}</option>)}</select><input value={memberFunction} onChange={e=>setMemberFunction(e.target.value)} maxLength={80} placeholder="Função na equipe" className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink"/>{memberError&&<p className="text-[11px] text-red-500">{memberError}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowMemberForm(false)} className="px-3 py-2 text-[11px] text-muted">Cancelar</button><button disabled={memberSaving||!selectedUser} className="rounded-lg bg-ink px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50">{memberSaving?'Salvando...':'Adicionar'}</button></div></form>}
          </section>
          <section className="rounded-2xl border border-line bg-surface p-5"><div className="flex items-center gap-2"><CalendarDays size={16} className="text-brass"/><h2 className="text-sm font-semibold text-ink">Organização da equipe</h2></div><p className="mt-2 text-xs leading-relaxed text-muted">Consulte as escalas publicadas e confirme sua disponibilidade para os próximos compromissos.</p><Link to="/m/studio/schedules" className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs font-medium text-ink hover:text-brass">Abrir escalas <ArrowUpRight size={14}/></Link></section>
          <section className="rounded-2xl border border-line bg-surface p-5"><div className="flex items-center gap-2"><UserRound size={16} className="text-brass"/><h2 className="text-sm font-semibold text-ink">Meu espaço</h2></div><p className="mt-2 text-xs leading-relaxed text-muted">Veja suas tarefas atribuídas e acompanhe suas entregas pessoais.</p><Link to="/m/studio/production/my-space" className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs font-medium text-ink hover:text-brass">Ver minhas demandas <ArrowUpRight size={14}/></Link></section>
        </aside>
      </section>
    </div>
  );
}
