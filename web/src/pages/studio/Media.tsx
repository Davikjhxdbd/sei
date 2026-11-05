import { useMemo, useState } from 'react';
import { Film, Plus } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { get, patch, post } from '../../lib/api';
import {
  MEDIA_STATUS,
  formatDate,
  formatDateTime,
  formatTime,
  toDateInput,
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
  cx,
} from '../../components/ui';
import { RecordList, type Column } from '../../components/RecordList';
import { useToast } from '../../components/Toast';

interface MediaRow {
  id: string;
  service_date: string;
  service_time: string | null;
  preacher: string | null;
  event_name: string | null;
  record_type: string;
  status: string;
  platform: string | null;
  published_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  editor_id: string | null;
  editor_name: string | null;
  publisher_name: string | null;
  reported_by_name: string | null;
}

interface HistoryRow {
  id: string;
  from_status: string | null;
  to_status: string;
  comment: string | null;
  created_at: string;
  user_name: string | null;
}

export default function Media() {
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const options = useApi<Record<string, string[]>>('/catalog/options');
  const people = useApi<{ items: { id: string; full_name: string }[] }>('/catalog/people');
  const stats = useApi<{ totals: Record<string, number> }>('/studio/media/stats');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const suffix = params.toString();
    return `/studio/media${suffix ? `?${suffix}` : ''}`;
  }, [status, q, from, to]);

  const { data, loading, reload } = useApi<{ items: MediaRow[]; total: number }>(query);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    service_date: toDateInput(new Date().toISOString()),
    service_time: '',
    preacher: '',
    event_name: '',
    record_type: 'Gravação',
    editor_id: '',
    publisher_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<MediaRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [nextStatus, setNextStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');

  async function create() {
    setSaving(true);
    try {
      await post('/studio/media', {
        ...form,
        editor_id: form.editor_id || null,
        publisher_id: form.publisher_id || null,
      });
      setCreating(false);
      await reload();
      await stats.reload();
      toast.push('Registro de mídia criado.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível criar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(row: MediaRow) {
    setSelected(row);
    setNextStatus(row.status);
    setStatusComment('');
    setPublishedUrl(row.published_url ?? '');
    setHistory([]);
    try {
      const payload = await get<{ items: HistoryRow[] }>(`/studio/media/${row.id}/history`);
      setHistory(payload.items);
    } catch {
      setHistory([]);
    }
  }

  async function applyStatus() {
    if (!selected) return;
    try {
      await post(`/studio/media/${selected.id}/status`, {
        status: nextStatus,
        comment: statusComment,
        published_url: nextStatus === 'published' ? publishedUrl : null,
      });
      await reload();
      await stats.reload();
      const refreshed = await get<{ items: HistoryRow[] }>(
        `/studio/media/${selected.id}/history`,
      );
      setHistory(refreshed.items);
      setSelected({ ...selected, status: nextStatus });
      setStatusComment('');
      toast.push('Situação da mídia atualizada.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível atualizar.', 'error');
    }
  }

  const totals = stats.data?.totals ?? {};

  const columns: Column<MediaRow>[] = [
    {
      key: 'date',
      header: 'Culto',
      primary: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">
            {formatDate(row.service_date)}
            {row.service_time ? ` · ${formatTime(row.service_time)}` : ''}
          </p>
          <p className="truncate text-[11px] text-muted">
            {row.preacher ?? 'pregador não informado'} · {row.event_name ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      mobileHidden: true,
      render: (row) => <Badge>{row.record_type}</Badge>,
    },
    {
      key: 'people',
      header: 'Responsáveis',
      render: (row) => (
        <div className="text-[11.5px] text-muted">
          <p>ed. {row.editor_name ?? '—'}</p>
          <p>pub. {row.publisher_name ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (row) => <StatusBadge map={MEDIA_STATUS} value={row.status} />,
    },
    {
      key: 'platform',
      header: 'Publicação',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[11.5px] text-muted">
          {row.status === 'published' && row.platform ? row.platform : '—'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Gestão do Estúdio"
        title="Acervo de mídia"
        description="Ciclo de vida dos conteúdos gravados e transmitidos: edição, publicação e localização."
        actions={
          can('media.create') && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Novo registro
            </Button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(MEDIA_STATUS).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(status === key ? 'all' : key)}
            className={cx(
              'rounded-xl border px-3 py-2.5 text-left transition-colors',
              status === key
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface hover:border-ink/25',
            )}
          >
            <p
              className={cx(
                'text-[10px] uppercase tracking-wider2',
                status === key ? 'text-white/50' : 'text-muted',
              )}
            >
              {meta.label}
            </p>
            <p
              className={cx(
                'mt-1 text-[18px] font-semibold leading-none',
                status === key ? 'text-white' : 'text-ink',
              )}
            >
              {totals[key] ?? 0}
            </p>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Buscar por pregador ou evento…"
              className="sm:max-w-xs"
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                aria-label="De"
                className="sm:w-40"
              />
              <Input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                aria-label="Até"
                className="sm:w-40"
              />
            </div>
          </div>
          <FilterPills
            value={status}
            onChange={setStatus}
            items={[
              { value: 'all', label: 'Todas as situações' },
              ...Object.entries(MEDIA_STATUS).map(([value, meta]) => ({
                value,
                label: meta.label,
                count: totals[value] ?? 0,
              })),
            ]}
          />
        </div>

        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={openDetail}
          emptyTitle="Nenhum registro de mídia"
          emptyDescription="Registre os conteúdos para acompanhar edição e publicação."
        />

        <div className="border-t border-line px-4 py-2.5 text-[11.5px] text-muted">
          {data?.total ?? 0} conteúdos no acervo
        </div>
      </Card>

      {/* Novo registro */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title="Novo registro de mídia"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={create}>
              Criar registro
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data do culto" required>
              <Input
                type="date"
                value={form.service_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, service_date: event.target.value }))
                }
              />
            </Field>
            <Field label="Horário">
              <Input
                type="time"
                value={form.service_time}
                onChange={(event) =>
                  setForm((current) => ({ ...current, service_time: event.target.value }))
                }
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pregador">
              <Input
                value={form.preacher}
                onChange={(event) =>
                  setForm((current) => ({ ...current, preacher: event.target.value }))
                }
              />
            </Field>
            <Field label="Nome do evento">
              <Input
                value={form.event_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, event_name: event.target.value }))
                }
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tipo de registro">
              <Select
                value={form.record_type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, record_type: event.target.value }))
                }
              >
                {(options.data?.record_types ?? ['Gravação']).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Editor responsável">
              <Select
                value={form.editor_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, editor_id: event.target.value }))
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
            <Field label="Responsável pela publicação">
              <Select
                value={form.publisher_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, publisher_id: event.target.value }))
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
          <Field label="Observações">
            <Textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              rows={2}
            />
          </Field>
        </div>
      </Modal>

      {/* Detalhe */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={
          selected
            ? `Culto de ${formatDate(selected.service_date)}`
            : 'Registro de mídia'
        }
        description={
          selected
            ? `${selected.preacher ?? 'pregador não informado'} · ${selected.event_name ?? '—'}`
            : undefined
        }
        footer={
          <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
            Fechar
          </Button>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge map={MEDIA_STATUS} value={selected.status} />
              <Badge>{selected.record_type}</Badge>
              {selected.platform && <Badge tone="info">{selected.platform}</Badge>}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <dt className="mmv-label">Editor</dt>
                <dd className="mt-0.5">{selected.editor_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="mmv-label">Publicação</dt>
                <dd className="mt-0.5">{selected.publisher_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="mmv-label">Informado por</dt>
                <dd className="mt-0.5">{selected.reported_by_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="mmv-label">Atualizado em</dt>
                <dd className="mt-0.5">{formatDateTime(selected.updated_at)}</dd>
              </div>
            </dl>

            {selected.published_url && (
              <a
                href={selected.published_url}
                target="_blank"
                rel="noreferrer"
                className="block truncate rounded-lg bg-canvas px-3 py-2 text-[12px] text-studio hover:underline"
              >
                {selected.published_url}
              </a>
            )}

            {can('media.edit') && (
              <div className="rounded-xl border border-line p-4">
                <p className="mb-2 text-[12.5px] font-medium text-ink/80">
                  Alterar situação
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                  >
                    {Object.entries(MEDIA_STATUS).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={statusComment}
                    onChange={(event) => setStatusComment(event.target.value)}
                    placeholder="Comentário da alteração"
                  />
                </div>
                {nextStatus === 'published' && (
                  <Input
                    className="mt-2"
                    value={publishedUrl}
                    onChange={(event) => setPublishedUrl(event.target.value)}
                    placeholder="URL de publicação"
                  />
                )}
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    disabled={nextStatus === selected.status}
                    onClick={applyStatus}
                  >
                    Registrar alteração
                  </Button>
                </div>
              </div>
            )}

            <div>
              <p className="mmv-label mb-2">Histórico de situação</p>
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
                        <span className="text-ink">
                          {entry.from_status
                            ? `${MEDIA_STATUS[entry.from_status]?.label ?? entry.from_status} → ${MEDIA_STATUS[entry.to_status]?.label ?? entry.to_status}`
                            : MEDIA_STATUS[entry.to_status]?.label ?? entry.to_status}
                        </span>
                        <span className="text-muted">
                          {formatDateTime(entry.created_at)}
                        </span>
                      </div>
                      <p className="text-muted">
                        {entry.user_name ?? '—'}
                        {entry.comment ? ` · ${entry.comment}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                <Film className="h-3.5 w-3.5" />
                O histórico não é apagado quando a situação muda.
              </p>
            </div>

            {selected.notes && (
              <p className="rounded-lg bg-canvas px-3 py-2 text-[11.5px] text-muted">
                {selected.notes}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
