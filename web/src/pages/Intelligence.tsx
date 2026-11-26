import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowUpRight, Bell, CalendarDays, CheckCircle2, Clock3,
  FileText, Megaphone, RadioTower, Send, TrendingUp,
} from 'lucide-react';
import { useApi } from '../lib/useApi';
import { Card, Badge, PageHeader, LoadingBlock } from '../components/ui';
import { formatDateTime, formatDayLabel } from '../lib/format';

type ContentItem = { id: string; title: string; platform: string; format: string; campaign: string | null; status: string; scheduled_at: string | null; assignee_name: string | null };
type Announcement = { id: string; title: string; priority: string; published_at: string; author_name: string; is_read: boolean };
type Area = { id: string; name: string; open_tasks: number; tasks_count: number };
type EventItem = { id: string; name: string; starts_at: string; status: string; checklist_runs: number; reports: number; assignments: number };
type ReportItem = { id: string; title: string; status: string; event_name: string; updated_at: string };

const statusLabels: Record<string, string> = {
  idea: 'Ideia', draft: 'Rascunho', production: 'Em produção', review: 'Em revisão',
  approved: 'Aprovado', scheduled: 'Agendado', published: 'Publicado',
};
const statusTone: Record<string, 'neutral' | 'info' | 'warning' | 'success'> = {
  idea: 'neutral', draft: 'neutral', production: 'info', review: 'warning',
  approved: 'success', scheduled: 'info', published: 'success',
};

function Metric({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: typeof Activity }) {
  return <Card className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><p className="text-[11px] text-muted">{label}</p><Icon size={16} className="text-brass"/></div><p className="mt-3 text-3xl font-semibold tabular-nums text-ink">{value}</p><p className="mt-1 text-[10px] text-muted">{detail}</p></Card>;
}

