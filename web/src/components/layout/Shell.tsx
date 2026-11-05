import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  ChevronDown,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ROLE_LABELS } from '../../lib/format';
import type { ModuleRecord } from '../../lib/types';
import { Avatar, cx } from '../ui';
import {
  moduleIcon,
  navGroups,
  type NavGroup,
} from '../../modules/registry';

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
    <Link to="/" className="flex items-center gap-2.5" aria-label="MMV Connect — central">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brass text-[13px] font-bold tracking-tight text-white">
        MV
      </span>
      {!compact && (
        <span className="hidden flex-col leading-none sm:flex">
          <span className="text-[12.5px] font-semibold uppercase tracking-wider2 text-white">
            MMV Connect
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider2 text-white/40">
            Plataforma operacional
          </span>
        </span>
      )}
    </Link>
  );
}

function ModuleSwitcher({
  module,
  open,
  setOpen,
}: {
  module?: ModuleRecord;
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  const { modules, level } = useAuth();
  const navigate = useNavigate();
  const ref = useOutside(open, () => setOpen(false));
  const Icon = module ? moduleIcon(module.icon) : LayoutGrid;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-[62vw] items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.12] sm:max-w-none"
      >
        <Icon className="h-4 w-4 shrink-0 text-brass-soft" />
        <span className="min-w-0 truncate text-[12.5px] font-medium text-white">
          {module ? module.name : 'Central de aplicativos'}
        </span>
        <ChevronDown
          className={cx(
            'h-3.5 w-3.5 shrink-0 text-white/50 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="mmv-fade-in absolute left-0 top-[calc(100%+8px)] z-50 w-[min(92vw,340px)] overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
        >
          <p className="mmv-label px-3.5 pb-1.5 pt-3">Aplicativos</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/');
            }}
            className={cx(
              'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-ink/[0.04]',
              !module && 'bg-ink/[0.03] font-medium',
            )}
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-white">
              <LayoutGrid className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1">
              Central de aplicativos
              <span className="block text-[11px] text-muted">
                Visão geral da plataforma
              </span>
            </span>
            {!module && <Check className="h-4 w-4 text-studio" />}
          </button>

          <div className="mx-3 my-1 border-t border-line" />

          {modules.length === 0 && (
            <p className="px-3.5 py-3 text-[12px] text-muted">
              Nenhum aplicativo liberado para o seu perfil.
            </p>
          )}

          {modules.map((item) => {
            const ItemIcon = moduleIcon(item.icon);
            const active = module?.key === item.key;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(item.route);
                }}
                className={cx(
                  'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-ink/[0.04]',
                  active && 'bg-ink/[0.03] font-medium',
                )}
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg text-white"
                  style={{ backgroundColor: item.color }}
                >
                  <ItemIcon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.name}</span>
                  <span className="block truncate text-[11px] text-muted">
                    {item.description}
                  </span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-studio" />}
              </button>
            );
          })}

          <p className="border-t border-line bg-canvas/60 px-3.5 py-2 text-[11px] text-muted">
            {level >= 4
              ? 'Novos aplicativos aparecem aqui assim que forem habilitados.'
              : 'Você vê apenas os aplicativos autorizados ao seu perfil.'}
          </p>
        </div>
      )}
    </div>
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
        className="flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-90"
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
  nav,
  children,
  sidebarEyebrow,
}: {
  module?: ModuleRecord;
  nav?: NavGroup[];
  children: ReactNode;
  sidebarEyebrow?: string;
}) {
  const { user, level, state } = useAuth();
  const [moduleMenu, setModuleMenu] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const location = useLocation();
  const groups = navGroups(nav, level);
  const unread = state?.notifications.unread ?? 0;
  const productName =
    (module?.settings?.product_name as string | undefined) ?? undefined;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 bg-ink">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <Brand />
          <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
          <ModuleSwitcher
            module={module}
            open={moduleMenu}
            setOpen={(value) => {
              setModuleMenu(value);
              if (value) setProfileMenu(false);
            }}
          />
          <div className="flex-1" />
          <Link
            to="/notifications"
            aria-label={
              unread > 0
                ? `Notificações, ${unread} não lidas`
                : 'Notificações'
            }
            className="relative grid h-9 w-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
              if (value) setModuleMenu(false);
            }}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1500px]">
        {groups.length > 0 && (
          <aside className="mmv-scroll sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[248px] shrink-0 overflow-y-auto border-r border-line bg-surface/70 px-3 py-5 lg:block">
            <div className="mb-4 px-2">
              <p className="mmv-label">{sidebarEyebrow ?? 'Aplicativo'}</p>
              <p className="mt-1 truncate text-[13.5px] font-semibold text-ink">
                {module?.name ?? 'Administração'}
              </p>
              {productName && (
                <p className="text-[11.5px] text-muted">{productName}</p>
              )}
            </div>

            {groups.map((group) => (
              <div key={group.title} className="mb-5">
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider2 text-muted/80">
                  {group.title}
                </p>
                <nav className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cx(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                          isActive
                            ? 'bg-ink font-medium text-white'
                            : 'text-ink/75 hover:bg-ink/[0.05] hover:text-ink',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={cx(
                              'h-4 w-4 shrink-0',
                              isActive ? 'text-brass-soft' : 'text-muted',
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}

            <div className="mt-auto rounded-lg border border-line bg-canvas/70 p-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Todos os aplicativos compartilham o mesmo acesso, perfil e
                permissões.
              </p>
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          {groups.length > 0 && (
            <div className="mmv-scroll sticky top-14 z-30 flex gap-1.5 overflow-x-auto border-b border-line bg-surface px-3 py-2 lg:hidden">
              {groups.flatMap((group) =>
                group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cx(
                        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium',
                        isActive
                          ? 'border-ink bg-ink text-white'
                          : 'border-line bg-surface text-muted',
                      )
                    }
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </NavLink>
                )),
              )}
            </div>
          )}

          <main
            key={location.pathname}
            className="mmv-fade-in mx-auto w-full px-4 py-5 sm:px-6 sm:py-7"
          >
            {children}
          </main>

          {user && (
            <footer className="border-t border-line px-4 py-4 text-[11px] text-muted sm:px-6">
              MMV Connect · {user.full_name} ·{' '}
              {user.roles.map((role) => ROLE_LABELS[role] ?? role).join(' · ')}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
