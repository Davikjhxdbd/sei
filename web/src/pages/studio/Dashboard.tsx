import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Film,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { formatDayLabel, formatTime } from '../../lib/format';
import { LoadingBlock, cx } from '../../components/ui';

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

function GlassLink({
  to,
  icon: Icon,
  children,
  subtle = false,
}: {
  to: string;
  icon: typeof CalendarDays;
  children: ReactNode;
  subtle?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cx(
        'group relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl border px-4 py-2.5 text-[12px] font-semibold transition duration-300',
        subtle
          ? 'border-white/15 bg-white/[.045] text-white/80 hover:border-[#D8C29B]/45 hover:bg-white/[.09]'
          : 'border-[#D8C29B]/35 bg-[#C9AD78]/15 text-[#F0DFC0] shadow-[inset_0_1px_0_rgba(255,255,255,.13)] hover:border-[#E5D2AC]/60 hover:bg-[#C9AD78]/25',
      )}
    >
      <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-all duration-700 group-hover:left-[125%] group-hover:opacity-100" />
      <Icon className="relative h-4 w-4" />
      <span className="relative">{children}</span>
      <ArrowUpRight className="relative h-3.5 w-3.5 opacity-45 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

function GlassPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'relative isolate overflow-hidden rounded-[26px] border border-white/[.16] bg-white/[.055] shadow-[0_22px_65px_-38px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-2xl',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,.10), transparent 28%, transparent 70%, rgba(201,173,120,.07))',
        }}
      />
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { data, loading } = useApi<DashboardPayload>('/studio/dashboard');
  const { user, level, can, state } = useAuth();

  if (loading || !data) return <LoadingBlock label="Preparando seu espaço…" />;

  const firstName = user?.full_name?.trim().split(/\s+/)[0] ?? 'por aqui';
  const roleNames =
    user?.roles.map((role) => role.replace(/_/g, ' ')).join(' · ') ??
    'Equipe Studio';
  const unread = state?.notifications.unread ?? 0;
  const isLeadership = level >= 4;
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? 'Bom dia'
      : now.getHours() < 18
        ? 'Boa tarde'
        : 'Boa noite';
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(now);

  const nextEvents = data.upcoming.slice(0, 3);
  const myTasks = data.myTasks.slice(0, 3);

  return (
    <div className="relative isolate mx-auto max-w-[1120px] space-y-4 pb-3 sm:space-y-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-10 -top-16 -z-10 h-[430px]"
        style={{
          background:
            'radial-gradient(ellipse at 78% 10%, rgba(201,173,120,.16), transparent 42%), radial-gradient(ellipse at 12% 38%, rgba(255,255,255,.055), transparent 38%)',
        }}
      />

      <GlassPanel className="px-5 py-6 sm:px-8 sm:py-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full border border-[#D8C29B]/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-16 -z-10 h-52 w-52 rounded-full border border-white/[.07]"
        />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#D8C29B]" />
              <p className="text-[9px] font-semibold uppercase tracking-[.3em] text-[#D8C29B]/90">
                MMV STUDIO
              </p>
              <span className="h-px w-7 bg-[#D8C29B]/40" />
              <p className="text-[9px] uppercase tracking-[.2em] text-white/35">
                Seu espaço de trabalho
              </p>
            </div>
            <h1 className="text-[2rem] font-semibold leading-tight tracking-[-.045em] text-white sm:text-[2.7rem]">
              {greeting},{' '}
              <span className="text-[#E2CCA2]">{firstName}</span>.
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/60 sm:text-sm">
              Que bom ter você por aqui. Vamos fazer um ótimo trabalho juntos.
            </p>
            <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D8C29B] shadow-[0_0_10px_rgba(216,194,155,.8)]" />
              <span className="truncate text-[10px] font-medium text-white/65">
                {user?.full_name ?? 'Equipe MMV'} <span className="text-white/30">·</span> {roleNames}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <p className="text-[10px] font-medium capitalize tracking-[.12em] text-white/40">
              {dateLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {can('events.create') && (
                <GlassLink to="/m/studio/events" icon={CalendarDays}>
                  Eventos
                </GlassLink>
              )}
              <GlassLink to="/m/studio/checklists" icon={ClipboardCheck} subtle>
                Checklists
              </GlassLink>
            </div>
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <GlassPanel>
          <div className="flex items-center justify-between gap-3 border-b border-white/[.09] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#D8C29B]/20 bg-[#D8C29B]/[.09] text-[#E2CCA2]">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold text-white">Suas próximas atividades</h2>
                <p className="mt-0.5 text-[10.5px] text-white/40">O que vem pela frente no Studio</p>
              </div>
            </div>
            <Link
              to="/m/studio/events"
              className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-medium text-[#D8C29B] transition hover:text-white"
            >
              Agenda <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {nextEvents.length === 0 ? (
            <div className="px-5 py-7 text-center">
              <CalendarDays className="mx-auto h-5 w-5 text-white/25" />
              <p className="mt-2 text-[12px] font-medium text-white/75">Nenhuma atividade próxima</p>
              <p className="mt-1 text-[11px] text-white/40">Quando houver uma nova atividade, ela aparecerá aqui.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[.07]">
              {nextEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    to={'/m/studio/events/' + event.id}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[.045]"
                  >
                    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[.055] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
                      <span className="text-[14px] font-semibold leading-none">
                        {new Date(event.starts_at).getDate()}
                      </span>
                      <span className="mt-1 text-[8px] uppercase tracking-wider text-[#D8C29B]">
                        {new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                          .format(new Date(event.starts_at))
                          .replace('.', '')}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-white/90">
                        {event.name}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[10.5px] text-white/45">
                        <Clock3 className="h-3 w-3" />
                        {formatDayLabel(event.starts_at)} · {formatTime(event.starts_at)}
                        {event.ends_at ? '–' + formatTime(event.ends_at) : ''}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-[#D8C29B]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center justify-between gap-3 border-b border-white/[.09] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#D8C29B]/20 bg-[#D8C29B]/[.09] text-[#E2CCA2]">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold text-white">Suas tarefas</h2>
                <p className="mt-0.5 text-[10.5px] text-white/40">Pequenos passos, grandes entregas</p>
              </div>
            </div>
            <Link
              to="/m/studio/checklists"
              className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-medium text-[#D8C29B] transition hover:text-white"
            >
              Abrir <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {myTasks.length === 0 ? (
            <div className="px-5 py-7 text-center">
              <CheckCircle2 className="mx-auto h-5 w-5 text-[#D8C29B]/70" />
              <p className="mt-2 text-[12px] font-medium text-white/75">Tudo em dia por aqui</p>
              <p className="mt-1 text-[11px] text-white/40">Você não tem tarefas abertas neste momento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[.07]">
              {myTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    to={'/m/studio/checklists/runs/' + task.run_id}
                    className="group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-white/[.045]"
                  >
                    <span
                      className={cx(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        task.status === 'blocked'
                          ? 'bg-amber-300 shadow-[0_0_9px_rgba(252,211,77,.35)]'
                          : 'bg-[#D8C29B] shadow-[0_0_9px_rgba(216,194,155,.3)]',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-white/85">
                        {task.title}
                      </span>
                      <span className="mt-1 block truncate text-[10.5px] text-white/40">
                        {task.event_name} · {formatDayLabel(task.starts_at)}
                      </span>
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-[#D8C29B]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Link
          to="/notifications"
          className="group relative flex min-h-[68px] items-center gap-3 overflow-hidden rounded-[22px] border border-white/[.14] bg-white/[.045] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.09)] backdrop-blur-xl transition hover:border-[#D8C29B]/35 hover:bg-white/[.075] sm:px-5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#D8C29B]/20 bg-[#D8C29B]/[.08] text-[#E2CCA2]">
            <Bell className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-white/90">Comunicados e avisos</span>
            <span className="mt-0.5 block text-[10.5px] text-white/45">
              Mensagens da equipe e orientações para você
            </span>
          </span>
          {unread > 0 && (
            <span className="rounded-full border border-[#D8C29B]/25 bg-[#D8C29B]/15 px-2.5 py-1 text-[10px] font-semibold text-[#E2CCA2]">
              {unread > 9 ? '9+' : unread} novos
            </span>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <div className="flex items-center justify-center gap-2 rounded-[22px] border border-white/[.10] bg-black/15 px-4 py-3 text-[10px] text-white/40 backdrop-blur-xl">
          <Film className="h-3.5 w-3.5 text-[#D8C29B]/75" />
          <span>CRIAR · PRODUZIR · ENTREGAR</span>
        </div>
      </div>

      {isLeadership && (
        <div className="flex items-center justify-between gap-3 px-1 pt-0.5">
          <p className="text-[10px] text-white/30">
            Visão de gestão disponível nos módulos de controle e relatórios.
          </p>
          <Link
            to="/m/studio/reports"
            className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-[#D8C29B]/75 hover:text-[#E2CCA2]"
          >
            Relatórios <FileText className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
