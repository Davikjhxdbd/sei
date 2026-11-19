import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileText,
  Film,
  Layers,
  TrendingUp,
  Users2,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import {
  MEDIA_STATUS,
  formatDayLabel,
  formatDateTime,
  formatTime,
} from '../../lib/format';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
  StatCard,
  StatusBadge,
  cx,
} from '../../components/ui';

interface DashboardPayload {
  totals: {
    upcoming_events: number;
    open_errors: number;
    pending_reports: number;
    media_pending: number;
    media_published: number;
    my_tasks: number;
    blocked_tasks: number;
    open_problems: number;
    active_assignments: number;
    open_occurrences: number | null;
  };
  upcoming: {
    id: string;
    name: string;
    type: string;
    starts_at: string;
    ends_at: string | null;
    assignments: number;
    checklist_runs: number;
  }[];
  myTasks: {
    id: string;
    title: string;
    status: string;
    run_id: string;
    event_id: string;
    event_name: string;
    starts_at: string;
  }[];
  blocked: {
    id: string;
    title: string;
    block_reason: string | null;
    event_name: string;
    starts_at: string;
    assignee_name: string | null;
  }[];
  mediaByStatus: { status: string; count: number }[];
  reportsPending: {
    id: string;
    title: string;
    status: string;
    event_name: string;
    starts_at: string;
  }[];
  problemsOpen: {
    id: string;
    code: string;
    title: string;
    status: string;
    priority: string;
    sector_name: string | null;
  }[];
  recentActivity: {
    id: string;
    actor_name: string | null;
    action: string;
    entity: string;
    created_at: string;
  }[];
}

const ACTION_LABELS: Record<string, string> = {
  'event.created': 'Evento criado',
  'event.updated': 'Evento atualizado',
  'event.status_changed': 'Situação de evento alterada',
  'report.created': 'Relatório criado',
  'report.finalized': 'Relatório finalizado',
  'report.section_updated': 'Seção de relatório atualizada',
  'error.created': 'Erro registrado',
  'error.updated': 'Erro atualizado',
  'problem.created': 'Problema registrado',
  'authorization.approved': 'Autorização aprovada',
  'schedule.published': 'Escala publicada',
  'media.status_changed': 'Situação de mídia alterada',
  'checklist_task.done': 'Tarefa concluída',
  'checklist_task.blocked': 'Tarefa bloqueada',
};

