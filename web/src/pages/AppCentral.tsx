import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  Building2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Shell } from '../components/layout/Shell';
import { moduleIcon, moduleTopics } from '../modules/registry';
import { ROLE_LABELS } from '../lib/format';
import { Badge, cx } from '../components/ui';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function AppCentral() {
  const { user, modules, level, state } = useAuth();
  const unread = state?.notifications.unread ?? 0;

  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  return (
    <Shell>
      <div className="space-y-8">
        {/* Identidade e saudação */}
        <section className="relative overflow-hidden rounded-xl2 bg-strong px-5 py-6 text-white sm:px-8 sm:py-8">
          <div
            className="mmv-grid-pattern absolute inset-0 opacity-60"
            aria-hidden
          />
          <div
            className="absolute -right-16 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
            style={{
              background:
                'radial-gradient(circle at center, rgba(176,133,67,0.8), transparent 65%)',
            }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider2 text-brass-soft">
                MMV Connect · Central de aplicativos
              </p>
              <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.015em] sm:text-[32px]">
                {greeting()}, {user?.full_name.split(' ')[0]}.
              </h1>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/60">
                Escolha o aplicativo que deseja operar. Sua sessão, perfil e
                permissões são os mesmos em todos os módulos.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {user?.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/80"
                  >
                    {ROLE_LABELS[role] ?? role}
                  </span>
                ))}
                {user?.sectors.map((sector) => (
                  <span
                    key={sector.id}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/55"
                  >
                    {sector.name}
                    {sector.is_lead ? ' · liderança' : ''}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider2 text-white/40">
                  Aplicativos
                </p>
                <p className="mt-1 text-[22px] font-semibold leading-none">
                  {modules.length}
                </p>
              </div>
              <Link
                to="/notifications"
                className="rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 transition-colors hover:bg-white/[0.1]"
              >
                <p className="text-[10px] uppercase tracking-wider2 text-white/40">
                  Não lidas
                </p>
                <p className="mt-1 text-[22px] font-semibold leading-none">
                  {unread}
                </p>
              </Link>
            </div>
          </div>
          <p className="relative mt-6 text-[11px] uppercase tracking-wider2 text-white/35">
            {today}
          </p>
        </section>

        {/* Aplicativos */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                Seus aplicativos
              </h2>
              <p className="mt-1 text-[12.5px] text-muted">
                Cada aplicativo reúne suas próprias áreas de trabalho. Novos
                módulos habilitados aparecem automaticamente aqui.
              </p>
            </div>
            <Badge tone="neutral">{modules.length} disponíveis</Badge>
          </div>

          {modules.length === 0 ? (
            <div className="mmv-surface px-6 py-12 text-center">
              <h3 className="text-[14px] font-medium text-ink">
                Nenhum aplicativo liberado
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted">
                Sua conta está ativa, mas ainda não possui acesso a módulos.
                Procure a administração da plataforma para que o acesso seja
                concedido.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => {
                const Icon = moduleIcon(module.icon);
                const topics = moduleTopics(module.key);
                return (
                  <Link
                    key={module.id}
                    to={module.route}
                    className="group mmv-surface flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: module.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Disponível
                      </span>
                    </div>

                    <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-ink">
                      {module.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                      {module.description}
                    </p>

                    {topics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {topics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-md bg-ink/[0.04] px-2 py-0.5 text-[10.5px] text-ink/60"
                          >
                            {topic}
                          </span>
                        ))}
                        <span className="rounded-md px-1 py-0.5 text-[10.5px] text-muted">
                          + áreas internas
                        </span>
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-5">
                      <span className="text-[12px] font-medium text-ink/70">
                        Abrir aplicativo
                      </span>
                      <span
                        className={cx(
                          'grid h-8 w-8 place-items-center rounded-full border border-line text-ink/60 transition-colors',
                          'group-hover:border-transparent group-hover:bg-strong group-hover:text-white',
                        )}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Acesso rápido */}
        <section>
          <h2 className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-ink">
            Acesso rápido
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/notifications"
              className="mmv-surface flex items-center gap-3 px-4 py-3.5 transition-shadow hover:shadow-lift"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink/[0.05] text-ink/70">
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">
                  Notificações
                </span>
                <span className="block text-[11.5px] text-muted">
                  {unread > 0
                    ? `${unread} não lidas`
                    : 'Tudo acompanhado por aqui'}
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted" />
            </Link>

            <Link
              to="/profile"
              className="mmv-surface flex items-center gap-3 px-4 py-3.5 transition-shadow hover:shadow-lift"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink/[0.05] text-ink/70">
                <UserRound className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">
                  Meu perfil
                </span>
                <span className="block text-[11.5px] text-muted">
                  Dados, setores e estatísticas
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted" />
            </Link>

            {level >= 4 ? (
              <Link
                to="/admin/audit"
                className="mmv-surface flex items-center gap-3 px-4 py-3.5 transition-shadow hover:shadow-lift"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink/[0.05] text-ink/70">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">
                    Administração
                  </span>
                  <span className="block text-[11.5px] text-muted">
                    Módulos, setores, pessoas e auditoria
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted" />
              </Link>
            ) : (
              <div className="mmv-surface flex items-center gap-3 px-4 py-3.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink/[0.05] text-ink/70">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">
                    Estrutura da equipe
                  </span>
                  <span className="block text-[11.5px] text-muted">
                    {user?.sectors.length
                      ? user.sectors.map((sector) => sector.name).join(' · ')
                      : 'Nenhum setor associado'}
                  </span>
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
