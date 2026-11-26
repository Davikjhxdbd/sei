import { ArrowUpRight, Boxes, Building2, ClipboardList, History, Settings2, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { formatDateTime } from '../../lib/format';
import { Shell } from '../../components/layout/Shell';
import { Badge, Card, LoadingBlock, PageHeader, StatCard } from '../../components/ui';

interface Person { id: string }
interface Sector { id: string; name: string; active: boolean; member_count?: number }
interface AuditEntry { id: string; actor_name: string | null; action: string; entity: string; created_at: string }
interface ModuleSummary { id: string; active: boolean }

const sections = [
  { title: 'Pessoas e acessos', description: 'Contas, cargos, vínculos e situação de acesso.', href: '/admin/users', icon: Users, restricted: true },
  { title: 'Departamentos', description: 'Estrutura institucional, setores e responsáveis.', href: '/admin/sectors', icon: Building2 },
  { title: 'Aplicativos e permissões', description: 'Ative módulos e defina quais cargos podem acessá-los.', href: '/admin/modules', icon: Boxes, restricted: true },
  { title: 'Configurações', description: 'Parâmetros e opções operacionais da plataforma.', href: '/admin/settings', icon: Settings2 },
  { title: 'Auditoria', description: 'Histórico imutável das principais ações realizadas.', href: '/admin/audit', icon: History },
];

export default function Management() {
  const { level } = useAuth();
  const people = useApi<{ items: Person[] }>('/catalog/people');
  const sectors = useApi<{ items: Sector[] }>('/catalog/sectors');
  const audit = useApi<{ items: AuditEntry[]; total: number }>('/admin/audit?limit=6');
  const modules = useApi<{ items: ModuleSummary[] }>(level >= 5 ? '/admin/modules' : null);
  const activeModules = modules.data?.items.filter((item) => item.active).length ?? 0;
  const visibleSections = sections.filter((section) => !section.restricted || level >= 5);
  const activeSectors = sectors.data?.items.filter((item) => item.active).length ?? 0;

  return (
    <Shell sectionLabel="Administração">
    <>
      <PageHeader
        eyebrow="MMV CREATIVE · GESTÃO"
        title="Administração"
        description="Controle institucional de usuários, permissões, módulos, setores e integridade da plataforma."
        actions={<Badge tone="accent"><ShieldCheck className="h-3 w-3" /> Área restrita</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pessoas ativas" value={people.loading ? '—' : people.data?.items.length ?? 0} hint="Integrantes cadastrados" icon={Users} />
        <StatCard label="Departamentos ativos" value={sectors.loading ? '—' : activeSectors} hint="Estrutura institucional" icon={Building2} />
        <StatCard label="Registros de auditoria" value={audit.loading ? '—' : audit.data?.total ?? 0} hint="Eventos registrados" icon={ClipboardList} />
        {level >= 5 && <StatCard label="Módulos ativos" value={modules.loading ? '—' : activeModules} hint="Aplicativos habilitados" icon={Boxes} />}
      </div>

      <div className="mt-7 mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="mmv-label text-brass-deep">Administração</p>
          <h2 className="mt-1 text-[17px] font-semibold text-ink">Central de administração</h2>
        </div>
        <span className="text-[11px] text-muted">{visibleSections.length} áreas disponíveis</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} to={section.href} className="group">
              <Card className="flex h-full items-start gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-lift">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brass/20 bg-brass/[0.08] text-brass-deep">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-ink">{section.title}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brass-deep" />
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">{section.description}</span>
                </span>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="mmv-label text-brass-deep">Rastreabilidade</p>
            <h2 className="mt-1 text-[17px] font-semibold text-ink">Atividade recente</h2>
          </div>
          <Link to="/admin/audit" className="text-[12px] font-medium text-brass-deep hover:underline">Ver auditoria</Link>
        </div>
        <Card className="divide-y divide-line">
          {audit.loading ? <div className="p-5"><LoadingBlock label="Carregando atividade…" /></div> : audit.data?.items.length ? audit.data.items.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-ink">{entry.action}</p>
                <p className="mt-0.5 text-[11px] text-muted">{entry.actor_name ?? 'Sistema'} · {entry.entity}</p>
              </div>
              <time className="text-[11px] text-muted">{formatDateTime(entry.created_at)}</time>
            </div>
          )) : <p className="p-5 text-[12.5px] text-muted">Nenhuma atividade registrada ainda.</p>}
        </Card>
      </div>
    </>
    </Shell>
  );
}
