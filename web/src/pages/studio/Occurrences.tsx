import { useMemo, useState } from 'react';
import { Gavel, Plus, ShieldAlert } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { post, patch } from '../../lib/api';
import { OCCURRENCE_STATUS, formatDateTime, formatDayLabel } from '../../lib/format';
import {
  Badge,
  Button,
  Card,
  Field,
  FilterPills,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/ui';
import { RecordList, type Column } from '../../components/RecordList';
import { useToast } from '../../components/Toast';

interface OccurrenceRow {
  id: string;
  person_name: string;
  type: string;
  description: string;
  action_taken: string | null;
  penalty: string | null;
  status: string;
  created_at: string;
  event_id: string | null;
  event_name: string | null;
  created_by_name: string | null;
}

export default function Occurrences() {
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const options = useApi<Record<string, string[]>>('/catalog/options');
  const events = useApi<{ items: { id: string; name: string; starts_at: string }[] }>(
    '/studio/events?limit=100',
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    const suffix = params.toString();
    return `/studio/occurrences${suffix ? `?${suffix}` : ''}`;
  }, [status, q]);

  const { data, loading, reload } = useApi<{ items: OccurrenceRow[] }>(query);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OccurrenceRow | null>(null);
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState('Atraso');
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [penalty, setPenalty] = useState('');
  const [statusValue, setStatusValue] = useState('registered');
  const [saving, setSaving] = useState(false);

  function reset() {
    setPersonName('');
    setType(options.data?.occurrence_types?.[0] ?? 'Atraso');
    setDescription('');
    setEventId('');
    setActionTaken('');
    setPenalty('');
    setStatusValue('registered');
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        person_name: personName,
        type,
        description,
        event_id: eventId || null,
        action_taken: actionTaken,
        penalty,
        status: statusValue,
      };
      if (editing) await patch(`/studio/occurrences/${editing.id}`, payload);
      else await post('/studio/occurrences', payload);
      setOpen(false);
      setEditing(null);
      reset();
      await reload();
      toast.push(editing ? 'Ocorrência atualizada.' : 'Ocorrência registrada.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<OccurrenceRow>[] = [
    {
      key: 'person',
      header: 'Pessoa',
      primary: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.person_name}</p>
          <p className="truncate text-[11px] text-muted">{row.description}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (row) => <Badge>{row.type}</Badge>,
    },
    {
      key: 'event',
      header: 'Evento',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[12px] text-muted">{row.event_name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (row) => <StatusBadge map={OCCURRENCE_STATUS} value={row.status} />,
    },
    {
      key: 'created',
      header: 'Registrada em',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[11.5px] text-muted">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Gestão do Estúdio · restrito"
        title="Ocorrências administrativas"
        description="Registros envolvendo pessoas da equipe. O acesso é limitado à liderança e o conteúdo é de natureza administrativa."
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              reset();
              setEditing(null);
              setOpen(true);
            }}
          >
            Nova ocorrência
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar por pessoa ou descrição…"
            className="sm:max-w-xs"
          />
          <FilterPills
            value={status}
            onChange={setStatus}
            items={[
              { value: 'all', label: 'Todas' },
              { value: 'registered', label: 'Registradas' },
              { value: 'under_review', label: 'Em análise' },
              { value: 'closed', label: 'Encerradas' },
            ]}
          />
        </div>

        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => {
            setEditing(row);
            setOpen(true);
            setPersonName(row.person_name);
            setType(row.type);
            setDescription(row.description);
            setEventId(row.event_id ?? '');
            setActionTaken(row.action_taken ?? '');
            setPenalty(row.penalty ?? '');
            setStatusValue(row.status);
          }}
          emptyTitle="Nenhuma ocorrência registrada"
          emptyDescription="Registros administrativos preservam autoria e histórico."
        />
      </Card>

      <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-muted">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Estes registros não são expostos a perfis sem autorização. Toda alteração de
        situação fica registrada na auditoria da plataforma.
      </p>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        size="lg"
        title={editing ? 'Editar ocorrência' : 'Nova ocorrência'}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={saving}
              disabled={!personName.trim() || !description.trim()}
              onClick={save}
            >
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da pessoa" required>
              <Input
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
              />
            </Field>
            <Field label="Tipo de ocorrência" required>
              <Select value={type} onChange={(event) => setType(event.target.value)}>
                {(options.data?.occurrence_types ?? ['Atraso']).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Descrição" required>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Evento relacionado">
              <Select
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
              >
                <option value="">Sem evento</option>
                {(events.data?.items ?? []).map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} — {formatDayLabel(event.starts_at)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Situação">
              <Select
                value={statusValue}
                onChange={(event) => setStatusValue(event.target.value)}
              >
                {Object.entries(OCCURRENCE_STATUS).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ação tomada">
              <Textarea
                value={actionTaken}
                onChange={(event) => setActionTaken(event.target.value)}
                rows={2}
              />
            </Field>
            <Field label="Medida aplicada" hint="quando pertinente">
              <Textarea
                value={penalty}
                onChange={(event) => setPenalty(event.target.value)}
                rows={2}
              />
            </Field>
          </div>

          {editing && (
            <p className="flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-[11.5px] text-muted">
              <Gavel className="h-3.5 w-3.5" />
              Registrada por {editing.created_by_name ?? '—'} em{' '}
              {formatDateTime(editing.created_at)}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
