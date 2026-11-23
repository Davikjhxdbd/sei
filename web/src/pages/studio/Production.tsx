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
  { id: 'review', label: 'Revisão' },
  { id: 'published', label: 'Publicado' },
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
    <header className="relative mb-7 overflow-hidden rounded-2xl border border-brass/20 bg-surface px-5 py-6 shadow-card sm:px-7 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brass/[0.08] blur-3xl" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-px w-7 bg-brass" />
          <p className="mmv-label text-brass-deep">{eyebrow}</p>
        </div>
        <h1 className="text-[27px] font-semibold tracking-[-0.035em] text-ink sm:text-[34px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>
      </div>
    </header>
  );
}

function dateLabel(value?: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString('pt-BR');
}

function TaskCard({ task, onStatus }: { task: any; onStatus: (id: string, status: string) => void }) {
  return (
    <article className="group rounded-xl border border-line bg-surface p-4 shadow-[0_2px_10px_rgba(0,0,0,.08)] transition-colors hover:border-brass/35">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-semibold leading-snug text-ink">{task.title}</h3>
        {task.status === 'published'
          ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          : <Circle className="h-4 w-4 shrink-0 text-muted" />}
      </div>
      {task.description && <p className="mt-2 text-xs leading-relaxed text-muted">{task.description}</p>}
      <div className="mt-4 space-y-2 rounded-lg bg-canvas/70 p-3 text-[11px] text-muted">
        <div className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5" />{task.assignee_name || 'Sem responsável'}</div>
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
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(196,166,106,.45) 1px, transparent 1px), linear-gradient(90deg, rgba(196,166,106,.45) 1px, transparent 1px)', backgroundSize: '34px 34px', maskImage: 'linear-gradient(to right, transparent, black)' }} />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#C4A66A]">MMV STUDIO <span className="mx-1 text-white/25">/</span> Núcleo audiovisual</p>
            <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-white sm:text-[38px]">{area.name}</h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/55">{area.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] text-white/65"><Users className="h-3.5 w-3.5 text-[#C4A66A]" />{members.length} integrantes</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] text-white/65"><Clapperboard className="h-3.5 w-3.5 text-[#C4A66A]" />{tasks.length} tarefas</span>
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2 border-b border-line pb-3"><span className="grid h-8 w-8 place-items-center rounded-lg border border-brass/20 bg-brass/[0.08] text-brass-deep"><Users className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-ink">Equipe responsável</h2><p className="mt-0.5 text-[11px] text-muted">Pessoas vinculadas a este núcleo</p></div></div>
          {members.length ? <div className="flex flex-wrap gap-2">
            {members.map((person: any) => <div key={`${person.id}-${person.function}`} className="flex items-center gap-2 rounded-lg bg-ink/[0.04] px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#C4A66A]/10 text-[#C4A66A]"><UserRound className="h-4 w-4" /></span>
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
            return <section key={step.id} className="min-w-0 rounded-xl border border-line bg-surface/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-3"><h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink">{step.label}</h3><span className="grid h-6 min-w-6 place-items-center rounded-full border border-brass/20 bg-brass/[0.08] px-1.5 text-[10px] font-semibold text-brass-deep">{items.length}</span></div>
              <div className="space-y-2">{items.map((task: any) => <TaskCard key={task.id} task={task} onStatus={updateStatus} />)}</div>
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
      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        {[{ label: 'Áreas vinculadas', value: areas.length }, { label: 'Tarefas em aberto', value: open.length }, { label: 'Entregas concluídas', value: tasks.filter((t: any) => t.status === 'published').length }].map((item, index) => <div key={item.label} className="relative overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-card"><span className="absolute right-4 top-4 h-8 w-8 rounded-full border border-brass/15 bg-brass/[0.06]" /><p className="mmv-label">{item.label}</p><p className="mt-3 text-[27px] font-semibold tracking-tight text-ink">{item.value}</p><span className="mt-1 block text-[10px] text-muted">{index === 0 ? 'Núcleos disponíveis para você' : index === 1 ? 'Precisam de acompanhamento' : 'Finalizadas pela equipe'}</span></div>)}
      </div>
      <h2 className="mb-3 text-sm font-semibold text-ink">Minhas tarefas</h2>
      {tasks.length ? <div className="mb-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tasks.map((task: any) => <div key={task.id}><p className="mb-1 text-[10px] uppercase tracking-wider text-[#C4A66A]">{task.area_name}</p><TaskCard task={task} onStatus={async (id, status) => { try { await patch(`/studio/production/tasks/${id}`, { status }); reload(); } catch (err: any) { window.alert(err.message); } }} /></div>)}</div> : <p className="mb-7 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Você ainda não tem tarefas atribuídas.</p>}
      <h2 className="mb-3 text-sm font-semibold text-ink">Minhas áreas</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{areas.map((area: any) => { const Icon = AREAS.find(a => a.slug === area.slug)?.icon || FolderKanban; return <Link key={area.area_id} to={`/m/studio/production/${area.slug}`} className="rounded-xl border border-line bg-surface p-5 transition hover:border-[#C4A66A]/50"><Icon className="h-5 w-5 text-[#C4A66A]" /><h3 className="mt-3 text-sm font-semibold text-ink">{area.name}</h3><p className="mt-1 text-xs text-muted">{area.function}</p><span className="mt-4 flex items-center gap-1 text-xs text-[#C4A66A]">Acessar área <ArrowUpRight className="h-3.5 w-3.5" /></span></Link>; })}</div>
      {!areas.length && <p className="mt-3 text-xs text-muted">Seu perfil ainda não está vinculado a uma equipe de produção.</p>}
    </div>;
  }

  const areas = data?.items || [];
  return <div>
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-brass/25 bg-[#111] px-5 py-7 shadow-[0_18px_55px_rgba(0,0,0,.18)] sm:px-8 sm:py-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#C4A66A]/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(196,166,106,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(196,166,106,.5) 1px, transparent 1px)', backgroundSize: '38px 38px', maskImage: 'linear-gradient(to right, transparent, black)' }} />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2"><span className="h-px w-7 bg-[#C4A66A]" /><p className="text-[9px] font-bold uppercase tracking-[.25em] text-[#C4A66A]">MMV CREATIVE <span className="mx-1 text-white/25">/</span> AUDIOVISUAL</p></div>
          <h1 className="text-[30px] font-semibold tracking-[-.045em] text-white sm:text-[39px]">Central de produção<span className="text-[#C4A66A]">.</span></h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/55">Um centro de organização para transformar planejamento em entregas consistentes.</p>
        </div>
        <Link to="/m/studio/my-space" className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-xl border border-[#C4A66A]/35 bg-[#C4A66A]/10 px-4 py-3 text-xs font-semibold text-[#E7D4AE] transition hover:border-[#C4A66A]/60 hover:bg-[#C4A66A]/20">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#C4A66A]/15"><UserRound className="h-4 w-4" /></span>
          Meu espaço
          <ArrowUpRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
    <div className="mb-7 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-card"><p className="mmv-label">Áreas de produção</p><p className="mt-2 text-[27px] font-semibold tracking-tight text-ink">{areas.length}</p><p className="mt-1 text-[10px] text-muted">Núcleos audiovisuais cadastrados</p></div>
      <div className="rounded-xl border border-line bg-surface p-4 shadow-card"><p className="mmv-label">Tarefas em aberto</p><p className="mt-2 text-[27px] font-semibold tracking-tight text-ink">{areas.reduce((sum: number, a: any) => sum + Number(a.open_tasks || 0), 0)}</p><p className="mt-1 text-[10px] text-muted">Entregas que ainda estão em andamento</p></div>
    </div>
    <div className="mb-3 flex items-end justify-between gap-3"><div><p className="mmv-label mb-1">Organização por núcleo</p><h2 className="text-[15px] font-semibold text-ink">Áreas de produção</h2></div><span className="text-[10px] text-muted">{areas.length} {areas.length === 1 ? 'área' : 'áreas'}</span></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {areas.map((area: any, index: number) => { const Icon = AREAS.find(a => a.slug === area.slug)?.icon || FolderKanban; return <Link key={area.id} to={`/m/studio/production/${area.slug}`} className="group relative overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brass/45 hover:shadow-[0_16px_42px_rgba(196,166,106,.10)]"><span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brass/[0.06] blur-2xl transition group-hover:bg-brass/[0.12]" /><div className="relative flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl border border-brass/25 bg-brass/[0.09] text-brass-deep transition group-hover:bg-brass/[0.14]"><Icon className="h-5 w-5" /></span><span className="font-mono text-[10px] tracking-widest text-muted/70">0{index + 1}</span></div><div className="relative"><h3 className="mt-5 text-[15px] font-semibold tracking-tight text-ink">{area.name}</h3><p className="mt-2 min-h-10 text-[12px] leading-relaxed text-muted">{area.description}</p><div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[10.5px] text-muted"><span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{area.members_count} integrantes <span className="text-muted/40">·</span> {area.tasks_count} tarefas</span><span className="flex items-center gap-1 font-semibold text-brass-deep">Acessar <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span></div></div></Link>; })}
    </div>
  </div>;
}
