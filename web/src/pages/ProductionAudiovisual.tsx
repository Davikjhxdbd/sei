import { Link, useParams } from 'react-router-dom';
import { Clapperboard, Camera, Palette, RadioTower, Film, Image, AudioLines, Layers3, ArrowLeft, CheckCircle2, Clock3, Users2 } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader } from '../components/ui';
import { useApi } from '../lib/useApi';

type Area = { id: string; name: string; slug: string; description: string | null; members_count: number; tasks_count: number; open_tasks: number };
type Summary = { totals: { areas: number; members: number; tasks: number; open: number; published: number } };
type Detail = { area: { id: string; name: string; description: string | null }; members: { id: string; full_name: string; function: string }[]; tasks: { id: string; title: string; description: string | null; status: string; due_date: string | null; assignee_name: string | null }[] };
const icons = [Clapperboard, Camera, Palette, RadioTower, Film, Image, AudioLines, Layers3];
const statuses: Record<string, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' }> = {
  planning: { label: 'Planejamento', tone: 'neutral' },
  recording: { label: 'Em produção', tone: 'info' },
  editing: { label: 'Em edição', tone: 'warning' },
  review: { label: 'Em revisão', tone: 'warning' },
  published: { label: 'Entregue', tone: 'success' },
};
function dateLabel(value: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(value.includes('T') ? value : value + 'T12:00:00');
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
}
export default function ProductionAudiovisual() {
  const { slug } = useParams();
  const summaryApi = useApi<Summary>(slug ? null : '/studio/production/summary');
  const areasApi = useApi<{ items: Area[] }>(slug ? null : '/studio/production/areas');
  const detailApi = useApi<Detail>(slug ? '/studio/production/areas/' + encodeURIComponent(slug) : null);
  if (slug ? detailApi.loading : summaryApi.loading || areasApi.loading) return <LoadingBlock label="Preparando o ambiente de produção…" />;
  if (slug) {
    const detail = detailApi.data;
    if (detailApi.error || !detail) return <div className="space-y-4"><Link to="/m/production" className="inline-flex items-center gap-2 text-sm text-muted"><ArrowLeft className="h-4 w-4" /> Produção Audiovisual</Link><Card className="p-6 text-center"><p className="font-semibold text-ink">Não foi possível abrir esta área.</p><p className="mt-2 text-sm text-muted">{detailApi.error || 'Área não encontrada.'}</p><button onClick={() => void detailApi.reload()} className="mt-3 text-sm font-semibold text-brass-deep">Tentar novamente</button></Card></div>;
    return <div className="space-y-6">
      <Link to="/m/production" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> Visão geral da produção</Link>
      <PageHeader eyebrow="PRODUÇÃO AUDIOVISUAL · ÁREA" title={detail.area.name} description={detail.area.description || 'Demandas, responsáveis e entregas desta área.'} />
      <div className="grid gap-3 sm:grid-cols-2"><Card className="p-4"><p className="text-xs text-muted">Demandas</p><p className="mt-1 text-2xl font-semibold text-ink">{detail.tasks.length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Equipe vinculada</p><p className="mt-1 text-2xl font-semibold text-ink">{detail.members.length}</p></Card></div>
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold text-ink">Fluxo de produção</h2><Badge tone="accent">{detail.tasks.length} demandas</Badge></div><Card className="divide-y divide-line p-0">{detail.tasks.length ? detail.tasks.map(task => { const status = statuses[task.status] || { label: task.status, tone: 'neutral' as const }; return <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{task.title}</p>{task.description && <p className="mt-1 text-xs text-muted">{task.description}</p>}<p className="mt-1.5 text-[11px] text-muted">{task.assignee_name || 'Sem responsável'} · {dateLabel(task.due_date)}</p></div><Badge tone={status.tone}>{status.label}</Badge></div>; }) : <EmptyState icon={Film} title="Nenhuma demanda nesta área" description="As produções cadastradas aparecerão aqui." compact />}</Card></section>
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold text-ink">Equipe</h2><Badge>{detail.members.length} integrantes</Badge></div><Card className="divide-y divide-line p-0">{detail.members.length ? detail.members.map(member => <div key={member.id} className="flex items-center gap-3 p-4"><Users2 className="h-4 w-4 text-muted" /><div><p className="text-sm font-medium text-ink">{member.full_name}</p><p className="text-xs text-muted">{member.function || 'Integrante'}</p></div></div>) : <EmptyState icon={Users2} title="Equipe ainda não vinculada" compact />}</Card></section>
    </div>;
  }
  if (summaryApi.error || areasApi.error || !summaryApi.data) return <Card className="p-6 text-center"><p className="font-semibold text-ink">Não foi possível carregar a produção audiovisual.</p><p className="mt-2 text-sm text-muted">{summaryApi.error || areasApi.error || 'Tente novamente.'}</p><button onClick={() => { void summaryApi.reload(); void areasApi.reload(); }} className="mt-3 text-sm font-semibold text-brass-deep">Tentar novamente</button></Card>;
  const totals = summaryApi.data.totals;
  const areas = areasApi.data?.items ?? [];
  return <div className="space-y-6">
    <PageHeader eyebrow="MMV CREATIVE · OPERAÇÃO" title="Produção Audiovisual" description="Organize equipes, demandas e entregas de cada frente de produção." />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="p-4"><div className="flex items-center gap-2 text-muted"><Layers3 className="h-4 w-4" /><span className="text-xs">Áreas</span></div><p className="mt-2 text-2xl font-semibold text-ink">{totals.areas}</p></Card>
      <Card className="p-4"><div className="flex items-center gap-2 text-muted"><Users2 className="h-4 w-4" /><span className="text-xs">Integrantes</span></div><p className="mt-2 text-2xl font-semibold text-ink">{totals.members}</p></Card>
      <Card className="p-4"><div className="flex items-center gap-2 text-muted"><Clock3 className="h-4 w-4" /><span className="text-xs">Em andamento</span></div><p className="mt-2 text-2xl font-semibold text-ink">{totals.open}</p></Card>
      <Card className="p-4"><div className="flex items-center gap-2 text-muted"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Entregues</span></div><p className="mt-2 text-2xl font-semibold text-ink">{totals.published}</p></Card>
    </div>
    <section className="space-y-3"><div className="flex items-end justify-between gap-3"><div><h2 className="text-base font-semibold text-ink">Frentes de produção</h2><p className="mt-1 text-xs text-muted">Acesse uma área para acompanhar demandas e equipe.</p></div><Badge tone="accent">{areas.length} áreas</Badge></div>
      {areas.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{areas.map((area, index) => { const Icon = icons[index % icons.length]; return <Link key={area.id} to={'/m/production/' + area.slug} className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brass"><Card className="h-full p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-brass/40"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-brass/20 bg-brass/[0.08] text-brass-deep"><Icon className="h-5 w-5" /></span><span className="text-[10px] font-semibold tracking-[.12em] text-muted">ÁREA {String(index + 1).padStart(2, '0')}</span></div><h3 className="mt-4 text-[15px] font-semibold text-ink">{area.name}</h3><p className="mt-1 min-h-8 text-xs leading-relaxed text-muted">{area.description || 'Equipe e demandas desta frente de produção.'}</p><div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-muted"><span>{area.members_count} integrantes</span><span>{area.open_tasks} em aberto</span></div></Card></Link>; })}</div> : <Card><EmptyState icon={Clapperboard} title="Nenhuma área de produção cadastrada" description="As áreas configuradas aparecerão aqui." compact /></Card>}
    </section>
  </div>;
}