export default function Intelligence() {
  const content = useApi<{ items: ContentItem[]; totals: { total: number; in_progress: number; scheduled: number; published: number } }>('/communication/content?limit=200');
  const announcements = useApi<{ items: Announcement[]; total: number; unread: number }>('/communication/announcements?limit=100');
  const areas = useApi<{ items: Area[] }>('/studio/production/areas');
  const events = useApi<{ items: EventItem[]; total: number }>('/studio/events?limit=100');
  const reports = useApi<{ items: ReportItem[] }>('/studio/reports');

  const loading = content.loading || announcements.loading || areas.loading || events.loading || reports.loading;
  const contentItems = content.data?.items ?? [];
  const byPlatform = useMemo(() => {
    const map = new Map<string, number>();
    contentItems.forEach(item => map.set(item.platform, (map.get(item.platform) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [contentItems]);
  const upcomingEvents = useMemo(() => (events.data?.items ?? [])
    .filter(event => event.status === 'scheduled' && new Date(event.starts_at).getTime() >= Date.now())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 5), [events.data]);
  const recentAnnouncements = (announcements.data?.items ?? []).slice(0, 4);
  const pendingReports = (reports.data?.items ?? []).filter(report => report.status === 'in_review').length;
  const openProduction = (areas.data?.items ?? []).reduce((sum, area) => sum + Number(area.open_tasks || 0), 0);
  const inProgress = (content.data?.totals.in_progress ?? 0);
  const scheduled = (content.data?.totals.scheduled ?? 0);
  const published = (content.data?.totals.published ?? 0);
  const maxPlatform = Math.max(1, ...byPlatform.map(([, count]) => count));

  return <div className="space-y-6">
    <PageHeader eyebrow="MMV CREATIVE · INTELIGÊNCIA" title="Visão de inteligência" description="Uma leitura operacional da comunicação, do calendário editorial e das entregas do estúdio." actions={<Link to="/m/communication" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:border-brass/40"><Megaphone size={14}/> Comunicação</Link>}/>
    {loading ? <LoadingBlock/> : <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric label="Pautas em andamento" value={inProgress} detail="Ideias, rascunhos, produção e revisão" icon={Activity}/>
      <Metric label="Conteúdos agendados" value={scheduled} detail="Publicações com etapa agendada" icon={CalendarDays}/>
      <Metric label="Conteúdos publicados" value={published} detail="Registros marcados como publicados" icon={CheckCircle2}/>
      <Metric label="Comunicados não lidos" value={announcements.data?.unread ?? 0} detail="Avisos pendentes de leitura" icon={Bell}/>
    </div>}
    <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink">Distribuição por plataforma</h2><p className="mt-1 text-[11px] text-muted">Volume de pautas cadastradas no calendário editorial</p></div><TrendingUp size={17} className="text-brass"/></div>
        {loading ? <div className="py-8"><LoadingBlock/></div> : byPlatform.length ? <div className="mt-5 space-y-4">{byPlatform.map(([platform, count])=><div key={platform}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-ink">{platform}</span><span className="tabular-nums text-muted">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-ink/[.06]"><div className="h-full rounded-full bg-brass" style={{width: `${count / maxPlatform * 100}%`}}/></div></div>)}</div> : <p className="py-8 text-center text-xs text-muted">Ainda não há pautas cadastradas.</p>}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-[10px] text-muted"><span>{content.data?.totals.total ?? 0} pautas no total</span><span>·</span><span>{inProgress} em andamento</span><span>·</span><span>{scheduled} agendadas</span></div>
      </Card>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink">Operação do estúdio</h2><p className="mt-1 text-[11px] text-muted">Pendências conectadas à produção e aos relatórios</p></div><RadioTower size={17} className="text-brass"/></div>
        {loading ? <div className="py-8"><LoadingBlock/></div> : <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 p-3"><div className="flex items-center gap-2.5"><Clock3 size={15} className="text-muted"/><span className="text-xs text-ink">Demandas de produção em aberto</span></div><strong className="text-lg tabular-nums text-ink">{openProduction}</strong></div>
          <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 p-3"><div className="flex items-center gap-2.5"><FileText size={15} className="text-muted"/><span className="text-xs text-ink">Relatórios aguardando revisão</span></div><strong className="text-lg tabular-nums text-ink">{pendingReports}</strong></div>
          <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 p-3"><div className="flex items-center gap-2.5"><CalendarDays size={15} className="text-muted"/><span className="text-xs text-ink">Próximos eventos agendados</span></div><strong className="text-lg tabular-nums text-ink">{upcomingEvents.length}</strong></div>
        </div>}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4 text-[11px]"><Link to="/m/studio/production" className="font-medium text-brass-deep hover:underline">Ver produção</Link><Link to="/m/studio/reports" className="font-medium text-brass-deep hover:underline">Ver relatórios</Link></div>
      </Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink">Próximos eventos</h2><p className="mt-1 text-[11px] text-muted">Compromissos já cadastrados no estúdio</p></div><Link to="/m/studio/events" className="text-[11px] font-medium text-brass-deep hover:underline">Abrir agenda</Link></div>
        {loading ? <LoadingBlock/> : upcomingEvents.length ? <div className="space-y-3">{upcomingEvents.map(event=><div key={event.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{event.name}</p><p className="mt-1 text-[10px] text-muted">{formatDateTime(event.starts_at)}</p></div><Badge tone="info">Agendado</Badge></div>)}</div> : <p className="py-7 text-center text-xs text-muted">Nenhum evento futuro cadastrado.</p>}
      </Card>
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink">Comunicados recentes</h2><p className="mt-1 text-[11px] text-muted">Últimas orientações publicadas</p></div><Link to="/m/communication" className="text-[11px] font-medium text-brass-deep hover:underline">Ver comunicados</Link></div>
        {loading ? <LoadingBlock/> : recentAnnouncements.length ? <div className="space-y-3">{recentAnnouncements.map(item=><div key={item.id} className="flex items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.is_read?'bg-ink/15':'bg-brass'}`}/><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-ink">{item.title}</p><p className="mt-1 text-[10px] text-muted">{item.author_name} · {formatDayLabel(item.published_at)}</p></div>{!item.is_read&&<Badge tone="warning">Novo</Badge>}</div>)}</div> : <p className="py-7 text-center text-xs text-muted">Nenhum comunicado publicado.</p>}
      </Card>
    </div>
    <p className="rounded-xl border border-line bg-canvas/50 px-4 py-3 text-[10px] leading-relaxed text-muted">Estes indicadores representam a operação interna registrada no MMV Creative. Não são métricas de alcance, visualizações ou engajamento das redes sociais, pois a plataforma ainda não está conectada às contas externas.</p>
  </div>;
}