export default function Dashboard() {
  const { data, loading } = useApi<DashboardPayload>('/studio/dashboard');
  const { user, can } = useAuth();

  if (loading || !data) return <LoadingBlock label="Carregando painel…" />;

  const { totals } = data;
  const mediaCounts = new Map(
    data.mediaByStatus.map((item) => [item.status, item.count]),
  );

  return (
    <div className="space-y-5">
      <section className="relative isolate overflow-hidden rounded-[22px] border border-[#C9AD78]/25 bg-[#0B0D10] px-6 py-7 shadow-[0_24px_70px_-38px_rgba(201,173,120,.32)] sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60" style={{ backgroundImage: 'radial-gradient(ellipse at 82% 18%, rgba(201,173,120,.16), transparent 34%), linear-gradient(115deg, transparent 48%, rgba(255,255,255,.025) 48.2%, transparent 48.5%)' }} />
        <div className="pointer-events-none absolute -right-12 -bottom-28 -z-10 h-72 w-72 rounded-full border border-[#C9AD78]/10" />
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-[#C9AD78]" />
              <p className="text-[10px] font-bold uppercase tracking-[.34em] text-[#D8C29B]">
                MMV STUDIO <span className="text-white/30">/</span> CENTRAL DE OPERAÇÕES
              </p>
            </div>
            <h1 className="text-[2rem] font-black leading-[1.02] tracking-[-.055em] text-white sm:text-[3.35rem]">
              {new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'},{' '}
              <span className="text-[#D2B77F]">{user?.full_name.split(' ')[0]}</span>.
            </h1>
            <p className="mt-4 max-w-lg text-[13px] leading-relaxed text-white/55 sm:text-sm">
              Histórias que ganham vida. Mensagens que ganham o mundo.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <span className="text-[10px] font-medium uppercase tracking-[.2em] text-white/40">
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {can('events.create') && (
                <Link
                  to="/m/studio/events"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#C9AD78]/35 bg-white/[.035] px-4 text-[12px] font-semibold text-[#E2CEA8] transition hover:border-[#C9AD78]/65 hover:bg-[#C9AD78]/10"
                >
                  <CalendarDays className="h-4 w-4" /> Eventos
                </Link>
              )}
              <Link
                to="/m/studio/checklists"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#C9AD78] px-4 text-[12px] font-bold text-[#111] transition hover:bg-[#E0C99D]"
              >
                <ClipboardList className="h-4 w-4" /> Checklists
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-4">
          <span className="text-[9px] font-bold uppercase tracking-[.28em] text-[#C9AD78]/80">STUDIO</span>
          <span className="h-px flex-1 bg-gradient-to-r from-[#C9AD78]/35 to-transparent" />
          <span className="text-[9px] uppercase tracking-[.2em] text-white/25">CRIAR · PRODUZIR · ENTREGAR</span>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:transition-transform [&>*]:duration-300 [&>*]:hover:-translate-y-1">
        <StatCard
          label="Próximos eventos"
          value={totals.upcoming_events}
          hint={`${totals.active_assignments} designações publicadas`}
          icon={CalendarDays}
          tone="info"
        />
        <StatCard
          label="Minhas tarefas"
          value={totals.my_tasks}
          hint={totals.blocked_tasks ? `${totals.blocked_tasks} bloqueadas na operação` : 'nenhuma bloqueada'}
          icon={ClipboardList}
          tone="warning"
        />
        <StatCard
          label="Relatórios pendentes"
          value={totals.pending_reports}
          hint="rascunhos e em revisão"
          icon={FileText}
        />
        <StatCard
          label="Mídia pendente"
          value={totals.media_pending}
          hint={`${totals.media_published} publicadas`}
          icon={Film}
          tone="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader
            icon={CalendarDays}
            title="Próximos eventos"
            description="Agenda confirmada do estúdio."
            action={
              <Link
                to="/m/studio/events"
                className="text-[12px] font-medium text-studio hover:underline"
              >
                Ver todos
              </Link>
            }
          />
          {data.upcoming.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarDays}
              title="Nenhum evento futuro"
              description="Cadastre os próximos cultos e ensaios para organizar escalas e checklists."
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.upcoming.map((event) => (
                <li key={event.id}>
                  <Link
                    to={`/m/studio/events/${event.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink/[0.02]"
                  >
                    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-ink/[0.04] text-ink">
                      <span className="text-[13px] font-semibold leading-none">
                        {new Date(event.starts_at).getDate()}
                      </span>
                      <span className="mt-0.5 text-[9px] uppercase tracking-wider2 text-muted">
                        {new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                          .format(new Date(event.starts_at))
                          .replace('.', '')}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium text-ink">
                          {event.name}
                        </span>
                        <Badge>{event.type}</Badge>
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-muted">
                        {formatDayLabel(event.starts_at)} ·{' '}
                        {formatTime(event.starts_at)}
                        {event.ends_at ? `–${formatTime(event.ends_at)}` : ''} ·{' '}
                        {event.assignments} designações · {event.checklist_runs}{' '}
                        checklists
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={ClipboardList}
            title="Minhas tarefas"
            description="Checklists atribuídos a você."
          />
          {data.myTasks.length === 0 ? (
            <EmptyState
              compact
              icon={ClipboardList}
              title="Nada pendente"
              description="Você não possui tarefas abertas neste momento."
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.myTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    to={`/m/studio/checklists/runs/${task.run_id}`}
                    className="flex items-start gap-2.5 px-5 py-3 hover:bg-ink/[0.02]"
                  >
                    <span
                      className={cx(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        task.status === 'blocked'
                          ? 'bg-amber-500'
                          : task.status === 'done'
                            ? 'bg-emerald-500'
                            : 'bg-ink/25',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">
                        {task.title}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {task.event_name} · {formatDayLabel(task.starts_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.blocked.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader
            icon={AlertTriangle}
            title="Checklists bloqueados"
            description="Tarefas que impedem a abertura ou o encerramento do evento."
          />
          <ul className="divide-y divide-amber-200/70">
            {data.blocked.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">{task.title}</p>
                  <p className="text-[11.5px] text-amber-800/80">
                    {task.event_name} · {formatDayLabel(task.starts_at)} ·{' '}
                    {task.assignee_name ?? 'sem responsável'}
                  </p>
                </div>
                <p className="max-w-sm text-[11.5px] italic text-amber-900/80">
                  “{task.block_reason}”
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={Film}
            title="Acervo de mídia"
            description="Situação dos conteúdos gravados e transmitidos."
            action={
              <Link
                to="/m/studio/media"
                className="text-[12px] font-medium text-studio hover:underline"
              >
                Abrir acervo
              </Link>
            }
          />
          <div className="space-y-2.5 p-5">
            {Object.entries(MEDIA_STATUS).map(([status, meta]) => {
              const count = mediaCounts.get(status) ?? 0;
              const total =
                Array.from(mediaCounts.values()).reduce((a, b) => a + b, 0) || 1;
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-[11.5px]">
                    <span className="text-ink/75">{meta.label}</span>
                    <span className="tabular-nums text-muted">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                    <div
                      className={cx(
                        'h-full rounded-full',
                        status === 'published'
                          ? 'bg-emerald-500'
                          : status === 'reported_lost' || status === 'not_found'
                            ? 'bg-red-400'
                            : meta.tone === 'info'
                              ? 'bg-studio'
                              : 'bg-amber-400',
                      )}
                      style={{ width: `${Math.max(4, (count / total) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={FileText}
              title="Relatórios em andamento"
              description="Aguardando preenchimento, revisão ou finalização."
            />
            {data.reportsPending.length === 0 ? (
              <EmptyState
                compact
                icon={FileText}
                title="Todos finalizados"
                description="Nenhum relatório pendente de conclusão."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.reportsPending.map((report) => (
                  <li key={report.id}>
                    <Link
                      to={`/m/studio/reports/${report.id}`}
                      className="flex items-center justify-between gap-2 px-5 py-2.5 hover:bg-ink/[0.02]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] text-ink">
                          {report.title}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {report.event_name} · {formatDayLabel(report.starts_at)}
                        </span>
                      </span>
                      <StatusBadge
                        map={{
                          draft: { label: 'Rascunho', tone: 'neutral' },
                          in_review: { label: 'Em revisão', tone: 'warning' },
                          finalized: { label: 'Finalizado', tone: 'success' },
                        }}
                        value={report.status}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={Layers}
              title="Problemas em aberto"
              description="Questões estruturais em acompanhamento."
            />
            {data.problemsOpen.length === 0 ? (
              <EmptyState
                compact
                icon={Layers}
                title="Nenhum problema em aberto"
                description="A operação está sem pendências estruturais."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.problemsOpen.map((problem) => (
                  <li key={problem.id}>
                    <Link
                      to={`/m/studio/problems/${problem.id}`}
                      className="flex items-center justify-between gap-2 px-5 py-2.5 hover:bg-ink/[0.02]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] text-ink">
                          {problem.title}
                        </span>
                        <span className="block font-mono text-[10.5px] text-muted">
                          {problem.code}
                          {problem.sector_name ? ` · ${problem.sector_name}` : ''}
                        </span>
                      </span>
                      <Badge tone={problem.priority === 'critical' ? 'danger' : 'warning'}>
                        {problem.priority === 'critical'
                          ? 'Crítica'
                          : problem.priority === 'high'
                            ? 'Alta'
                            : problem.priority === 'medium'
                              ? 'Média'
                              : 'Baixa'}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          icon={TrendingUp}
          title="Atividade recente"
          description="Últimas operações registradas no módulo e na plataforma."
        />
        {data.recentActivity.length === 0 ? (
          <EmptyState compact title="Sem atividade registrada" />
        ) : (
          <ul className="divide-y divide-line">
            {data.recentActivity.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5"
              >
                <span className="flex items-center gap-2 text-[12.5px] text-ink/80">
                  <Users2 className="h-3.5 w-3.5 text-muted" />
                  {entry.actor_name ?? 'Sistema'}
                  <span className="text-muted">
                    · {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                </span>
                <span className="text-[11px] text-muted">
                  {formatDateTime(entry.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
