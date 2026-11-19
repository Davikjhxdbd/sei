import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Bell, CalendarDays, Camera, CheckCircle2, Clapperboard,
  Film, HelpCircle, LogOut, Menu, UserRound, X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { moduleIcon } from '../modules/registry';
import { ThemeToggle } from '../components/ThemeToggle';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || 'por aqui';
}

function sectorText(sectors: { name: string; key?: string }[]) {
  return sectors.map((sector) => `${sector.name} ${sector.key || ''}`).join(' ').toLocaleLowerCase('pt-BR');
}

export default function AppCentral() {
  const navigate = useNavigate();
  const { user, modules, logout, state } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasStudio = modules.some((module) => module.key === 'studio' || module.key.startsWith('studio_'));
  const { data: production } = useApi<any>(hasStudio ? '/studio/production/mine' : null);
  const greeting = useMemo(getGreeting, []);
  const unread = state?.notifications.unread ?? 0;
  const tasks = production?.tasks ?? [];
  const pending = tasks.filter((task: any) => task.status !== 'published');
  const completed = tasks.filter((task: any) => task.status === 'published');
  const sector = sectorText(user?.sectors ?? []);
  const isPhoto = /foto|photograph|fotograf/.test(sector);
  const isVideo = /vídeo|video|audiovisual|edição|editor/.test(sector);
  const sectorLabel = user?.sectors?.[0]?.name || 'Seu espaço';

  const shortcuts = useMemo(() => {
    if (hasStudio && (isPhoto || isVideo)) {
      const items = [];
      if (isPhoto) items.push({ label: 'Acervo de mídia', description: 'Fotos e materiais', to: '/m/studio/media', icon: Camera });
      if (isVideo) items.push({ label: 'Minha produção', description: 'Projetos e entregas', to: '/m/studio/my-space', icon: Clapperboard });
      items.push({ label: 'Eventos', description: 'Coberturas e agenda', to: '/m/studio/events', icon: CalendarDays });
      if (isVideo) items.push({ label: 'Central de produção', description: 'Acompanhar produções', to: '/m/studio/production', icon: Film });
      return items.slice(0, 3);
    }
    const normalized = (user?.sectors ?? []).map((item) => `${item.name} ${item.key || ''}`.toLocaleLowerCase('pt-BR'));
    const relevant = modules.filter((module) => normalized.some((value) =>
      value.includes(module.key.toLocaleLowerCase('pt-BR')) ||
      value.includes(module.name.toLocaleLowerCase('pt-BR')) ||
      module.name.toLocaleLowerCase('pt-BR').includes(value.trim()),
    ));
    return (relevant.length ? relevant : modules).slice(0, 3).map((module) => ({
      label: module.name,
      description: module.description || 'Acessar aplicativo',
      to: module.route,
      icon: moduleIcon(module.icon),
    }));
  }, [hasStudio, isPhoto, isVideo, modules, user?.sectors]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0D10] text-[#F4F5F6]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-56 -top-64 h-[34rem] w-[34rem] rounded-full bg-[#8D9EFF]/[0.055] blur-[150px]" />
        <div className="absolute -left-48 bottom-[-18rem] h-[30rem] w-[30rem] rounded-full bg-[#A4B4C5]/[0.035] blur-[150px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="group flex items-center gap-3" aria-label="MMV CONNECT — início">
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] border border-[#8D9EFF]/30 bg-[#8D9EFF]/[0.09] shadow-[0_0_28px_rgba(141,158,255,0.12)]">
              <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none" aria-hidden="true">
                <path d="M7 29V11L20 23L33 11V29" stroke="#C6CEFF" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="round" />
                <path d="M20 23V8" stroke="#8D9EFF" strokeWidth="2.2" strokeLinecap="square" />
                <circle cx="20" cy="7" r="2" fill="#F4F5F6" />
              </svg>
              <span className="absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-[#8D9EFF] to-transparent" />
            </span>
            <span className="flex flex-col leading-none"><span className="text-[12px] font-semibold tracking-[0.19em] text-white">MMV<span className="text-[#8D9EFF]">/</span>CONNECT</span><span className="mt-1.5 text-[8px] font-medium tracking-[0.24em] text-white/35">PLATAFORMA INTEGRADA</span></span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.11] bg-white/[0.045] text-white/75 transition duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              {menuOpen ? <X className="h-[18px] w-[18px]" strokeWidth={1.7} /> : <Menu className="h-[18px] w-[18px]" strokeWidth={1.7} />}
            </button>
          </div>
        </header>

        {menuOpen && (
          <>
            <button aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 cursor-default" />
            <nav className="absolute right-5 top-[4.6rem] z-30 w-[min(88vw,310px)] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#15191F]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:right-10" aria-label="Menu principal">
              <p className="px-3 pb-2 pt-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A4B4C5]/55">Aplicativos</p>
              {modules.map((module) => {
                const Icon = moduleIcon(module.icon);
                return <Link key={module.id} to={module.route} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-white/80 transition hover:bg-white/[0.06]">
                  <Icon className="h-4 w-4 text-[#A4B4C5]" strokeWidth={1.7} />{module.name}
                </Link>;
              })}
              <div className="my-2 border-t border-white/[0.08]" />
              <Link to="/calendar" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.06]"><CalendarDays className="h-4 w-4" />Agenda</Link>
              <Link to="/notifications" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.06]"><Bell className="h-4 w-4" />Notificações {unread > 0 && <span className="ml-auto rounded-full bg-[#8D9EFF]/15 px-2 py-0.5 text-[10px] text-[#C6CEFF]">{unread}</span>}</Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.06]"><UserRound className="h-4 w-4" />Meu perfil</Link>
              <Link to="/help" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.06]"><HelpCircle className="h-4 w-4" />Ajuda</Link>
              <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-white/45 transition hover:bg-white/[0.06] hover:text-white"><LogOut className="h-4 w-4" />Sair</button>
            </nav>
          </>
        )}

        <section className="mx-auto my-auto w-full max-w-5xl py-14 sm:py-20">
          <div className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-20 hidden h-[390px] w-[390px] items-center justify-center opacity-70 lg:flex">
              <div className="absolute h-[340px] w-[340px] rounded-full border border-[#8D9EFF]/[0.10]" />
              <div className="absolute h-[270px] w-[270px] rounded-full border border-[#A4B4C5]/[0.10]" />
              <div className="absolute h-[190px] w-[190px] rounded-full border border-[#8D9EFF]/[0.16]" />
              <div className="absolute h-[110px] w-[110px] rounded-full border border-[#8D9EFF]/[0.24] bg-[#8D9EFF]/[0.035] shadow-[0_0_90px_rgba(141,158,255,0.10)]" />
              <svg viewBox="0 0 160 160" className="relative h-28 w-28" fill="none"><path d="M28 112V48L80 96L132 48V112" stroke="#A4B4C5" strokeOpacity=".42" strokeWidth="3"/><path d="M80 96V26" stroke="#8D9EFF" strokeOpacity=".65" strokeWidth="3"/><circle cx="80" cy="22" r="4" fill="#C6CEFF"/></svg>
              <span className="absolute right-4 top-24 h-1.5 w-1.5 rounded-full bg-[#8D9EFF] shadow-[0_0_12px_#8D9EFF]" />
              <span className="absolute bottom-16 left-8 h-1 w-1 rounded-full bg-[#A4B4C5]" />
            </div>
          <div className="mb-5 flex items-center gap-2">
            <span className="h-px w-7 bg-[#8D9EFF]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#A4B4C5]/70">MMV CONNECT <span className="px-1.5 text-[#8D9EFF]/70">/</span> {sectorLabel}</span>
          </div>

          <div className="max-w-3xl">
            <p className="text-[15px] font-medium tracking-wide text-[#A4B4C5]/75">{greeting},</p>
            <h1 className="font-display mt-2 text-[clamp(3.4rem,8vw,6.4rem)] font-medium leading-[0.86] tracking-[-0.055em] text-[#F4F5F6]">{firstName(user?.full_name)}<span className="text-[#8D9EFF]">.</span></h1>
            <p className="mt-5 max-w-xl text-[13px] leading-6 text-white/50 sm:text-sm">Seu dia, suas prioridades. Tudo pronto para você continuar.</p>
            <div className="mt-7 flex items-center gap-3"><span className="h-px w-10 bg-[#8D9EFF]/55" /><span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/30">Um só lugar. Tudo conectado.</span></div>
          </div>
          </div>

          <div className="relative mt-10 max-w-3xl overflow-hidden rounded-[24px] border border-[#A4B4C5]/[0.13] bg-[linear-gradient(135deg,rgba(30,36,48,0.82),rgba(15,18,24,0.92)_58%,rgba(18,21,29,0.88))] shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#8D9EFF]/65 to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full border border-[#8D9EFF]/[0.08] shadow-[0_0_70px_rgba(141,158,255,0.06)]" />
            <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-7">
              <div>
                <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#8D9EFF] shadow-[0_0_10px_rgba(141,158,255,0.9)]" /><p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#A4B4C5]/75">Visão geral</p></div>
                <p className="mt-2 text-[13px] text-white/80">
                  {hasStudio ? <>Você tem <strong className="font-semibold text-white">{pending.length} {pending.length === 1 ? 'tarefa' : 'tarefas'}</strong> pendentes para acompanhar.</> : 'Seu espaço de trabalho está pronto para hoje.'}
                </p>
              </div>
              {hasStudio && <div className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-black/10 px-3 py-2 text-[10px] text-white/55">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#A4B4C5]" strokeWidth={1.8} />
                {completed.length} {completed.length === 1 ? 'entrega concluída' : 'entregas concluídas'}
              </div>}
            </div>

            {shortcuts.length > 0 && <>
              <div className="relative border-t border-white/[0.08] px-5 pt-4 sm:px-7">
                <div className="flex items-center justify-between"><p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#A4B4C5]/65">Seus espaços</p><span className="text-[8px] font-medium tracking-[0.16em] text-white/25">ACESSO RÁPIDO</span></div>
              </div>
              <div className="relative grid gap-2 p-3 sm:grid-cols-3 sm:px-4 sm:pb-4">
                {shortcuts.map((item) => {
                  const Icon = item.icon;
                  return <Link key={item.to} to={item.to} className="group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-[#8D9EFF]/25 hover:bg-[#8D9EFF]/[0.055] hover:shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-[#A4B4C5]/[0.12] bg-gradient-to-br from-[#8D9EFF]/[0.13] to-white/[0.025] text-[#B8C3FF] shadow-inner shadow-white/[0.035] transition duration-300 group-hover:border-[#8D9EFF]/35 group-hover:text-[#E0E4FF]"><Icon className="h-[17px] w-[17px]" strokeWidth={1.7} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-white/85">{item.label}</span><span className="mt-1 block truncate text-[10px] text-white/35">{item.description}</span></span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/25 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#C6CEFF]" />
                  </Link>;
                })}
              </div>
            </>}
          </div>
        </section>

        <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-[9px] tracking-[0.12em] text-white/25">
          <span>MMV CONNECT</span>
          <span className="truncate">{user?.full_name}</span>
        </footer>
      </div>
    </main>
  );
}
