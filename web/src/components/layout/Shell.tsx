import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ROLE_LABELS } from '../../lib/format';
import type { ModuleRecord } from '../../lib/types';
import type { NavGroup } from '../../modules/registry';
import { Avatar } from '../ui';

function useOutside(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="MMV CREATIVE — central">
      <span className="grid h-8 w-8 place-items-center rounded-lg border border-brass/45 bg-[#171612] text-brass">
        <svg viewBox="0 0 64 64" className="h-7 w-7" fill="none" aria-hidden="true">
          <path d="M12 47V18L32 37L52 18V47" stroke="#F0E3C4" strokeWidth="3.2" strokeLinecap="square" strokeLinejoin="round" />
          <path d="M32 37V10" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" />
          <circle cx="32" cy="9" r="3.2" fill="#F4F2ED" />
          <circle cx="12" cy="18" r="2.3" fill="currentColor" />
          <circle cx="52" cy="18" r="2.3" fill="#C4A66A" />
        </svg>
      </span>
      {!compact && (
        <span className="hidden flex-col leading-none sm:flex">
          <span className="text-[12.5px] font-semibold uppercase tracking-wider2 text-white">
            MMV CREATIVE
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider2 text-white/40">
            Plataforma integrada
          </span>
        </span>
      )}
    </Link>
  );
}

function ProfileMenu({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { user, logout, level } = useAuth();
  const navigate = useNavigate();
  const ref = useOutside(open, () => setOpen(false));
  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Menu do perfil"
        className="flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-soft focus-visible:ring-offset-2 focus-visible:ring-offset-strong"
      >
        <Avatar name={user.full_name} size="sm" className="bg-brass" />
      </button>

      {open && (
        <div
          className="mmv-fade-in absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,260px)] overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
          role="menu"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
            <Avatar name={user.full_name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">
                {user.full_name}
              </p>
              <p className="truncate text-[11.5px] text-muted">
                {user.roles.map((role) => ROLE_LABELS[role] ?? role).join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/profile');
            }}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] hover:bg-ink/[0.04]"
          >
            <UserRound className="h-4 w-4 text-muted" /> Meu perfil
          </button>
          {level >= 4 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/admin/audit');
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] hover:bg-ink/[0.04]"
            >
              <ShieldCheck className="h-4 w-4 text-muted" /> Administração
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/login');
            }}
            className="flex w-full items-center gap-2 border-t border-line px-3.5 py-2.5 text-left text-[13px] text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Encerrar sessão
          </button>
        </div>
      )}
    </div>
  );
}

export function Shell({
  module,
  children,
  sectionLabel,
}: {
  module?: ModuleRecord;
  nav?: NavGroup[];
  sidebarEyebrow?: string;
  children: ReactNode;
  sectionLabel?: string;
}) {
  const { user, state } = useAuth();
  const [profileMenu, setProfileMenu] = useState(false);
  const location = useLocation();

  const unread = state?.notifications?.unread ?? 0;
  const currentSection = sectionLabel ?? module?.name ?? (
    location.pathname.startsWith('/admin') ? 'Administração'
    : location.pathname.startsWith('/m/studio') ? 'Produção Criativa'
    : location.pathname.startsWith('/m/communication') ? 'Comunicação'
    : location.pathname.startsWith('/gestao') ? 'Gestão'
    : location.pathname.startsWith('/calendar') ? 'Agenda'
    : location.pathname.startsWith('/notifications') ? 'Notificações'
    : location.pathname.startsWith('/profile') ? 'Meu perfil'
    : 'Meu Espaço'
  );

  return (
    <div className="mmv-app-shell relative isolate min-h-screen bg-canvas font-sans">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(760px circle at 82% 0%, rgb(var(--mmv-brass) / 0.075), transparent 68%)',
        }}
      />
      <div className="relative z-10">
      <header className="mmv-app-topbar sticky top-0 z-40 border-b border-white/[0.07] bg-strong shadow-lg shadow-black/10">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <Brand />
          <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
          <div className="hidden min-w-0 sm:block">
            <span className="block truncate text-[12px] font-semibold text-white/85">{currentSection}</span>
            <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[.18em] text-brass-soft/60">MMV / CREATIVE</span>
          </div>
          <div className="flex-1" />
          <Link
            to="/notifications"
            aria-label={
              unread > 0
                ? `Notificações, ${unread} não lidas`
                : 'Notificações'
            }
            className="relative grid h-9 w-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-soft focus-visible:ring-offset-2 focus-visible:ring-offset-strong"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brass px-1 text-[10px] font-semibold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <span className="hidden h-6 w-px bg-white/10 sm:block" />
          <ProfileMenu
            open={profileMenu}
            setOpen={(value) => {
              setProfileMenu(value);
            }}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1500px]">
        <div className="min-w-0 flex-1">
          <main
            key={location.pathname}
            className="mmv-app-main mmv-fade-in mx-auto w-full px-4 py-6 sm:px-7 sm:py-8 lg:px-9"
          >
            {children}
          </main>

          {user && (
            <footer className="border-t border-line px-4 py-4 text-[11px] text-muted sm:px-6">
              MMV / CREATIVE · {user.full_name} ·{' '}
              {user.roles.map((role) => ROLE_LABELS[role] ?? role).join(' · ')}
            </footer>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
