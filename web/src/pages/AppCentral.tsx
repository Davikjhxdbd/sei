import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Command,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { moduleIcon } from '../modules/registry';
import { ThemeToggle } from '../components/ThemeToggle';

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  module_key: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationPayload {
  items: NotificationItem[];
  unread: number;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia!';
  if (hour < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'por aqui';
}

function initials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.09] bg-white/[0.045] shadow-[0_12px_40px_-28px_rgba(0,0,0,.8)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </section>
  );
}

export default function AppCentral() {
  const navigate = useNavigate();
  const { user, modules, state, level, logout } = useAuth();
  const { data: notificationData, loading: notificationsLoading } =
    useApi<NotificationPayload>('/notifications');

  const greeting = useMemo(getGreeting, []);
  const today = useMemo(() => dateFormatter.format(new Date()), []);
  const unread = notificationData?.unread ?? state?.notifications.unread ?? 0;
  const recentNotifications = notificationData?.items?.slice(0, 3) ?? [];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0D10] text-[#F4F5F6]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-48 h-[480px] w-[480px] rounded-full bg-[#8D9EFF]/[0.09] blur-[130px]" />
        <div className="absolute -left-48 top-[42%] h-[420px] w-[420px] rounded-full bg-[#A4B4C5]/[0.045] blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(164,180,197,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(164,180,197,.12) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'linear-gradient(to bottom, black, transparent 78%)' }} />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-[1440px] px-4 pb-8 pt-4 sm:px-7 sm:pt-6 lg:px-10">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className="group flex min-w-0 items-center gap-3" aria-label="MMV CONNECT — início">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/10 bg-white/[0.07] shadow-inner shadow-white/[0.06]">
              <Command className="h-[19px] w-[19px] text-[#A4B4C5]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold tracking-[0.19em] text-white">MMV <span className="text-[#A4B4C5]">CONNECT</span></span>
              <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">Um só lugar. Tudo conectado.</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Link
              to="/notifications"
              aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : 'Notificações'}
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.045] text-white/70 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
            >
              <Bell className="h-[17px] w-[17px]" />
              {unread > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#8D9EFF] shadow-[0_0_10px_#8D9EFF]" />}
            </Link>
            <Link
              to="/profile"
              aria-label="Meu perfil"
              className="ml-1 grid h-10 w-10 place-items-center rounded-xl border border-[#8D9EFF]/25 bg-[#8D9EFF]/10 text-[12px] font-semibold tracking-wide text-[#DCE1FF] transition hover:bg-[#8D9EFF]/20"
            >
              {user ? initials(user.full_name) : <UserRound className="h-4 w-4" />}
            </Link>
          </div>
        </header>

        <div className="mt-10 grid gap-7 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
          <div className="min-w-0">
            <section className="relative">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.17em] text-[#A4B4C5]/75">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8D9EFF] shadow-[0_0_9px_#8D9EFF]" />
                {today}
              </div>
              <h1 className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-[42px]">
                {greeting}
                <span className="mt-1 block bg-gradient-to-r from-white via-white to-[#A4B4C5] bg-clip-text text-transparent">
                  Vamos começar{user ? `, ${getFirstName(user.full_name)}` : ''}?
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-[13px] leading-6 text-[#A4B4C5]/65 sm:text-sm">
                Tudo o que você precisa para seguir em frente, em um só lugar.
              </p>
            </section>

            <section className="mt-9 sm:mt-11">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-[#A4B4C5]/55">Seu ambiente</p>
                  <h2 className="mt-1.5 text-[18px] font-semibold tracking-tight text-white">Seus aplicativos</h2>
                </div>
                <span className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1 text-[10px] tabular-nums text-white/45">
                  {modules.length} {modules.length === 1 ? 'disponível' : 'disponíveis'}
                </span>
              </div>

              {modules.length === 0 ? (
                <GlassCard className="flex flex-col items-center px-5 py-10 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-[#A4B4C5]">
                    <LayoutGrid className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-white">Nenhum aplicativo disponível</h3>
                  <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/45">
                    Os aplicativos liberados para o seu perfil aparecerão aqui. Se precisar, fale com a administração.
                  </p>
                </GlassCard>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {modules.map((module) => {
                    const Icon = moduleIcon(module.icon);
                    return (
                      <Link
                        key={module.id}
                        to={module.route}
                        className="group relative flex min-h-[132px] items-start gap-4 overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.045] p-4 shadow-[0_12px_40px_-28px_rgba(0,0,0,.8)] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 hover:border-[#8D9EFF]/35 hover:bg-white/[0.075] sm:min-h-[146px] sm:p-5"
                      >
                        <span className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#8D9EFF]/[0.07] blur-3xl transition group-hover:bg-[#8D9EFF]/[0.14]" />
                        <span
                          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-white/10 bg-white/[0.07] text-[#DCE1FF]"
                          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07)' }}
                        >
                          <Icon className="h-[19px] w-[19px]" />
                        </span>
                        <span className="relative min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold tracking-tight text-white">{module.name}</span>
                          <span className="mt-1.5 block line-clamp-2 text-[11.5px] leading-5 text-[#A4B4C5]/60">
                            {module.description || 'Acesse este aplicativo do MMV CONNECT.'}
                          </span>
                          <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-[#AAB6FF]">
                            Acessar <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-8">
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-[#A4B4C5]/55">Acesso rápido</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { label: 'Meu perfil', detail: 'Seus dados', icon: UserRound, to: '/profile' },
                  { label: 'Calendário', detail: 'Datas e eventos', icon: CalendarDays, to: '/calendar' },
                  { label: 'Notificações', detail: unread ? `${unread} não lidas` : 'Tudo em dia', icon: Bell, to: '/notifications' },
                  { label: 'Central de ajuda', detail: 'Suporte e orientações', icon: CircleHelp, to: '/help' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.to} to={item.to} className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-white/[0.075] bg-white/[0.025] px-3 py-3 transition hover:border-white/15 hover:bg-white/[0.06]">
                      <Icon className="h-4 w-4 shrink-0 text-[#A4B4C5]/70 transition group-hover:text-[#DCE1FF]" />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium text-white/85">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[9.5px] text-white/35">{item.detail}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
              {level >= 4 && (
                <Link to="/admin/audit" className="mt-2.5 inline-flex items-center gap-2 rounded-lg px-1 py-2 text-[11px] text-white/40 transition hover:text-white/75">
                  <ShieldCheck className="h-3.5 w-3.5" /> Administração da plataforma <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </section>
          </div>

          <aside className="space-y-3 lg:pt-1">
            <GlassCard className="p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#AAB6FF]" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#A4B4C5]/65">Seu espaço</p>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#8D9EFF]/25 bg-[#8D9EFF]/10 text-sm font-semibold text-[#DCE1FF]">
                  {user ? initials(user.full_name) : <UserRound className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-white">{user?.full_name ?? 'Seu perfil'}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-white/40">{user?.username ? `@${user.username}` : 'Conta MMV CONNECT'}</span>
                </span>
              </div>
              {user?.sectors?.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {user.sectors.slice(0, 3).map((sector) => (
                    <span key={sector.id} className="rounded-full border border-white/[0.09] bg-white/[0.04] px-2.5 py-1 text-[9px] text-white/55">{sector.name}</span>
                  ))}
                  {user.sectors.length > 3 && <span className="px-1 py-1 text-[9px] text-white/35">+{user.sectors.length - 3}</span>}
                </div>
              ) : null}
              <Link to="/profile" className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 text-[11px] font-medium text-[#C6CEFF] transition hover:text-white">
                Ver meu perfil <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </GlassCard>

            <GlassCard className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A4B4C5]/55">Acompanhe</p>
                  <h2 className="mt-1 text-[13px] font-semibold text-white">Notificações</h2>
                </div>
                {unread > 0 && <span className="rounded-full bg-[#8D9EFF]/15 px-2 py-1 text-[9px] font-semibold text-[#C6CEFF]">{unread} novas</span>}
              </div>
              <div className="px-4">
                {notificationsLoading ? (
                  <div className="space-y-3 py-4">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.07]" />
                    <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" />
                  </div>
                ) : recentNotifications.length ? (
                  <div className="divide-y divide-white/[0.07]">
                    {recentNotifications.map((item) => (
                      <Link key={item.id} to={item.link || '/notifications'} className="block py-3 transition hover:opacity-75">
                        <span className="flex items-start gap-2.5">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.read_at ? 'bg-white/20' : 'bg-[#8D9EFF] shadow-[0_0_8px_#8D9EFF]'}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-medium leading-4 text-white/85">{item.title}</span>
                            {item.body && <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-white/40">{item.body}</span>}
                            <span className="mt-1.5 block text-[9px] text-white/30">{timeFormatter.format(new Date(item.created_at))}</span>
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <Bell className="mx-auto h-4 w-4 text-white/25" />
                    <p className="mt-2 text-[11px] font-medium text-white/65">Tudo tranquilo por aqui</p>
                    <p className="mt-1 text-[10px] text-white/35">Seus avisos aparecerão neste espaço.</p>
                  </div>
                )}
              </div>
              <Link to="/notifications" className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3 text-[10px] font-medium text-[#C6CEFF] transition hover:bg-white/[0.025]">
                Ver todas as notificações <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </GlassCard>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[10px] font-medium text-white/40 transition hover:border-red-400/20 hover:bg-red-400/[0.05] hover:text-red-200"
            >
              <LogOut className="h-3.5 w-3.5" /> Encerrar sessão
            </button>
          </aside>
        </div>

        <footer className="mt-10 flex flex-col gap-2 border-t border-white/[0.07] pt-4 text-[9px] uppercase tracking-[0.15em] text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <span>MMV CONNECT <span className="mx-1 text-white/15">/</span> Plataforma integrada</span>
          <span>Conectando pessoas, equipes e propósito.</span>
        </footer>
      </div>
    </main>
  );
}
