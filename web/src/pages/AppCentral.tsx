import '../connect-hybrid.css';
import { PWAControls } from '../components/PWAControls';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Bell, CalendarDays, ChevronRight,
  ArrowRight, Command, HelpCircle, LogOut, Menu, ClipboardList,
  Search, UserRound, X,
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

function LocalClock() {
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <strong>
      {clock.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </strong>
  );
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const [selectedAgendaDay, setSelectedAgendaDay] = useState(() => dateKey(new Date()));
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
        setCommandQuery('');
        setCommandIndex(0);
      }
      if (event.key === 'Escape') { setCommandOpen(false); setMenuOpen(false); }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

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
  useEffect(() => {
    if (!weekDays.some((date) => dateKey(date) === selectedAgendaDay)) {
      setSelectedAgendaDay(dateKey(new Date()));
    }
  }, [weekDays, selectedAgendaDay]);

  const todayKey = dateKey(new Date());
  const sector = sectorText(user?.sectors ?? []);
  const personalizedMessage = getPersonalMessage(sector);
  const verse = dailyScripture();
  const unread = state?.notifications?.unread ?? 0;
  const events = calendarData?.items ?? [];
  const sectorLabel = user?.sectors?.[0]?.name || 'SEU AMBIENTE';
  const quickModules = modules.slice(0, 4);
  const commandItems = useMemo(() => [
    ...modules.map((module) => ({ id: module.id, name: module.name, route: module.route, icon: moduleIcon(module.icon), group: 'MÓDULOS' })),
    { id: 'personal', name: 'Meu espaço', route: '/pessoal', icon: UserRound, group: 'PESSOAL' },
    { id: 'calendar', name: 'Agenda', route: '/calendar', icon: CalendarDays, group: 'ESPAÇOS' },
    { id: 'notifications', name: 'Notificações', route: '/notifications', icon: Bell, group: 'ESPAÇOS' },
    { id: 'profile', name: 'Meu perfil', route: '/profile', icon: UserRound, group: 'ESPAÇOS' },
    { id: 'help', name: 'Ajuda', route: '/help', icon: HelpCircle, group: 'ESPAÇOS' },
  ].filter((item) => item.name.toLocaleLowerCase('pt-BR').includes(commandQuery.trim().toLocaleLowerCase('pt-BR'))), [modules, commandQuery]);
  useEffect(() => {
    if (!commandOpen) return;
    function handleCommandKeys(event: KeyboardEvent) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setCommandIndex((index) => commandItems.length ? (index + 1) % commandItems.length : 0);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setCommandIndex((index) => commandItems.length ? (index - 1 + commandItems.length) % commandItems.length : 0);
      }
      if (event.key === 'Enter' && commandItems.length) {
        event.preventDefault();
        navigate(commandItems[Math.min(commandIndex, commandItems.length - 1)].route);
        setCommandOpen(false);
      }
    }
    window.addEventListener('keydown', handleCommandKeys);
    return () => window.removeEventListener('keydown', handleCommandKeys);
  }, [commandOpen, commandItems, commandIndex, navigate]);

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
          <Link to="/" className="group flex items-center gap-3" aria-label="MMV CREATIVE — início">
            <span className="connect-brand-mark grid h-11 w-11 place-items-center overflow-hidden rounded-[13px] border border-[#C4A66A]/45 bg-gradient-to-br from-[#C4A66A]/20 to-[#17130D]/70 shadow-[0_8px_30px_rgba(196,166,106,.13)]">
              <ConnectMark />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[13px] font-extrabold tracking-[0.16em] text-white">MMV<span className="text-[#C4A66A]"> </span>CREATIVE</span>
              <span className="mt-1.5 text-[8px] font-semibold tracking-[0.25em] text-[#D8BD86]/55">PLATAFORMA INTEGRADA</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <PWAControls />
            <button type="button" onClick={() => { setCommandOpen(true); setCommandQuery(''); setCommandIndex(0); }} className="connect-header-command" aria-label="Abrir central de comandos"><Command size={16}/><span>COMANDOS</span><kbd>⌘ K</kbd></button>
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
            <div className="mb-1 flex items-center justify-between px-3 pb-2 pt-2.5"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D8BD86]/65">NAVEGAÇÃO</p><span className="text-[8px] font-bold tracking-[0.16em] text-[#C4A66A]/55">MMV CREATIVE</span></div>
            {modules.map((module) => {
              const Icon = moduleIcon(module.icon);
              return <Link key={module.id} to={module.route} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/80 transition hover:bg-[#C4A66A]/10"><Icon className="h-4 w-4 text-[#D8BD86]" />{module.name}</Link>;
            })}
            <div className="my-2 border-t border-white/[0.09]" />
            <Link to="/calendar" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.06]"><CalendarDays className="h-4 w-4 text-[#D8BD86]" />Agenda</Link>
            <Link to="/escalas" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.06]"><ClipboardList className="h-4 w-4 text-[#D8BD86]" />Escalas</Link>
            <Link to="/notifications" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.06]"><Bell className="h-4 w-4 text-[#D8BD86]" />Notificações {unread > 0 && <span className="ml-auto rounded-full bg-[#C4A66A]/20 px-2 py-0.5 text-[10px] text-[#F0E3C4]">{unread}</span>}</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.06]"><UserRound className="h-4 w-4 text-[#D8BD86]" />Meu perfil</Link>
            <Link to="/help" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.06]"><HelpCircle className="h-4 w-4 text-[#D8BD86]" />Ajuda</Link>
            <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white"><LogOut className="h-4 w-4" />Sair</button>
          </nav>
        </>}
        {commandOpen && <div className="connect-command-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}>
          <section className="connect-command-modal" role="dialog" aria-modal="true" aria-label="Central de comandos">
            <div className="connect-command-modal__search"><Search size={18}/><input autoFocus value={commandQuery} onChange={(event) => { setCommandQuery(event.target.value); setCommandIndex(0); }} placeholder="Buscar módulos, espaços e ferramentas..." /><kbd>ESC</kbd></div>
            <div className="connect-command-modal__meta"><span>ACESSO RÁPIDO</span><span>{commandItems.length} RESULTADOS</span></div>
            <div className="connect-command-results">
              {commandItems.length ? commandItems.map((item) => {
                const Icon = item.icon;
                return <Link key={item.id} to={item.route} onClick={() => setCommandOpen(false)} className={`connect-command-result ${commandItems[commandIndex]?.id === item.id ? "is-active" : ""}`}><span className="connect-command-result__icon"><Icon size={16}/></span><span>{item.name}<small>{item.group}</small></span><ArrowRight size={15}/></Link>;
              }) : <p className="connect-command-empty">Nenhum resultado. Tente outro termo.</p>}
            </div>
            <div className="connect-command-modal__footer"><span>MMV / CREATIVE</span><span>ESC FECHAR · ↑ ↓ NAVEGAR · ENTER ABRIR</span></div>
          </section>
        </div>}

        <section className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-start gap-5 py-5 sm:gap-6 sm:py-6">
          <section className="connect-command-hero" aria-labelledby="connect-greeting">
            <div className="connect-command-hero__topline">
              <span className="connect-eyebrow"><span className="connect-live-dot" /> MMV CREATIVE <span className="connect-topline-divider">/</span> CENTRAL DE OPERAÇÕES</span>
              <span className="connect-session-code">SESSION {dateKey(new Date()).replace(/-/g, '').slice(2)} · LOCAL</span>
            </div>
            <div className="connect-command-hero__body">
              <div className="connect-command-hero__copy">
                <p className="connect-date-line">{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</p>
                <p className="connect-greeting-line">{getGreeting()},</p>
                <h1 id="connect-greeting" className="connect-main-greeting">{firstName(user?.full_name)}<span>.</span></h1>
                <p className="connect-hero-message">{personalizedMessage || verse.text}</p>
                {!personalizedMessage && <span className="connect-verse-reference">{verse.reference}</span>}
                <button type="button" className="connect-command-trigger" onClick={() => { setCommandOpen(true); setCommandQuery(''); }}>
                  <span className="connect-command-trigger__icon"><Search size={15}/></span>
                  <span>O que você procura?</span>
                  <kbd>⌘ K</kbd>
                  <ArrowRight className="connect-command-trigger__arrow" size={15}/>
                </button>
              </div>
              <div className="connect-core-panel" aria-label="Núcleo visual do MMV CREATIVE">
                <div className="connect-core-panel__coordinates">CORE / 001<br/>MMV SYSTEM</div>
                <div className="connect-core">
                  <div className="connect-core__orbit connect-core__orbit--one"/>
                  <div className="connect-core__orbit connect-core__orbit--two"/>
                  <div className="connect-core__orbit connect-core__orbit--three"/>
                  <div className="connect-core__axis connect-core__axis--x"/>
                  <div className="connect-core__axis connect-core__axis--y"/>
                  <div className="connect-core__center"><span>M</span></div>
                  <i className="connect-core__node connect-core__node--one"/>
                  <i className="connect-core__node connect-core__node--two"/>
                  <i className="connect-core__node connect-core__node--three"/>
                </div>
                <div className="connect-core-panel__footer"><span>PROPÓSITO EM CONEXÃO</span><span>01 — 04</span></div>
              </div>
            </div>
            <div className="connect-telemetry">
              <div className="connect-telemetry__clock"><span className="connect-telemetry__label">HORÁRIO LOCAL</span><LocalClock /></div>
              <div><span className="connect-telemetry__label">AGENDA DA SEMANA</span><strong>{calendarLoading ? '—' : String(events.length).padStart(2,'0')} <small>compromissos</small></strong></div>
              <div><span className="connect-telemetry__label">NOTIFICAÇÕES</span><strong>{String(unread).padStart(2,'0')} <small>não lidas</small></strong></div>
              <div><span className="connect-telemetry__label">AMBIENTE</span><strong>{sectorLabel}</strong></div>
            </div>
          </section>
          <div className="connect-content-grid grid gap-5 lg:grid-cols-1">
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
              <div className="connect-agenda-rail">
                {weekDays.map((date) => {
                  const key = dateKey(date);
                  const dayEvents = events.filter((event) => dateKey(new Date(event.starts_at)) === key);
                  const isToday = key === todayKey;
                  const isSelected = key === selectedAgendaDay;
                  return (
                    <button key={key} onClick={() => setSelectedAgendaDay(key)} aria-pressed={isSelected} className={`connect-agenda-day ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}>
                      <span className="connect-agenda-day__weekday">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '')}</span>
                      <strong>{date.getDate()}</strong>
                      <span className="connect-agenda-day__activity">{dayEvents.length > 0 ? <i /> : <i className="is-empty" />}{dayEvents.length > 1 && <small>{dayEvents.length}</small>}</span>
                      {isToday && <span className="connect-agenda-day__today">HOJE</span>}
                    </button>
                  );
                })}
              </div>
              <div className="connect-agenda-details">
                <div className="connect-agenda-details__heading">
                  <div>
                    <p className="connect-agenda-details__eyebrow">VISÃO DO DIA</p>
                    <h3>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(weekDays.find((date) => dateKey(date) === selectedAgendaDay) || new Date())}</h3>
                  </div>
                  <button onClick={() => openCalendar(weekDays.find((date) => dateKey(date) === selectedAgendaDay) || new Date())}>ABRIR DIA <ArrowUpRight size={13}/></button>
                </div>
                {calendarLoading ? (
                  <div className="connect-agenda-empty"><span className="connect-agenda-skeleton"/><span className="connect-agenda-skeleton short"/></div>
                ) : events.filter((event) => dateKey(new Date(event.starts_at)) === selectedAgendaDay).length === 0 ? (
                  <div className="connect-agenda-empty"><CalendarDays size={18}/><span>Nenhum compromisso neste dia.</span><button onClick={() => openCalendar(weekDays.find((date) => dateKey(date) === selectedAgendaDay) || new Date())}>Adicionar à agenda <ArrowRight size={12}/></button></div>
                ) : (
                  <div className="connect-agenda-event-list">
                    {events.filter((event) => dateKey(new Date(event.starts_at)) === selectedAgendaDay).sort((a,b) => a.starts_at.localeCompare(b.starts_at)).map((event) => (
                      <button key={event.id} onClick={() => openCalendar(weekDays.find((date) => dateKey(date) === selectedAgendaDay) || new Date())} className="connect-agenda-event">
                        <span className="connect-agenda-event__time">{event.all_day ? 'DIA TODO' : formatTime(event.starts_at)}</span>
                        <span className="connect-agenda-event__marker"/>
                        <span className="connect-agenda-event__title">{event.title}</span>
                        <ChevronRight size={14}/>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="connect-content-grid grid gap-5 lg:grid-cols-1">
            <section className="connect-glass-card rounded-[23px] border border-[#C4A66A]/25 bg-[linear-gradient(145deg,rgba(28,27,23,.66),rgba(14,16,18,.84))] p-5 shadow-[0_16px_45px_rgba(0,0,0,.28)] sm:p-6">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#C4A66A]">SEU ESPAÇO</p>
              <h2 className="mt-1 text-xl font-extrabold text-white">ACESSOS RÁPIDOS</h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {quickModules.map((module) => {
                  const Icon = moduleIcon(module.icon);
                  return <Link key={module.id} to={module.route} className="connect-shortcut"><span className="connect-shortcut__icon"><Icon className="h-4 w-4" /></span><span className="connect-shortcut__name">{module.name}</span><span className="connect-shortcut__index">{String(quickModules.indexOf(module) + 1).padStart(2, "0")}</span><ArrowUpRight className="connect-shortcut__arrow" size={14}/></Link>;
                })}
                <Link to="/calendar" className="connect-shortcut"><span className="connect-shortcut__icon"><CalendarDays className="h-4 w-4"/></span><span className="connect-shortcut__name">Agenda</span><span className="connect-shortcut__index">05</span><ArrowUpRight className="connect-shortcut__arrow" size={14}/></Link>
                <Link to="/escalas" className="connect-shortcut"><span className="connect-shortcut__icon"><ClipboardList className="h-4 w-4"/></span><span className="connect-shortcut__name">Escalas</span><span className="connect-shortcut__index">06</span><ArrowUpRight className="connect-shortcut__arrow" size={14}/></Link>
                <Link to="/pessoal" className="connect-shortcut"><span className="connect-shortcut__icon"><UserRound className="h-4 w-4"/></span><span className="connect-shortcut__name">Meu espaço</span><span className="connect-shortcut__index">07</span><ArrowUpRight className="connect-shortcut__arrow" size={14}/></Link>
              </div>
            </section>
          </div>

          <section className="connect-glass-card connect-assistant-card relative overflow-hidden rounded-[23px] border border-[#C4A66A]/30 bg-[linear-gradient(110deg,rgba(45,36,23,.68),rgba(17,19,21,.84)_62%)] p-5 shadow-[0_16px_45px_rgba(0,0,0,.26)] sm:p-6">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-[#D8BD86]/10" />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#D8BD86]">INTELIGÊNCIA MMV</p>
                <h2 className="mt-1 text-xl font-extrabold text-white">SEU ASSISTENTE PESSOAL</h2>
                <p className="mt-2 text-xs leading-relaxed text-white/55">Um espaço para ajudar você a organizar prioridades, compreender suas atividades e encontrar informações dentro do MMV CREATIVE.</p>
              </div>
              <span className="w-fit shrink-0 rounded-lg border border-[#C4A66A]/30 bg-[#C4A66A]/10 px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#E5C98F]">EM PREPARAÇÃO</span>
            </div>
          </section>
        </section>

        <footer className="flex items-center justify-between gap-3 border-t border-[#C4A66A]/15 pt-4 text-[9px] font-semibold tracking-[0.15em] text-white/30">
          <span>MMV<span className="text-[#C4A66A]">/</span>CREATIVE</span>
          <span className="truncate uppercase">{user?.full_name}</span>
        </footer>
      </div>
    </main>
  );
}
