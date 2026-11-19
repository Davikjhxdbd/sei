import '../connect-hybrid.css';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Bell, CalendarDays, ChevronRight,
  HelpCircle, LogOut, Menu, RefreshCw,
  UserRound, X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { moduleIcon } from '../modules/registry';

type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
};

function ConnectMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <path d="M12 47V18L32 37L52 18V47" stroke="#F0E3C4" strokeWidth="3.2" strokeLinecap="square" strokeLinejoin="round" />
      <path d="M32 37V10" stroke="#C4A66A" strokeWidth="3.2" strokeLinecap="square" />
      <path d="M12 18H6M52 18H58" stroke="#C4A66A" strokeOpacity=".65" strokeWidth="1.5" />
      <circle cx="32" cy="9" r="3.2" fill="#F4F5F6" />
      <circle cx="12" cy="18" r="2.3" fill="#C4A66A" />
      <circle cx="52" cy="18" r="2.3" fill="#C4A66A" />
    </svg>
  );
}

const pad = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dueDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : dateKey(new Date(value));
const atLocalMidnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

function getWeekStart(date: Date) {
  const start = atLocalMidnight(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'BOM DIA';
  if (hour < 18) return 'BOA TARDE';
  return 'BOA NOITE';
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || 'por aqui';
}

function sectorText(sectors: { name: string; key?: string }[]) {
  return sectors.map((sector) => `${sector.name} ${sector.key || ''}`).join(' ').toLocaleLowerCase('pt-BR');
}

const scriptures = [
  { text: 'A tua palavra é lâmpada para os meus pés e luz para o meu caminho.', reference: 'SALMOS 119:105' },
  { text: 'Tudo quanto fizerdes, fazei-o de todo o coração, como para o Senhor.', reference: 'COLOSSENSES 3:23' },
  { text: 'Entrega o teu caminho ao Senhor; confia nele, e o mais ele fará.', reference: 'SALMOS 37:5' },
  { text: 'Sede firmes, inabaláveis e sempre abundantes na obra do Senhor.', reference: '1 CORÍNTIOS 15:58' },
  { text: 'Tudo tem o seu tempo determinado, e há tempo para todo propósito.', reference: 'ECLESIASTES 3:1' },
  { text: 'A excelência do trabalho revela a dedicação de quem o realiza.', reference: 'INSPIRADO EM PROVÉRBIOS 22:29' },
  { text: 'O Senhor firma os passos de quem deseja seguir o seu caminho.', reference: 'SALMOS 37:23' },
];

function dailyScripture() {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  const day = Math.floor((atLocalMidnight(new Date()).getTime() - start) / 86400000);
  return scriptures[(day - 1) % scriptures.length];
}

function getPersonalMessage(sector: string) {
  if (/mídia|midia/.test(sector)) {
    return 'Que cada conteúdo que você produz leve a mensagem mais longe e alcance vidas.';
  }
  if (/foto|photograph|fotograf/.test(sector)) {
    return 'Que suas imagens contem histórias, despertem emoções e alcancem pessoas.';
  }
  if (/vídeo|video|audiovisual|edição|editor/.test(sector)) {
    return 'Que cada história que você edita leve uma mensagem capaz de transformar vidas.';
  }
  if (/design|comunicação|comunicacao|arte/.test(sector)) {
    return 'Que cada ideia ganhe forma e comunique com excelência aquilo que transforma vidas.';
  }
  return null;
}

export default function AppCentral() {
  const navigate = useNavigate();
  const { user, modules, logout, state } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasStudio = modules.some((module) => module.key === 'studio' || module.key.startsWith('studio_'));
  const { data: production, loading: productionLoading, error: productionError, reload: reloadProduction } = useApi<any>(hasStudio ? '/studio/production/mine' : null);

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [weekStart]);
  const calendarPath = useMemo(() => {
    const params = new URLSearchParams({ from: weekStart.toISOString(), to: weekEnd.toISOString() });
    return `/calendar?${params.toString()}`;
  }, [weekStart, weekEnd]);
  const { data: calendarData, loading: calendarLoading } = useApi<{ items: CalendarEvent[] }>(calendarPath);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  }), [weekStart]);
  const todayKey = dateKey(new Date());
  const sector = sectorText(user?.sectors ?? []);
  const personalizedMessage = getPersonalMessage(sector);
  const verse = dailyScripture();
  const unread = state?.notifications?.unread ?? 0;
  const tasks = production?.tasks ?? [];
  const pendingToday = tasks.filter((task: any) => {
    if (task.status === 'published' || task.status === 'completed') return false;
    const due = task.due_date;
    return due ? dueDateKey(due) === todayKey : false;
  });
  const events = calendarData?.items ?? [];
  const sectorLabel = user?.sectors?.[0]?.name || 'SEU AMBIENTE';
  const weekTaskItems = tasks.filter((task: any) => {
    if (!task.due_date) return false;
    const due = dueDateKey(task.due_date);
    return due >= dateKey(weekStart) && due < dateKey(weekEnd);
  });
  const completedWeekTasks = weekTaskItems.filter((task: any) => task.status === 'published' || task.status === 'completed');
  const activeWeekTasks = weekTaskItems.length - completedWeekTasks.length;
  const weekProgress = weekTaskItems.length ? Math.round((completedWeekTasks.length / weekTaskItems.length) * 100) : 0;
  const quickModules = modules.slice(0, 4);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function openCalendar(date: Date) {
    navigate(`/calendar?date=${dateKey(date)}`);
  }

  return (
    <main className="connect-dashboard relative min-h-screen overflow-hidden bg-[#090A0C] text-[#F4F2ED] selection:bg-[#C4A66A]/35">
      <div aria-hidden="true" className="connect-atmosphere pointer-events-none fixed inset-0 overflow-hidden">
        <div className="connect-grid absolute inset-0 opacity-[0.16]" style={{ backgroundImage: 'linear-gradient(rgba(196,166,106,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(196,166,106,.055) 1px, transparent 1px)', backgroundSize: '76px 76px', maskImage: 'linear-gradient(to bottom, black, transparent 86%)' }} />
        <div className="connect-glow connect-glow-one absolute -right-48 -top-56 h-[34rem] w-[34rem] rounded-full bg-[#C4A66A]/[0.09] blur-[145px]" />
        <div className="connect-glow connect-glow-two absolute -left-48 bottom-[-20rem] h-[34rem] w-[34rem] rounded-full bg-[#8C6B37]/[0.07] blur-[150px]" /><div className="connect-orbit connect-orbit-one absolute right-[12%] top-[18%] h-56 w-56 rounded-full border border-[#D8BD86]/[0.08]" /><div className="connect-orbit connect-orbit-two absolute right-[15%] top-[21%] h-40 w-40 rounded-full border border-[#D8BD86]/[0.06]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#C4A66A]/20 pb-5">
          <Link to="/" className="group flex items-center gap-3" aria-label="MMV CONNECT — início">
            <span className="connect-brand-mark grid h-11 w-11 place-items-center overflow-hidden rounded-[13px] border border-[#C4A66A]/45 bg-gradient-to-br from-[#C4A66A]/20 to-[#17130D]/70 shadow-[0_8px_30px_rgba(196,166,106,.13)]">
              <ConnectMark />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[13px] font-extrabold tracking-[0.16em] text-white">MMV<span className="text-[#C4A66A]">/</span>CONNECT</span>
              <span className="mt-1.5 text-[8px] font-semibold tracking-[0.25em] text-[#D8BD86]/55">PLATAFORMA INTEGRADA</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-white/85">{firstName(user?.full_name)}</span>
              <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.16em] text-[#C4A66A]/65">{sectorLabel}</span>
            </span>
            <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} className="grid h-11 w-11 place-items-center rounded-xl border border-[#C4A66A]/25 bg-white/[0.055] text-[#E9D8B4] shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl transition hover:border-[#C4A66A]/55 hover:bg-[#C4A66A]/10">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {menuOpen && <>
          <button aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 cursor-default" />
          <nav className="absolute right-4 top-[5.1rem] z-30 w-[min(88vw,320px)] overflow-hidden rounded-2xl border border-[#C4A66A]/30 bg-[#111316]/95 p-2 shadow-[0_24px_80px_rgba(0,0,0,.75)] backdrop-blur-2xl sm:right-7 lg:right-10" aria-label="Menu principal">
            <div className="mb-1 flex items-center justify-between px-3 pb-2 pt-2.5"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D8BD86]/65">NAVEGAÇÃO</p><span className="text-[8px] font-bold tracking-[0.16em] text-[#C4A66A]/55">MMV / CONNECT</span></div>
            {modules.map((module) => {
              const Icon = moduleIcon(module.icon);
              return <Link key={module.id} to={module.route} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/80 transition hover:bg-[#C4A66A]/10"><Icon className="h-4 w-4 text-[#D8BD86]" />{module.name}</Link>;
            })}
            <div className="my-2 border-t border-white/[0.09]" />
            <Link to="/calendar" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.06]"><CalendarDays className="h-4 w-4 text-[#D8BD86]" />Agenda</Link>
            <Link to="/notifications" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.06]"><Bell className="h-4 w-4 text-[#D8BD86]" />Notificações {unread > 0 && <span className="ml-auto rounded-full bg-[#C4A66A]/20 px-2 py-0.5 text-[10px] text-[#F0E3C4]">{unread}</span>}</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.06]"><UserRound className="h-4 w-4 text-[#D8BD86]" />Meu perfil</Link>
            <Link to="/help" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.06]"><HelpCircle className="h-4 w-4 text-[#D8BD86]" />Ajuda</Link>
            <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white"><LogOut className="h-4 w-4" />Sair</button>
          </nav>
        </>}

        <section className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-start gap-5 py-5 sm:gap-6 sm:py-6">
          <div className="connect-hero relative overflow-hidden rounded-[26px] border border-[#C4A66A]/35 bg-[linear-gradient(120deg,rgba(37,31,21,.82),rgba(19,20,22,.76)_55%,rgba(12,13,15,.84))] p-6 shadow-[0_22px_70px_rgba(0,0,0,.38),inset_0_1px_0_rgba(255,255,255,.09)] backdrop-blur-2xl sm:p-9">
            <div aria-hidden="true" className="connect-hero-orb pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-[#C4A66A]/15" />
            <div aria-hidden="true" className="connect-hero-orb connect-hero-orb-inner pointer-events-none absolute -right-4 -top-12 h-60 w-60 rounded-full border border-[#C4A66A]/10" />
            <div aria-hidden="true" className="connect-hero-visual pointer-events-none absolute right-[7%] top-1/2 hidden h-[250px] w-[250px] -translate-y-1/2 lg:block xl:right-[10%]">
              <div className="connect-hero-orb absolute inset-0 rounded-full border border-[#D8BD86]/20 bg-[radial-gradient(circle_at_38%_32%,rgba(240,227,196,.14),rgba(196,166,106,.035)_34%,transparent_68%)] shadow-[inset_0_0_55px_rgba(196,166,106,.08),0_0_75px_rgba(196,166,106,.07)]" />
              <div className="connect-hero-orb connect-hero-orb-inner absolute inset-[22px] rounded-full border border-[#D8BD86]/15" />
              <div className="absolute inset-[48px] rounded-full border border-dashed border-[#D8BD86]/20" />
              <div className="absolute inset-[72px] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,.18),rgba(196,166,106,.12)_25%,rgba(18,16,12,.2)_68%)] shadow-[0_0_45px_rgba(196,166,106,.12),inset_0_0_28px_rgba(255,255,255,.08)] backdrop-blur-xl" />
              <div className="absolute left-1/2 top-1/2 h-[2px] w-[74%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[#E5C98F]/55 to-transparent" />
              <div className="absolute left-1/2 top-1/2 h-[74%] w-[2px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-[#E5C98F]/45 to-transparent" />
              <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#F0E3C4]/70 bg-[#E5C98F] shadow-[0_0_22px_rgba(229,201,143,.8)]" />
              <span className="absolute -right-1 top-[22%] h-1.5 w-1.5 rounded-full bg-[#F0E3C4] shadow-[0_0_14px_rgba(240,227,196,.9)]" />
              <span className="absolute bottom-[17%] left-[12%] h-1 w-1 rounded-full bg-[#C4A66A] shadow-[0_0_12px_rgba(196,166,106,.9)]" />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-bold tracking-[.32em] text-[#D8BD86]/45">CONECTANDO PROPÓSITOS</span>
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute right-16 top-0 h-full w-px rotate-[24deg] bg-gradient-to-b from-transparent via-[#C4A66A]/20 to-transparent" />
            <div className="relative max-w-[820px]">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-md border border-[#C4A66A]/40 bg-[#C4A66A]/10 px-2.5 py-1 text-[9px] font-extrabold tracking-[0.19em] text-[#E5C98F]">SEU AMBIENTE</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{sectorLabel}</span>
              </div>
              <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#D8BD86]">{getGreeting()},</p>
              <h1 className="font-display mt-1 text-[clamp(3.1rem,8vw,6.5rem)] font-bold leading-[.88] tracking-[-0.045em] text-[#F4F2ED]">{firstName(user?.full_name)}<span className="text-[#C4A66A]">.</span></h1>
              <div className="mt-6 max-w-[760px] border-l-[3px] border-[#C4A66A] pl-4 sm:pl-5">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#C4A66A]/80">MENSAGEM DO DIA</p>
                <p className="mt-2 text-[clamp(1.15rem,2.3vw,1.7rem)] font-semibold leading-snug tracking-[-0.025em] text-white/90">
                  {personalizedMessage || verse.text}
                </p>
                {!personalizedMessage && <p className="mt-3 text-[10px] font-extrabold tracking-[0.2em] text-[#D8BD86]">{verse.reference}</p>}
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 right-0 hidden h-2/3 w-[28%] bg-gradient-to-l from-[#C4A66A]/[0.055] to-transparent lg:block" />
          </div>

          <div className="connect-content-grid grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.85fr)]">
            <section className="connect-glass-card overflow-hidden rounded-[23px] border border-[#C4A66A]/25 bg-[linear-gradient(145deg,rgba(34,31,25,.68),rgba(17,19,22,.78)_55%,rgba(12,13,15,.84))] shadow-[0_18px_55px_rgba(0,0,0,.32),inset_0_1px_0_rgba(255,255,255,.075)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-[#C4A66A]/15 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#C4A66A]">PLANEJAMENTO</p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">AGENDA DA SEMANA</h2>
                </div>
                <button onClick={() => navigate('/calendar')} className="inline-flex items-center gap-1.5 rounded-lg border border-[#C4A66A]/25 bg-white/[0.035] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#E6D4AE] transition hover:bg-[#C4A66A]/10">
                  Agenda completa <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 px-3 pt-4 sm:gap-2 sm:px-5">
                {weekDays.map((date) => {
                  const key = dateKey(date);
                  const dayEvents = events.filter((event) => dateKey(new Date(event.starts_at)) === key).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                  const isToday = key === todayKey;
                  return (
                    <button key={key} onClick={() => openCalendar(date)} className={`group min-w-0 rounded-xl border px-1 py-2.5 text-center transition sm:px-2 sm:py-3 ${isToday ? 'border-[#C4A66A]/70 bg-[#C4A66A]/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,.09),0_6px_20px_rgba(196,166,106,.08)]' : 'border-white/[0.07] bg-black/20 hover:border-[#C4A66A]/40 hover:bg-[#C4A66A]/[0.07]'}`}>
                      <span className={`block text-[8px] font-extrabold uppercase tracking-[0.08em] sm:text-[9px] ${isToday ? 'text-[#E5C98F]' : 'text-white/40'}`}>{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '')}</span>
                      <span className={`mt-1 block text-xl font-extrabold tabular-nums sm:text-2xl ${isToday ? 'text-[#F0D69F]' : 'text-white/90'}`}>{date.getDate()}</span>
                      <span className="mt-2 flex min-h-[17px] items-center justify-center gap-1">
                        {dayEvents.length > 0 ? <><span className="h-1.5 w-1.5 rounded-full bg-[#C4A66A]" />{dayEvents.length > 1 && <span className="text-[8px] font-bold text-[#D8BD86]">{dayEvents.length}</span>}</> : <span className="h-1 w-1 rounded-full bg-white/10" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                {calendarLoading ? (
                  <p className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-xs text-white/45">Carregando os compromissos da semana…</p>
                ) : events.length === 0 ? (
                  <p className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-xs text-white/45">Nenhuma atividade cadastrada nesta semana.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {weekDays.filter((date) => events.some((event) => dateKey(new Date(event.starts_at)) === dateKey(date))).slice(0, 2).map((date) => {
                      const dayEvents = events.filter((event) => dateKey(new Date(event.starts_at)) === dateKey(date)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                      return (
                        <button key={dateKey(date)} onClick={() => openCalendar(date)} className="flex min-w-0 items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-3 text-left transition hover:border-[#C4A66A]/35 hover:bg-[#C4A66A]/[0.06]">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#C4A66A]/25 bg-[#C4A66A]/10 text-[#E5C98F]"><CalendarDays className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[9px] font-extrabold uppercase tracking-[0.13em] text-[#D8BD86]">{new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date)}</span>
                            <span className="mt-1 block truncate text-[11px] font-semibold text-white/85">{dayEvents.slice(0, 2).map((event) => `${event.all_day ? '' : `${formatTime(event.starts_at)} · `}${event.title}`).join('  •  ')}{dayEvents.length > 2 ? '…' : ''}</span>
                          </span>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/30" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="connect-glass-card connect-feature-card relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[23px] border border-[#C4A66A]/35 bg-[linear-gradient(145deg,rgba(55,43,25,.65),rgba(25,22,18,.78)_48%,rgba(14,15,16,.86))] p-5 shadow-[0_18px_55px_rgba(0,0,0,.34),inset_0_1px_0_rgba(255,255,255,.10)] backdrop-blur-2xl sm:p-6">
              <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full border border-[#D8BD86]/15" />
              <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-5 h-32 w-32 rounded-full border border-[#D8BD86]/10" />
              <div className="relative">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#D8BD86]">RESUMO DE HOJE</p>
                <h2 className="mt-2 text-lg font-extrabold leading-tight text-white">SUAS ENTREGAS</h2>
              </div>
              {hasStudio ? (
                productionLoading ? <p className="relative mt-7 text-xs text-white/55">Atualizando suas atividades…</p> :
                productionError ? <div className="relative mt-6"><p className="text-xs text-white/60">Não foi possível atualizar suas entregas.</p><button onClick={reloadProduction} className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#E5C98F]"><RefreshCw className="h-3 w-3" /> Tentar novamente</button></div> :
                <div className="relative mt-5 flex items-end gap-3">
                  <span className="font-display text-[5.5rem] font-bold leading-[.8] tracking-[-.06em] text-[#E5C98F] drop-shadow-[0_4px_18px_rgba(196,166,106,.16)]">{pendingToday.length}</span>
                  <p className="max-w-[170px] pb-1 text-[12px] font-semibold leading-snug text-white/75">atividades pendentes para entregar hoje.</p>
                </div>
              ) : (
                <p className="relative mt-7 text-sm font-semibold leading-relaxed text-white/70">Suas entregas aparecerão aqui conforme forem atribuídas a você.</p>
              )}
            </section>
          </div>
          <div className="connect-content-grid grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
            <section className="connect-glass-card rounded-[23px] border border-[#C4A66A]/25 bg-[linear-gradient(145deg,rgba(34,31,25,.64),rgba(15,17,19,.82))] p-5 shadow-[0_16px_45px_rgba(0,0,0,.28)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#C4A66A]">ACOMPANHAMENTO</p>
                  <h2 className="mt-1 text-xl font-extrabold text-white">SEU RITMO NA SEMANA</h2>
                  <p className="mt-1 text-xs text-white/45">Atividades com prazo nesta semana.</p>
                </div>
                <span className="rounded-lg border border-[#C4A66A]/25 bg-[#C4A66A]/10 px-3 py-1.5 text-xs font-bold text-[#E5C98F]">{weekProgress}%</span>
              </div>
              {productionLoading ? (
                <p className="mt-6 text-xs text-white/50">Carregando seu progresso…</p>
              ) : productionError ? (
                <p className="mt-6 text-xs text-white/50">Não foi possível carregar seu progresso.</p>
              ) : (
                <>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#9B7A43] to-[#E5C98F] transition-all" style={{ width: `${weekProgress}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div><p className="text-2xl font-extrabold tabular-nums text-white">{weekTaskItems.length}</p><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">No total</p></div>
                    <div><p className="text-2xl font-extrabold tabular-nums text-[#E5C98F]">{completedWeekTasks.length}</p><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Concluídas</p></div>
                    <div><p className="text-2xl font-extrabold tabular-nums text-white/80">{activeWeekTasks}</p><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Em andamento</p></div>
                  </div>
                  {weekTaskItems.length === 0 && <p className="mt-4 text-[11px] text-white/45">Quando receber atividades com prazo nesta semana, seu progresso aparecerá aqui.</p>}
                </>
              )}
            </section>

            <section className="connect-glass-card rounded-[23px] border border-[#C4A66A]/25 bg-[linear-gradient(145deg,rgba(28,27,23,.66),rgba(14,16,18,.84))] p-5 shadow-[0_16px_45px_rgba(0,0,0,.28)] sm:p-6">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#C4A66A]">SEU ESPAÇO</p>
              <h2 className="mt-1 text-xl font-extrabold text-white">ACESSOS RÁPIDOS</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {quickModules.map((module) => {
                  const Icon = moduleIcon(module.icon);
                  return <Link key={module.id} to={module.route} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-xs font-semibold text-white/80 transition hover:border-[#C4A66A]/40 hover:bg-[#C4A66A]/[0.08]"><Icon className="h-4 w-4 shrink-0 text-[#D8BD86]" /><span className="truncate">{module.name}</span><ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/30" /></Link>;
                })}
                <Link to="/calendar" className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-xs font-semibold text-white/80 transition hover:border-[#C4A66A]/40 hover:bg-[#C4A66A]/[0.08]"><CalendarDays className="h-4 w-4 text-[#D8BD86]" /><span>Agenda</span><ChevronRight className="ml-auto h-3.5 w-3.5 text-white/30" /></Link>
              </div>
            </section>
          </div>

          <section className="connect-glass-card connect-assistant-card relative overflow-hidden rounded-[23px] border border-[#C4A66A]/30 bg-[linear-gradient(110deg,rgba(45,36,23,.68),rgba(17,19,21,.84)_62%)] p-5 shadow-[0_16px_45px_rgba(0,0,0,.26)] sm:p-6">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-[#D8BD86]/10" />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#D8BD86]">INTELIGÊNCIA CONNECT</p>
                <h2 className="mt-1 text-xl font-extrabold text-white">SEU ASSISTENTE PESSOAL</h2>
                <p className="mt-2 text-xs leading-relaxed text-white/55">Um espaço para ajudar você a organizar prioridades, compreender suas atividades e encontrar informações dentro do CONNECT.</p>
              </div>
              <span className="w-fit shrink-0 rounded-lg border border-[#C4A66A]/30 bg-[#C4A66A]/10 px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#E5C98F]">EM PREPARAÇÃO</span>
            </div>
          </section>
        </section>

        <footer className="flex items-center justify-between gap-3 border-t border-[#C4A66A]/15 pt-4 text-[9px] font-semibold tracking-[0.15em] text-white/30">
          <span>MMV<span className="text-[#C4A66A]">/</span>CONNECT</span>
          <span className="truncate uppercase">{user?.full_name}</span>
        </footer>
      </div>
    </main>
  );
}
