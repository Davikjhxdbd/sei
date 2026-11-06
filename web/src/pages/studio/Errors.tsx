import { useMemo, useState } from 'react';
import { AlertTriangle, Bug, MessageSquarePlus, Plus, Trash2 } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { del, patch, post } from '../../lib/api';
import {
  ERROR_STATUS,
  SEVERITY,
  formatDateTime,
  formatDayLabel,
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
  SearchInput,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/ui';
import { RecordList, type Column } from '../../components/RecordList';
import { useToast } from '../../components/Toast';

interface ErrorRow {
  id: string;
  category: string;
  severity: string;
  impact: string | null;
  occurred_at: string;
  description: string;
  immediate_action: string | null;
  stage: string | null;
  status: string;
  problem_id: string | null;
  event_id: string | null;
  event_name: string | null;
  starts_at: string | null;
  sector_id: string | null;
  sector_name: string | null;
  follow_up_name: string | null;
  created_by_name: string | null;
}

interface ErrorDetail {
  error: ErrorRow & {
    follow_up_user_id: string | null;
    report_id: string | null;
  };
  notes: { id: string; note: string; created_at: string; user_name: string | null }[];
}

export default function Errors() {
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [q, setQ] = useState('');

  const options = useApi<Record<string, string[]>>('/catalog/options');
  const sectors = useApi<{ items: { id: string; name: string }[] }>('/catalog/sectors');
  const people = useApi<{ items: { id: string; full_name: string }[] }>('/catalog/people');
  const events = useApi<{ items: { id: string; name: string; starts_at: string }[] }>(
    '/studio/events?limit=100',
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (category) params.set('category', category);
    if (severity) params.set('severity', severity);
    if (q.trim()) params.set('q', q.trim());
    const suffix = params.toString();
    return `/studio/errors${suffix ? `?${suffix}` : ''}`;
  }, [status, category, severity, q]);

  const { data, loading, reload } = useApi<{
    items: ErrorRow[];
    total: number;
    open: number;
  }>(query);

  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useApi<ErrorDetail>(selectedId ? `/studio/errors/${selectedId}` : null);
  const [note, setNote] = useState('');

  const [form, setForm] = useState({
    event_id: '',
    sector_id: '',
    category: 'Técnica',
    severity: 'medium',
    impact: '',
    description: '',
    immediate_action: '',
    stage: '',
    occurred_at: toDateTimeInput(new Date().toISOString()),
    follow_up_user_id: '',
  });
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      await post('/studio/errors', form);
      setCreating(false);
      setForm((current) => ({
        ...current,
        description: '',
        impact: '',
        immediate_action: '',
        stage: '',
      }));
      await reload();
      toast.push('Erro operacional registrado.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível registrar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    if (!selectedId || !note.trim()) return;
    try {
      await post(`/studio/errors/${selectedId}/notes`, { note });
      setNote('');
      await detail.reload();
      await reload();
      toast.push('Nota de análise registrada.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar a nota.', 'error');
    }
  }

  async function updateStatus(nextStatus: string) {
    if (!selectedId) return;
    try {
      await patch(`/studio/errors/${selectedId}`, { status: nextStatus });
      await detail.reload();
      await reload();
      toast.push('Situação atualizada.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível atualizar.', 'error');
    }
  }

  const columns: Column<ErrorRow>[] = [
    {
      key: 'description',
      header: 'Erro',
      primary: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="line-clamp-2 font-medium text-ink">{row.description}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {row.event_name ?? 'sem evento'} · {formatDateTime(row.occurred_at)}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge>{row.category}</Badge>
          <StatusBadge map={SEVERITY} value={row.severity} />
        </div>
      ),
    },
    {
      key: 'sector',
      header: 'Setor',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[12px] text-muted">{row.sector_name ?? '—'}</span>
      ),
    },
    {
      key: 'follow',
      header: 'Acompanhamento',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[12px] text-muted">{row.follow_up_name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (row) => <StatusBadge map={ERROR_STATUS} value={row.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Gestão do Estúdio"
        title="Erros operacionais"
        description="Acontecimentos identificados na operação. Um erro é um fato; um problema é a questão estrutural que ele pode revelar."
        actions={
          can('errors.create') && (
            <Button
              icon={Plus}
              onClick={() => {
                setForm((current) => ({
                  ...current,
                  category: options.data?.error_categories?.[0] ?? 'Técnica',
                  event_id: events.data?.items[0]?.id ?? '',
                  sector_id: sectors.data?.items[0]?.id ?? '',
                }));
                setCreating(true);
              }}
            >
              Registrar erro
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Buscar na descrição ou categoria…"
              className="sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="sm:w-44"
              >
                <option value="">Todas as categorias</option>
                {(options.data?.error_categories ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Select
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="sm:w-40"
              >
                <option value="">Toda gravidade</option>
                {Object.entries(SEVERITY).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <FilterPills
            value={status}
            onChange={setStatus}
            items={[
              { value: 'all', label: 'Todos' },
              { value: 'open', label: 'Abertos' },
              { value: 'in_analysis', label: 'Em análise' },
              { value: 'resolved', label: 'Resolvidos' },
              { value: 'closed', label: 'Encerrados' },
            ]}
          />
        </div>

        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => {
            setNote('');
            setSelectedId(row.id);
          }}
          emptyTitle="Nenhum erro registrado"
          emptyDescription="Registre acontecimentos para acompanhar a análise e as ações imediatas."
        />
      </Card>

      {/* Registro */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title="Registrar erro operacional"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={saving}
              disabled={!form.description.trim()}
              onClick={create}
            >
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Evento" hint="opcional">
              <Select
                value={form.event_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, event_id: event.target.value }))
                }
              >
                <option value="">Sem evento</option>
                {(events.data?.items ?? []).map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} — {formatDayLabel(event.starts_at)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Setor">
              <Select
                value={form.sector_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sector_id: event.target.value }))
                }
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
            <Field label="Categoria" required>
              <Select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {(options.data?.error_categories ?? ['Técnica']).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Gravidade">
              <Select
                value={form.severity}
                onChange={(event) =>
                  setForm((current) => ({ ...current, severity: event.target.value }))
                }
              >
                {Object.entries(SEVERITY).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Descrição do ocorrido" required>
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              placeholder="O que aconteceu, onde e como foi percebido"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Impacto">
              <Input
                value={form.impact}
                onChange={(event) =>
                  setForm((current) => ({ ...current, impact: event.target.value }))
                }
                placeholder="Ex.: perda de áudio por 20 segundos"
              />
            </Field>
            <Field label="Etapa do evento">
              <Input
                value={form.stage}
                onChange={(event) =>
                  setForm((current) => ({ ...current, stage: event.target.value }))
                }
                placeholder="Ex.: Abertura, mensagem…"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ação imediata">
              <Input
                value={form.immediate_action}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    immediate_action: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Ocorrido em">
              <Input
                type="datetime-local"
                value={form.occurred_at}
                onChange={(event) =>
                  setForm((current) => ({ ...current, occurred_at: event.target.value }))
                }
              />
            </Field>
          </div>

          <Field label="Responsável pelo acompanhamento">
            <Select
              value={form.follow_up_user_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  follow_up_user_id: event.target.value,
                }))
              }
            >
              <option value="">Não definido</option>
              {(people.data?.items ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Detalhe */}
      <Modal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        size="lg"
        title="Erro operacional"
        description={
          detail.data
            ? `${detail.data.error.category} · ${formatDateTime(detail.data.error.occurred_at)}`
            : undefined
        }
        footer={
          <>
            {can('errors.delete') && detail.data && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                className="mr-auto text-red-600 hover:bg-red-50"
                onClick={async () => {
                  if (!selectedId) return;
                  try {
                    await del(`/studio/errors/${selectedId}`);
                    setSelectedId(null);
                    await reload();
                    toast.push('Registro excluído.');
                  } catch (error: any) {
                    toast.push(error?.message ?? 'Não foi possível excluir.', 'error');
                  }
                }}
              >
                Excluir
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setSelectedId(null)}>
              Fechar
            </Button>
          </>
        }
      >
        {detail.loading || !detail.data ? (
          <LoadingBlock />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{detail.data.error.category}</Badge>
              <StatusBadge map={SEVERITY} value={detail.data.error.severity} />
              <StatusBadge map={ERROR_STATUS} value={detail.data.error.status} />
              {detail.data.error.problem_id && (
                <Badge tone="accent">vinculado a problema</Badge>
              )}
            </div>

            <p className="text-[13px] leading-relaxed text-ink/85">
              {detail.data.error.description}
            </p>

            <dl className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <dt className="mmv-label">Evento</dt>
                <dd className="mt-0.5">{detail.data.error.event_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="mmv-label">Setor</dt>
                <dd className="mt-0.5">{detail.data.error.sector_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="mmv-label">Etapa</dt>
                <dd className="mt-0.5">{detail.data.error.stage ?? '—'}</dd>
              </div>
              <div>
                <dt className="mmv-label">Impacto</dt>
                <dd className="mt-0.5">{detail.data.error.impact ?? '—'}</dd>
              </div>
              <div>
                <dt className="mmv-label">Ação imediata</dt>
                <dd className="mt-0.5">{detail.data.error.immediate_action ?? '—'}</dd>
              </div>
              <div>
                <dt className="mmv-label">Acompanhamento</dt>
                <dd className="mt-0.5">{detail.data.error.follow_up_name ?? '—'}</dd>
              </div>
            </dl>

            {can('errors.edit') && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                {['open', 'in_analysis', 'resolved', 'closed'].map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={
                      detail.data?.error.status === option ? 'primary' : 'secondary'
                    }
                    onClick={() => updateStatus(option)}
                  >
                    {ERROR_STATUS[option].label}
                  </Button>
                ))}
              </div>
            )}

            <div className="border-t border-line pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-ink/80">
                <MessageSquarePlus className="h-3.5 w-3.5" /> Notas de análise
              </p>
              <div className="mb-2 flex gap-2">
                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Registrar acompanhamento…"
                />
                <Button size="md" onClick={addNote} disabled={!note.trim()}>
                  Adicionar
                </Button>
              </div>
              {detail.data.notes.length === 0 ? (
                <p className="text-[11.5px] text-muted">Nenhuma nota registrada.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.data.notes.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-line px-3 py-2 text-[11.5px]"
                    >
                      <p className="text-ink/80">{entry.note}</p>
                      <p className="mt-0.5 text-muted">
                        {entry.user_name ?? '—'} · {formatDateTime(entry.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {detail.data.error.status !== 'closed' && (
              <p className="flex items-start gap-2 rounded-lg bg-canvas px-3 py-2 text-[11.5px] text-muted">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Erros recorrentes devem ser convertidos em problema estrutural na
                área de problemas, preservando a rastreabilidade.
              </p>
            )}
          </div>
        )}
      </Modal>

      {!can('errors.create') && (
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted">
          <Bug className="h-3.5 w-3.5" /> Você pode consultar os registros, mas o
          registro de novos erros exige permissão.
        </p>
      )}
    </div>
  );
}
