import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, CalendarDays, Camera, CheckCircle2, Clapperboard, Film,
  HelpCircle, LayoutGrid, LogOut, Menu, UserRound, X,
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

  const shortcuts = useMemo(() => {
    if (hasStudio && (isPhoto || isVideo)) {
      const items = [];
      if (isPhoto) items.push({ label: 'Acervo de mídia', description: 'Fotos e materiais', to: '/m/studio/media', icon: Camera });
      if (isVideo) items.push({ label: 'Produção', description: 'Projetos e entregas', to: '/m/studio/production/my-space', icon: Clapperboard });
      if (isPhoto || isVideo) items.push({ label: 'Eventos', description: 'Coberturas e agenda', to: '/m/studio/events', icon: CalendarDays });
      if (isVideo) items.push({ label: 'Central de produção', description: 'Acompanhar produções', to: '/m/studio/production', icon: Film });
      return items.slice(0, 3);
    }
    const normalized = (user?.sectors ?? []).map((item) => `${item.name} ${item.key || ''}`.toLocaleLowerCase('pt-BR'));
    const relevant = modules.filter((module) => normalized.some((value) =>
      value.includes(module.key.toLocaleLowerCase('pt-BR')) ||
      value.includes(module.name.toLocaleLowerCase('pt-BR')) ||
      module.name.toLocaleLowerCase('pt-BR').includes(value.trim()),
    ));
    const chosen = relevant.length ? relevant : modules.slice(0, 3);
    return chosen.slice(0, 3).map((module) => ({
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
        <div className="absolute -right-40 -top-48 h-96 w-96 rounded-full bg-[#8D9EFF]/[0.08] blur-[120px]" />
        <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-[#A4B4C5]/[0.04] blur-[110px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="MMV CONNECT — início">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
              <LayoutGrid className="h-4 w-4 text-[#A4B4C5]" />
            </span>
            <span className="text-xs font-semibold tracking-[0.18em]">MMV <span className="text-[#A4B4C5]">CONNECT</span></span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/80 transition hover:bg-white/[0.1]"
            >
              {menuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {menuOpen && (
          <nav className="absolute right-5 top-[4.5rem] z-30 w-[min(88vw,300px)] overflow-hidden rounded-2xl border border-white/10 bg-[#171B21] p-2 shadow-2xl shadow-black/40 sm:right-8" aria-label="Menu principal">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A4B4C5]/55">Seu espaço</p>
            {modules.map((module) => {
              const Icon = moduleIcon(module.icon);
              return <Link key={module.id} to={module.route} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/[0.06]">
                <Icon className="h-4 w-4 text-[#A4B4C5]" />{module.name}
              </Link>;
            })}
            <div className="my-2 border-t border-white/10" />
            <Link to="/calendar" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/[0.06]"><CalendarDays className="h-4 w-4" />Agenda</Link>
            <Link to="/notifications" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/[0.06]"><Bell className="h-4 w-4" />Notificações {unread > 0 && <span className="ml-auto rounded-full bg-[#8D9EFF]/20 px-2 py-0.5 text-[10px] text-[#C6CEFF]">{unread}</span>}</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/[0.06]"><UserRound className="h-4 w-4" />Meu perfil</Link>
            <Link to="/help" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/[0.06]"><HelpCircle className="h-4 w-4" />Ajuda</Link>
            <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/55 transition hover:bg-white/[0.06] hover:text-white"><LogOut className="h-4 w-4" />Sair</button>
          </nav>
        )}

        <section className="mx-auto mt-16 w-full max-w-3xl sm:mt-24">
          <p className="text-sm font-medium text-[#A4B4C5]/65">{greeting},</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">{firstName(user?.full_name)}.</h1>
          <p className="mt-2 text-sm text-[#A4B4C5]/55">Seu espaço de trabalho está pronto.</p>

          <div className="mt-9 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-[11px] text-white/45">Tarefas pendentes</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{hasStudio ? pending.length : '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-[11px] text-white/45">Entregas concluídas</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold tabular-nums text-white">{hasStudio ? completed.length : '—'}{hasStudio && <CheckCircle2 className="h-4 w-4 text-[#A4B4C5]/65" />}</p>
            </div>
          </div>

          {shortcuts.length > 0 && <div className="mt-9">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A4B4C5]/60">Acesso rápido</h2>
              <span className="text-[10px] text-white/30">Para seu setor</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return <Link key={item.to} to={item.to} className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3.5 transition hover:border-[#8D9EFF]/25 hover:bg-white/[0.06]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[#A4B4C5]"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block truncate text-xs font-medium text-white/85">{item.label}</span><span className="mt-0.5 block truncate text-[10px] text-white/40">{item.description}</span></span>
                </Link>;
              })}
            </div>
          </div>}
        </section>

        <footer className="mt-auto flex items-center justify-between gap-3 pt-12 text-[10px] text-white/25">
          <span>MMV CONNECT</span>
          <span>{user?.full_name}</span>
        </footer>
      </div>
    </main>
  );
}
