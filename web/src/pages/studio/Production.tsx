import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, CalendarDays, Camera, Clapperboard,
  Film, FolderKanban, Plus, Users, UserRound, Video, Clock,
  CheckCircle2, Circle, Loader2,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { get, post, patch } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const STATUS = [
  { id: 'planning', label: 'Planejamento' },
  { id: 'recording', label: 'Gravação' },
  { id: 'editing', label: 'Edição' },
  { id: 'review', label: 'Revisão e aprovação' },
  { id: 'published', label: 'Entregue' },
] as const;

const AREAS = [
  { slug: 'reels-domingo', name: 'Reels de Domingo', description: 'Captação e edição dos conteúdos dos cultos de domingo.', icon: Video },
  { slug: 'forte-corajosa', name: 'Forte e Corajosa', description: 'Cobertura audiovisual dos cultos e trabalhos.', icon: Camera },
  { slug: 'reels-segunda-quarta', name: 'Reels de Segunda e Quarta', description: 'Produção dos conteúdos dos cultos durante a semana.', icon: Clapperboard },
  { slug: 'praca-se', name: 'Praça da Sé', description: 'Registro e produção audiovisual dos trabalhos na Praça da Sé.', icon: Film },
  { slug: 'resgate-almas', name: 'Resgate de Almas', description: 'Conteúdos audiovisuais do Resgate de Almas.', icon: FolderKanban },
];

function Header({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-7">
      <p className="mmv-label mb-2">{eyebrow}</p>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">{title}</h1>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>
    </div>
  );
}

function dateLabel(value?: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString('pt-BR');
}

