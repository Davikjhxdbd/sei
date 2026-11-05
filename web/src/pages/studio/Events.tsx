import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarPlus, Clock } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { post } from '../../lib/api';
import { EVENT_STATUS, formatDayLabel, formatTime } from '../../lib/format';
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

interface EventRow {
  id: string;
  name: string;
  type: string;
  starts_at: string;
  ends_at: string | null;
  notes: string | null;
  status: string;
  created_by_name: string | null;
  checklist_runs: number;
  reports: number;
  assignments: number;
}

export default function Events() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('scheduled');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    const suffix = params.toString();
    return `/studio/events${suffix ? `?${suffix}` : ''}`;
  }, [status, q]);

  const { data, loading, reload } = useApi<{ items: EventRow[]; total: number }>(query);
  const options = useApi<Record<string, string[]>>('/catalog/options');

  const [name, setName] = useState('');
  const [type, setType] = useState('Culto');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName('');
    setType(options.data?.event_types?.[0] ?? 'Culto');
    setStartsAt('');
    setEndsAt('');
    setNotes('');
  }

  async function create() {
    setSaving(true);
    try {
      const result = await post<{ event: { id: string } }>('/studio/events', {
        name,
        type,
        starts_at: startsAt,
        ends_at: endsAt || null,
        notes,
      });
      setCreating(false);
      resetForm();
      await reload();
      toast.push('Evento cadastrado.');
      navigate(`/m/studio/events/${result.event.id}`);
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível cadastrar o evento.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<EventRow>[] = [
    {
      key: 'name',
      header: 'Evento',
      primary: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{row.name}</span>
          <Badge>{row.type}</Badge>
        </div>
      ),
    },
    {
      key: 'when',
      header: 'Data e horário',
      render: (row) => (
        <div className="text-[12.5px]">
          <p className="text-ink/85">{formatDayLabel(row.starts_at)}</p>
          <p className="text-[11.5px] text-muted">
            {formatTime(row.starts_at)}
            {row.ends_at ? ` – ${formatTime(row.ends_at)}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'structure',
      header: 'Estrutura',
      mobileHidden: true,
      render: (row) => (
        <div className="flex gap-1.5 text-[11px] text-muted">
          <span className="rounded bg-ink/[0.05] px-1.5 py-0.5">
            {row.assignments} escalas
          </span>
          <span className="rounded bg-ink/[0.05] px-1.5 py-0.5">
            {row.checklist_runs} checklists
          </span>
          <span className="rounded bg-ink/[0.05] px-1.5 py-0.5">
            {row.reports} relatórios
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (row) => <StatusBadge map={EVENT_STATUS} value={row.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Gestão do Estúdio"
        title="Eventos"
        description="Agenda oficial do estúdio. Cada evento concentra escalas, checklists, relatórios e erros operacionais."
        actions={
          can('events.create') && (
            <Button icon={CalendarPlus} onClick={() => setCreating(true)}>
              Novo evento
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar por nome do evento…"
            className="sm:max-w-xs"
          />
          <FilterPills
            value={status}
            onChange={setStatus}
            items={[
              { value: 'scheduled', label: 'Agendados' },
              { value: 'completed', label: 'Concluídos' },
              { value: 'cancelled', label: 'Cancelados' },
              { value: 'all', label: 'Todos' },
            ]}
          />
        </div>

        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => navigate(`/m/studio/events/${row.id}`)}
          emptyTitle="Nenhum evento nesta situação"
          emptyDescription="Cadastre um novo evento ou ajuste os filtros."
        />
      </Card>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo evento"
        description="O evento passa a estar disponível para escalas, checklists e relatórios."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={saving}
              disabled={!name.trim() || !startsAt}
              onClick={create}
            >
              Cadastrar evento
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome do evento" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Culto da Manhã"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <Select value={type} onChange={(event) => setType(event.target.value)}>
                {(options.data?.event_types ?? ['Culto']).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Observações" hint="opcional">
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Informações de apoio"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Início" required>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </Field>
            <Field label="Término" hint="opcional">
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </Field>
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-canvas px-3 py-2 text-[11.5px] leading-relaxed text-muted">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Eventos recorrentes podem ser cadastrados a partir dos presets na área
            de administração do módulo.
          </p>
        </div>
      </Modal>
    </div>
  );
}
