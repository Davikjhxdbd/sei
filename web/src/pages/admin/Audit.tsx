import { useMemo, useState } from 'react';
import { ScrollText, ShieldCheck } from 'lucide-react';
import { Shell } from '../../components/layout/Shell';
import { useApi } from '../../lib/useApi';
import { formatDateTime } from '../../lib/format';
import {
  Badge,
  Button,
  Card,
  LoadingBlock,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  cx,
} from '../../components/ui';
import { RecordList, type Column } from '../../components/RecordList';

interface AuditRow {
  id: string;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  module_key: string | null;
  created_at: string;
}

const ENTITIES = [
  'events',
  'event_reports',
  'checklist_tasks',
  'operational_errors',
  'problems',
  'authorization_requests',
  'schedules',
  'media_records',
  'users',
  'modules',
  'sectors',
  'settings',
  'platform',
  'session',
];

function pretty(value: unknown) {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AuditPage() {
  const [entity, setEntity] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (entity) params.set('entity', entity);
    if (q.trim()) params.set('q', q.trim());
    const suffix = params.toString();
    return `/admin/audit${suffix ? `?${suffix}` : ''}`;
  }, [entity, q]);

  const { data, loading } = useApi<{ items: AuditRow[]; total: number }>(query);

  const columns: Column<AuditRow>[] = [
    {
      key: 'when',
      header: 'Quando',
      primary: true,
      render: (row) => (
        <span className="text-[12.5px] text-ink">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'actor',
      header: 'Autor',
      render: (row) => (
        <span className="text-[12.5px] text-ink/80">{row.actor_name ?? 'Sistema'}</span>
      ),
    },
    {
      key: 'action',
      header: 'Ação',
      render: (row) => (
        <span className="font-mono text-[11.5px] text-ink/70">{row.action}</span>
      ),
    },
    {
      key: 'entity',
      header: 'Entidade',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge>{row.entity}</Badge>
          {row.module_key && (
            <span className="text-[10.5px] uppercase tracking-wider2 text-muted">
              {row.module_key}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'id',
      header: 'Registro',
      mobileHidden: true,
      render: (row) => (
        <span className="font-mono text-[10.5px] text-muted">
          {row.entity_id ? row.entity_id.slice(0, 12) : '—'}
        </span>
      ),
    },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Auditoria"
        description="Trilha imutável de operações relevantes de todos os aplicativos. Os registros não podem ser alterados nem excluídos."
        actions={
          <Badge tone="accent">
            <ShieldCheck className="h-3 w-3" /> somente leitura
          </Badge>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar por autor ou identificador…"
            className="sm:max-w-xs"
          />
          <div className="w-full sm:w-56">
            <Select value={entity} onChange={(event) => setEntity(event.target.value)}>
              <option value="">Todas as entidades</option>
              {ENTITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => setSelected(row)}
          emptyTitle="Nenhum registro de auditoria"
          emptyDescription="Operações relevantes aparecem aqui automaticamente."
        />

        <div className="border-t border-line px-4 py-2.5 text-[11.5px] text-muted">
          {data?.total ?? 0} eventos registrados na plataforma
        </div>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="xl"
        title="Detalhe do evento"
        description={selected ? `${selected.action} · ${selected.entity}` : undefined}
        footer={
          <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
            Fechar
          </Button>
        }
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <dt className="mmv-label">Autor</dt>
                <dd className="mt-1">{selected.actor_name ?? 'Sistema'}</dd>
              </div>
              <div>
                <dt className="mmv-label">Data</dt>
                <dd className="mt-1">{formatDateTime(selected.created_at)}</dd>
              </div>
              <div>
                <dt className="mmv-label">Registro</dt>
                <dd className="mt-1 font-mono text-[11px]">
                  {selected.entity_id ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="mmv-label">Módulo</dt>
                <dd className="mt-1">{selected.module_key ?? 'plataforma'}</dd>
              </div>
            </dl>

            {selected.reason && (
              <div>
                <p className="mmv-label mb-1">Justificativa</p>
                <p className="rounded-lg bg-canvas px-3 py-2 text-[12.5px]">
                  {selected.reason}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mmv-label mb-1">Estado anterior</p>
                <pre className={cx('mmv-scroll max-h-64 overflow-auto rounded-lg bg-ink p-3 text-[11px] leading-relaxed text-white/80')}>
                  {pretty(selected.before)}
                </pre>
              </div>
              <div>
                <p className="mmv-label mb-1">Novo estado</p>
                <pre className="mmv-scroll max-h-64 overflow-auto rounded-lg bg-ink p-3 text-[11px] leading-relaxed text-white/80">
                  {pretty(selected.after)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted">
        <ScrollText className="h-3.5 w-3.5" />
        A visualização é restrita à liderança sênior e ao administrador do sistema.
      </p>
    </Shell>
  );
}
