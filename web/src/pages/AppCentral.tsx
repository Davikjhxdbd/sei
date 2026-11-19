import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Command, LogOut, UserRound, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { moduleIcon } from '../modules/registry';
import { ThemeToggle } from '../components/ThemeToggle';

interface NotificationPayload {
  items: { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }[];
  unread: number;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia!';
  if (hour < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

function initials(name: string) {
  return name.trim().split(/\\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export default function AppCentral() {
  const navigate = useNavigate();
  const { user, modules, logout } = useAuth();
  const { data } = useApi<NotificationPayload>('/notifications');
  const greeting = useMemo(getGreeting, []);
  const unread = data?.unread ?? 0;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0D10] text-[#F4F5F6]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 -top-48 h-96 w-96 rounded-full bg-[#8D9EFF]/[0.08] blur-[120px]" />
        <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-[#A4B4C5]/[0.04] blur-[110px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="MMV CONNECT — início">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
              <Command className="h-4 w-4 text-[#A4B4C5]" />
            </span>
            <span className="text-xs font-semibold tracking-[0.18em]">MMV <span className="text-[#A4B4C5]">CONNECT</span></span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/notifications" aria-label="Notificações" className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]">
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#8D9EFF]" />}
            </Link>
            <Link to="/profile" aria-label="Meu perfil" className="grid h-9 w-9 place-items-center rounded-xl border border-[#8D9EFF]/25 bg-[#8D9EFF]/10 text-[11px] font-semibold text-[#DCE1FF]">
              {user ? initials(user.full_name) : <UserRound className="h-4 w-4" />}
            </Link>
          </div>
        </header>

        <section className="mx-auto mt-14 w-full max-w-4xl sm:mt-20">
          <p className="text-xs font-medium tracking-wide text-[#A4B4C5]/65">{greeting}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Vamos começar{user?.full_name ? `, ${user.full_name.trim().split(/\\s+/)[0]}` : ''}?
          </h1>
          <p className="mt-2 text-sm text-[#A4B4C5]/55">Tudo o que você precisa, em um só lugar.</p>

          <div className="mt-9 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A4B4C5]/65">Seus aplicativos</h2>
            <span className="text-[11px] text-white/35">{modules.length} disponíveis</span>
          </div>

          {modules.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {modules.map((module) => {
                const Icon = moduleIcon(module.icon);
                return (
                  <Link
                    key={module.id}
                    to={module.route}
                    className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 transition hover:border-[#8D9EFF]/30 hover:bg-white/[0.07]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.05] text-[#C6CEFF]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white/90">{module.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-white/35">Abrir aplicativo</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/25 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#C6CEFF]" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-6 text-center text-xs text-white/45">
              Nenhum aplicativo disponível para seu perfil no momento.
            </div>
          )}
        </section>

        <footer className="mt-auto flex items-center justify-between gap-3 pt-12 text-[10px] text-white/30">
          <span>Conectando pessoas, equipes e propósito.</span>
          <button onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.05] hover:text-white/65">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </footer>
      </div>
    </main>
  );
}
