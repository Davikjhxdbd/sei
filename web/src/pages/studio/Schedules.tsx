import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Plus, Users2 } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { post, patch, get } from '../../lib/api';
import {
  ASSIGNMENT_STATUS,
  READINESS,
  formatDateTime,
  formatDayLabel,
  formatTime,
  toDateTimeInput,
} from '../../lib/format';
import {
  Badge,
  Button,
  Card,
  Field,
  FilterPills,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  cx,
} from '../../components/ui';
import { RecordList, type Column } from '../../components/RecordList';
import { useToast } from '../../components/Toast';

interface ScheduleRow {
  id: string;
  role_title: string;
  instructions: string | null;
  call_time: string | null;
  status: string;
  user_id: string | null;
  event_id: string;
  event_name: string;
  starts_at: string;
  sector_id: string | null;
  sector_name: string | null;
  user_name: string | null;
  readiness: string | null;
  history_count: number;
}

interface HistoryRow {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
  changed_by_name: string | null;
  from_user_name: string | null;
  to_user_name: string | null;
}

const HISTORY_LABELS: Record<string, string> = {
  created: 'Designação criada',
  reassigned: 'Designação alterada',
  published: 'Escala publicada',
  ended: 'Designação encerrada',
};

export default function Schedules() {
  const { can, user } = useAuth();
  const toast = useToast();
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState('all');
  const [mine, setMine] = useState(false);

  const events = useApi<{ items: { id: string; name: string; starts_at: string }[] }>(
    '/studio/events?limit=100',
  );
  const sectors = useApi<{ items: { id: string; name: string }[] }>('/catalog/sectors');
  const people = useApi<{ items: { id: string; full_name: string }[] }>('/catalog/people');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (eventId) params.set('event_id', eventId);
    if (status !== 'all') params.set('status', status);
    if (mine) params.set('mine', '1');
    const suffix = params.toString();
    return `/studio/schedules${suffix ? `?${suffix}` : ''}`;
  }, [eventId, status, mine]);

  const { data, loading, reload } = useApi<{ items: ScheduleRow[] }>(query);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleRow | null>(null);
  const [form, setForm] = useState({
    event_id: '',
    sector_id: '',
    role_title: '',
    user_id: '',
    instructions: '',
    call_time: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const [readinessTarget, setReadinessTarget] = useState<ScheduleRow | null>(null);
  const [readinessState, setReadinessState] = useState('ready');
  const [readinessNote, setReadinessNote] = useState('');

  function openCreate() {
    setEditing(null);
    setHistory([]);
    setForm({
      event_id: events.data?.items[0]?.id ?? '',
      sector_id: sectors.data?.items[0]?.id ?? '',
      role_title: '',
      user_id: '',
      instructions: '',
      call_time: '',
      reason: '',
    });
    setOpen(true);
  }

  async function openEdit(row: ScheduleRow) {
    setEditing(row);
    setForm({
      event_id: row.event_id,
      sector_id: row.sector_id ?? '',
      role_title: row.role_title,
      user_id: row.user_id ?? '',
      instructions: row.instructions ?? '',
      call_time: toDateTimeInput(row.call_time),
      reason: '',
    });
    setOpen(true);
    try {
      const payload = await get<{ items: HistoryRow[] }>(
        `/studio/schedules/${row.id}/history`,
      );
      setHistory(payload.items);
    } catch {
      setHistory([]);
    }
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        await patch(`/studio/schedules/${editing.id}`, {
          sector_id: form.sector_id || null,
          role_title: form.role_title,
          user_id: form.user_id || null,
          instructions: form.instructions,
          call_time: form.call_time || null,
          reason: form.reason,
        });
      } else {
        await post('/studio/schedules', {
          event_id: form.event_id,
          sector_id: form.sector_id || null,
          role_title: form.role_title,
          user_id: form.user_id || null,
          instructions: form.instructions,
          call_time: form.call_time || null,
        });
      }
      setOpen(false);
      await reload();
      toast.push(editing ? 'Designação atualizada.' : 'Designação criada.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function publish(row: ScheduleRow) {
    try {
      await post(`/studio/schedules/${row.id}/publish`, {});
      await reload();
      toast.push('Escala publicada e pessoa notificada.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível publicar.', 'error');
    }
  }

  async function end(row: ScheduleRow) {
    try {
      await post(`/studio/schedules/${row.id}/end`, {});
      await reload();
      toast.push('Designação encerrada.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível encerrar.', 'error');
    }
  }

  const columns: Column<ScheduleRow>[] = [
    {
      key: 'role',
      header: 'Posto / função',
      primary: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.role_title}</p>
          <p className="truncate text-[11px] text-muted">
            {row.sector_name ?? 'sem setor'}
          </p>
        </div>
      ),
    },
    {
      key: 'person',
      header: 'Pessoa',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-ink/85">
            {row.user_name ?? 'sem responsável'}
          </p>
          {row.call_time && (
            <p className="text-[11px] text-muted">
              apresentação {formatTime(row.call_time)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Evento',
      mobileHidden: true,
      render: (row) => (
        <div className="text-[12px]">
          <p className="text-ink/80">{row.event_name}</p>
          <p className="text-[11px] text-muted">{formatDayLabel(row.starts_at)}</p>
        </div>
      ),
    },
    {
      key: 'readiness',
      header: 'Prontidão',
      render: (row) =>
        row.readiness ? (
          <StatusBadge map={READINESS} value={row.readiness} />
        ) : (
          <span className="text-[11.5px] text-muted">não confirmada</span>
        ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (row) => <StatusBadge map={ASSIGNMENT_STATUS} value={row.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Gestão do Estúdio"
        title="Escalas de serviço"
        description="Designações por posto de trabalho, publicação, histórico de alterações e confirmação de prontidão."
        actions={
          can('schedules.manage') && (
            <Button icon={Plus} onClick={openCreate}>
              Nova designação
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className="sm:w-64"
            >
              <option value="">Todos os eventos</option>
              {(events.data?.items ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} — {formatDayLabel(event.starts_at)}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setMine(!mine)}
              className={cx(
                'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium',
                mine
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-surface text-muted',
              )}
            >
              <Users2 className="h-4 w-4" /> Somente minhas
            </button>
          </div>
          <FilterPills
            value={status}
            onChange={setStatus}
            items={[
              { value: 'all', label: 'Todas' },
              { value: 'draft', label: 'Rascunhos' },
              { value: 'published', label: 'Publicadas' },
              { value: 'ended', label: 'Encerradas' },
            ]}
          />
        </div>

        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => (can('schedules.manage') ? openEdit(row) : undefined)}
          emptyTitle="Nenhuma designação"
          emptyDescription="Monte a escala do evento definindo postos e responsáveis."
        />

        {(data?.items.length ?? 0) > 0 && (
          <div className="border-t border-line px-4 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider2 text-muted">
              <CheckCircle2 className="h-3.5 w-3.5" /> confirme sua prontidão nas
              designações atribuídas a você
            </p>
            <div className="flex flex-wrap gap-2">
              {(data?.items ?? [])
                .filter((row) => row.user_id === user?.id)
                .slice(0, 6)
                .map((row) => (
                  <Button
                    key={row.id}
                    size="sm"
                    variant="secondary"
                    icon={CalendarClock}
                    onClick={() => {
                      setReadinessTarget(row);
                      setReadinessState(row.readiness ?? 'ready');
                      setReadinessNote('');
                    }}
                  >
                    {row.role_title}
                  </Button>
                ))}
              {!(data?.items ?? []).some((row) => row.user_id === user?.id) && (
                <span className="text-[11.5px] text-muted">
                  Você não possui designações nesta visão.
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={editing ? 'Designação' : 'Nova designação'}
        description={editing ? `${editing.event_name} · ${formatDayLabel(editing.starts_at)}` : undefined}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            {editing && can('schedules.manage') && (
              <>
                {editing.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      publish(editing);
                      setOpen(false);
                    }}
                  >
                    Publicar escala
                  </Button>
                )}
                {editing.status === 'published' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      end(editing);
                      setOpen(false);
                    }}
                  >
                    Encerrar
                  </Button>
                )}
              </>
            )}
            {can('schedules.manage') && (
              <Button size="sm" loading={saving} disabled={!form.role_title.trim()} onClick={save}>
                Salvar
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {!editing && (
            <Field label="Evento" required>
              <Select
                value={form.event_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, event_id: event.target.value }))
                }
              >
                <option value="">Selecione…</option>
                {(events.data?.items ?? []).map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} — {formatDayLabel(event.starts_at)}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Posto / função" required>
              <Input
                value={form.role_title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, role_title: event.target.value }))
                }
                disabled={!can('schedules.manage')}
                placeholder="Ex.: Operador de som"
              />
            </Field>
            <Field label="Setor">
              <Select
                value={form.sector_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sector_id: event.target.value }))
                }
                disabled={!can('schedules.manage')}
              >
                <option value="">Sem setor</option>
                {(sectors.data?.items ?? []).map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pessoa designada">
              <Select
                value={form.user_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, user_id: event.target.value }))
                }
                disabled={!can('schedules.manage')}
              >
                <option value="">Sem responsável</option>
                {(people.data?.items ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Horário de apresentação">
              <Input
                type="datetime-local"
                value={form.call_time}
                onChange={(event) =>
                  setForm((current) => ({ ...current, call_time: event.target.value }))
                }
                disabled={!can('schedules.manage')}
              />
            </Field>
          </div>

          <Field label="Instruções">
            <Textarea
              value={form.instructions}
              onChange={(event) =>
                setForm((current) => ({ ...current, instructions: event.target.value }))
              }
              rows={2}
              disabled={!can('schedules.manage')}
            />
          </Field>

          {editing && can('schedules.manage') && (
            <Field label="Justificativa da alteração" hint="registrada no histórico">
              <Input
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="Ex.: troca solicitada pela pessoa"
              />
            </Field>
          )}

          {editing && (
            <div>
              <p className="mmv-label mb-2">Histórico de alterações</p>
              {history.length === 0 ? (
                <p className="text-[11.5px] text-muted">Nenhuma alteração registrada.</p>
              ) : (
                <ul className="space-y-1.5">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-line px-3 py-2 text-[11.5px]"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-medium text-ink">
                          {HISTORY_LABELS[entry.action] ?? entry.action}
                        </span>
                        <span className="text-muted">
                          {formatDateTime(entry.created_at)}
                        </span>
                      </div>
                      <p className="text-muted">
                        {entry.changed_by_name ?? '—'}
                        {entry.from_user_name
                          ? ` · ${entry.from_user_name} → ${entry.to_user_name ?? 'sem responsável'}`
                          : ''}
                        {entry.reason ? ` · ${entry.reason}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(readinessTarget)}
        onClose={() => setReadinessTarget(null)}
        title="Confirmar prontidão"
        description={
          readinessTarget
            ? `${readinessTarget.role_title} · ${readinessTarget.event_name}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setReadinessTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={saving}
              onClick={async () => {
                if (!readinessTarget) return;
                setSaving(true);
                try {
                  await post('/studio/readiness', {
                    schedule_id: readinessTarget.id,
                    state: readinessState,
                    note: readinessNote || null,
                  });
                  setReadinessTarget(null);
                  await reload();
                  toast.push('Prontidão registrada.');
                } catch (error: any) {
                  toast.push(error?.message ?? 'Não foi possível registrar.', 'error');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Condição">
            <Select
              value={readinessState}
              onChange={(event) => setReadinessState(event.target.value)}
            >
              {Object.entries(READINESS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observação">
            <Textarea
              value={readinessNote}
              onChange={(event) => setReadinessNote(event.target.value)}
              rows={2}
              placeholder="Ex.: chegarei 10 minutos depois do horário previsto"
            />
          </Field>
          <p className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <Badge tone="accent">separado da escala</Badge>
            A prontidão é uma confirmação da pessoa designada, não da designação.
          </p>
        </div>
      </Modal>
    </div>
  );
}