function TaskCard({ task, onStatus, members = [], canAssign = false, onAssignee }: { task: any; onStatus: (id: string, status: string) => void; members?: any[]; canAssign?: boolean; onAssignee?: (id: string, userId: string) => void }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-ink">{task.title}</h3>
        {task.status === 'published'
          ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          : <Circle className="h-4 w-4 shrink-0 text-muted" />}
      </div>
      {task.description && <p className="mt-2 text-xs leading-relaxed text-muted">{task.description}</p>}
      <div className="mt-4 space-y-2 text-[11px] text-muted">
        <div className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5" />{task.assignee_name || 'Sem responsável'}</div>
        {canAssign && onAssignee && <label className="block"><span className="sr-only">Alterar responsável</span><select aria-label="Alterar responsável" value={task.assigned_to || ''} onChange={(e) => onAssignee(task.id, e.target.value)} className="h-8 w-full rounded-lg border border-line bg-canvas px-2 text-[11px] text-ink"><option value="">Sem responsável</option>{members.map((person: any) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select></label>}
        <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" />Prazo: {dateLabel(task.due_date)}</div>
        {task.recording_date && <div className="flex items-center gap-2"><Video className="h-3.5 w-3.5" />Gravação: {dateLabel(task.recording_date)}</div>}
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted">Etapa</label>
        <select
          value={task.status}
          onChange={(e) => onStatus(task.id, e.target.value)}
          className="h-9 w-full rounded-lg border border-line bg-canvas px-2 text-xs text-ink outline-none focus:border-[#C4A66A]"
        >
          {STATUS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
    </article>
  );
}

export default function Production() {
  const { slug } = useParams();
  const { user, level } = useAuth();
  const isPersonal = window.location.pathname.endsWith('/my-space');
  const path = slug
    ? `/studio/production/areas/${slug}`
    : isPersonal ? '/studio/production/mine' : '/studio/production/areas';

  const { data, loading, error, reload } = useApi<any>(path);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recordingDate, setRecordingDate] = useState('');

  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !data?.area?.id) return;
    setSaving(true);
    setFormError('');
    try {
      await post('/studio/production/tasks', {
        area_id: data.area.id,
        title: title.trim(),
        description,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        recording_date: recordingDate || null,
      });
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setDueDate('');
      setRecordingDate('');
      setShowForm(false);
      reload();
    } catch (err: any) {
      setFormError(err.message || 'Não foi possível criar a tarefa.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await patch(`/studio/production/tasks/${id}`, { status });
      reload();
    } catch (err: any) {
      window.alert(err.message || 'Não foi possível atualizar a etapa.');
    }
  }

  async function updateAssignee(id: string, assigned_to: string) {
    try {
      await patch(`/studio/production/tasks/${id}`, { assigned_to: assigned_to || null });
      reload();
    } catch (err: any) {
      window.alert(err.message || 'Não foi possível alterar o responsável.');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" />Carregando produção...</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-500">{error}</div>;
  }

  if (slug) {
    const area = data?.area;
    if (!area) return <p className="py-16 text-center text-muted">Área não encontrada.</p>;
    const tasks = data.tasks || [];
    const members = data.members || [];

    return (
      <div className="space-y-6">
        <Link to="/m/studio/production" className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Todas as áreas</Link>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#C4A66A]/10 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brass">MMV Creative · Produção audiovisual</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{area.name}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/55">{area.description}</p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-white/50">
              <span className="flex items-center gap-2"><Users className="h-4 w-4" />{members.length} integrantes</span>
              <span className="flex items-center gap-2"><Clapperboard className="h-4 w-4" />{tasks.length} tarefas</span>
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-brass" /><h2 className="text-sm font-semibold text-ink">Equipe responsável</h2></div>
          {members.length ? <div className="flex flex-wrap gap-2">
            {members.map((person: any) => <div key={`${person.id}-${person.function}`} className="flex items-center gap-2 rounded-lg bg-ink/[0.04] px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#C4A66A]/10 text-brass"><UserRound className="h-4 w-4" /></span>
              <span><strong className="block text-xs text-ink">{person.full_name}</strong><small className="text-[10px] text-muted">{person.function}</small></span>
            </div>)}
          </div> : <p className="text-xs text-muted">Nenhum integrante vinculado a esta área.</p>}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-ink">Quadro de produção</h2><p className="mt-1 text-xs text-muted">Acompanhe cada entrega ao longo do fluxo.</p></div>
          {level >= 2 && <button onClick={() => setShowForm(!showForm)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#C4A66A] px-4 text-xs font-semibold text-[#111] hover:bg-[#d3b77e]"><Plus className="h-4 w-4" />Nova tarefa</button>}
        </div>

        {showForm && <form onSubmit={createTask} className="grid gap-3 rounded-xl border border-[#C4A66A]/30 bg-surface p-5 md:grid-cols-2">
          <div className="md:col-span-2"><label className="mb-1.5 block text-xs text-muted">Título da tarefa *</label><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Editar Reel do culto" className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-[#C4A66A]" /></div>
          <div className="md:col-span-2"><label className="mb-1.5 block text-xs text-muted">Descrição</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Detalhes da entrega..." className="w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink outline-none focus:border-[#C4A66A]" /></div>
          <div><label className="mb-1.5 block text-xs text-muted">Responsável</label><select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink"><option value="">Não atribuir agora</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name} · {m.function}</option>)}</select></div>
          <div><label className="mb-1.5 block text-xs text-muted">Prazo de entrega</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink" /></div>
          <div><label className="mb-1.5 block text-xs text-muted">Data da gravação</label><input type="date" value={recordingDate} onChange={e => setRecordingDate(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink" /></div>
          {formError && <p className="text-xs text-red-500 md:col-span-2">{formError}</p>}
          <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-line px-4 py-2 text-xs text-muted">Cancelar</button><button disabled={saving} className="rounded-lg bg-[#C4A66A] px-4 py-2 text-xs font-semibold text-[#111] disabled:opacity-50">{saving ? 'Salvando...' : 'Criar tarefa'}</button></div>
        </form>}

        <div className="grid gap-3 xl:grid-cols-5">
          {STATUS.map((step) => {
            const items = tasks.filter((task: any) => task.status === step.id);
            return <section key={step.id} className="min-w-0 rounded-xl border border-line bg-ink/[0.02] p-3">
              <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-ink">{step.label}</h3><span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] text-muted">{items.length}</span></div>
              <div className="space-y-2">{items.map((task: any) => <TaskCard key={task.id} task={task} onStatus={updateStatus} members={members} canAssign={level >= 3} onAssignee={updateAssignee} />)}</div>
              {!items.length && <p className="rounded-lg border border-dashed border-line p-4 text-center text-[10px] text-muted">Nenhuma tarefa</p>}
            </section>;
          })}
        </div>
      </div>
    );
  }

  if (isPersonal) {
    const tasks = data?.tasks || [];
    const areas = data?.areas || [];
    const open = tasks.filter((t: any) => t.status !== 'published');
    return <div>
      <Header eyebrow="Espaço individual" title={`Olá, ${user?.full_name?.split(' ')[0] || 'integrante'}.`} description="Suas responsabilidades, tarefas e entregas em um só lugar." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[{ label: 'Áreas vinculadas', value: areas.length }, { label: 'Tarefas em aberto', value: open.length }, { label: 'Entregas concluídas', value: tasks.filter((t: any) => t.status === 'published').length }].map(item => <div key={item.label} className="rounded-xl border border-line bg-surface p-4"><p className="text-xs text-muted">{item.label}</p><p className="mt-2 text-2xl font-semibold text-ink">{item.value}</p></div>)}
      </div>
      <h2 className="mb-3 text-sm font-semibold text-ink">Minhas tarefas</h2>
      {tasks.length ? <div className="mb-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tasks.map((task: any) => <div key={task.id}><p className="mb-1 text-[10px] uppercase tracking-wider text-brass">{task.area_name}</p><TaskCard task={task} onStatus={async (id, status) => { try { await patch(`/studio/production/tasks/${id}`, { status }); reload(); } catch (err: any) { window.alert(err.message); } }} /></div>)}</div> : <p className="mb-7 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Você ainda não tem tarefas atribuídas.</p>}
      <h2 className="mb-3 text-sm font-semibold text-ink">Minhas áreas</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{areas.map((area: any) => { const Icon = AREAS.find(a => a.slug === area.slug)?.icon || FolderKanban; return <Link key={area.area_id} to={`/m/studio/production/${area.slug}`} className="rounded-xl border border-line bg-surface p-5 transition hover:border-brass/50"><Icon className="h-5 w-5 text-brass" /><h3 className="mt-3 text-sm font-semibold text-ink">{area.name}</h3><p className="mt-1 text-xs text-muted">{area.function}</p><span className="mt-4 flex items-center gap-1 text-xs text-brass">Acessar área <ArrowUpRight className="h-3.5 w-3.5" /></span></Link>; })}</div>
      {!areas.length && <p className="mt-3 text-xs text-muted">Seu perfil ainda não está vinculado a uma equipe de produção.</p>}
    </div>;
  }

  const areas = data?.items || [];
  return <div>
    <Header eyebrow="MMV Creative · Audiovisual" title="Produção audiovisual" description="Organize frentes de trabalho, responsabilidades, captações e entregas do núcleo audiovisual." />
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-line bg-surface p-4"><p className="text-xs text-muted">Áreas de produção</p><p className="mt-2 text-2xl font-semibold text-ink">{areas.length}</p></div>
      <div className="rounded-xl border border-line bg-surface p-4"><p className="text-xs text-muted">Tarefas em aberto</p><p className="mt-2 text-2xl font-semibold text-ink">{areas.reduce((sum: number, a: any) => sum + Number(a.open_tasks || 0), 0)}</p></div>
      <Link to="/m/studio/production/my-space" className="group rounded-xl border border-[#C4A66A]/30 bg-[#C4A66A]/[0.06] p-4 transition hover:bg-[#C4A66A]/10"><p className="text-xs text-brass">Acesso pessoal</p><div className="mt-2 flex items-center justify-between"><p className="text-lg font-semibold text-ink">Meu espaço</p><ArrowUpRight className="h-5 w-5 text-brass" /></div></Link>
    </div>
    <h2 className="mb-3 text-sm font-semibold text-ink">Áreas de produção</h2>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {areas.map((area: any, index: number) => { const Icon = AREAS.find(a => a.slug === area.slug)?.icon || FolderKanban; return <Link key={area.id} to={`/m/studio/production/${area.slug}`} className="group rounded-xl border border-line bg-surface p-5 transition-all hover:-translate-y-1 hover:border-brass/50 hover:shadow-[0_12px_45px_rgba(196,166,106,0.08)]"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-lg border border-[#C4A66A]/20 bg-[#C4A66A]/[0.07] text-brass"><Icon className="h-5 w-5" /></span><span className="font-mono text-[10px] text-muted">0{index + 1}</span></div><h3 className="mt-5 text-[15px] font-semibold text-ink">{area.name}</h3><p className="mt-1.5 min-h-10 text-xs leading-relaxed text-muted">{area.description}</p><div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[11px] text-muted"><span>{area.members_count} integrantes · {area.tasks_count} tarefas</span><span className="flex items-center gap-1 font-medium text-brass">Abrir <ArrowUpRight className="h-3.5 w-3.5" /></span></div></Link>; })}
    </div>
  </div>;
}
