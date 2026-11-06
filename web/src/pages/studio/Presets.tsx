import { useState } from 'react';
import { CalendarClock, Pencil, Plus } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { patch, post } from '../../lib/api';
import { WEEKDAYS } from '../../lib/format';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from '../../components/ui';
import { RecordList, type Column } from '../../components/RecordList';
import { useToast } from '../../components/Toast';

interface PresetRow {
  id: string;
  name: string;
  type: string;
  weekday: number;
  start_time: string;
  end_time: string | null;
  notes: string | null;
  active: boolean;
}

function timeValue(value?: string | null) {
  return value ? String(value).slice(0, 5) : '';
}

export default function Presets() {
  const { can } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useApi<{ items: PresetRow[] }>('/studio/presets');
  const options = useApi<Record<string, string[]>>('/catalog/options');

  const [editing, setEditing] = useState<PresetRow | 'new' | null>(null);
  const [initialized, setInitialized] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('Culto');
  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const key = editing === 'new' ? 'new' : (editing?.id ?? null);
  if (key !== initialized) {
    setInitialized(key);
    if (editing && editing !== 'new') {
      setName(editing.name);
      setType(editing.type);
      setWeekday(editing.weekday);
      setStartTime(timeValue(editing.start_time));
      setEndTime(timeValue(editing.end_time));
      setNotes(editing.notes ?? '');
      setActive(editing.active);
    } else {
      setName('');
      setType('Culto');
      setWeekday(0);
      setStartTime('09:00');
      setEndTime('');
      setNotes('');
      setActive(true);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name,
        type,
        weekday,
        start_time: startTime,
        end_time: endTime || null,
        notes,
        active,
      };
      if (editing === 'new') await post('/studio/presets', payload);
      else if (editing) await patch(`/studio/presets/${editing.id}`, payload);
      await reload();
      setEditing(null);
      toast.push('Preset salvo.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<PresetRow>[] = [
    {
      key: 'name',
      header: 'Preset',
      primary: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{row.name}</span>
          <Badge>{row.type}</Badge>
        </div>
      ),
    },
    {
      key: 'weekday',
      header: 'Dia',
      render: (row) => (
        <span className="text-[12.5px] text-ink/80">{WEEKDAYS[row.weekday]}</span>
      ),
    },
    {
      key: 'time',
      header: 'Horário',
      render: (row) => (
        <span className="text-[12.5px] text-ink/80">
          {timeValue(row.start_time)}
          {row.end_time ? ` – ${timeValue(row.end_time)}` : ''}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Observações',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[12px] text-muted">{row.notes ?? '—'}</span>
      ),
    },
    {
      key: 'active',
      header: 'Situação',
      render: (row) => (
        <Badge tone={row.active ? 'success' : 'neutral'}>
          {row.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Gestão do Estúdio"
        title="Presets de eventos"
        description="Modelos de eventos recorrentes que evitam preenchimento repetitivo ao cadastrar a agenda."
        actions={
          can('presets.manage') && (
            <Button icon={Plus} onClick={() => setEditing('new')}>
              Novo preset
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={can('presets.manage') ? (row) => setEditing(row) : undefined}
          emptyTitle="Nenhum preset cadastrado"
          emptyDescription="Presets configuram dia da semana, horário e observações padrão."
        />
      </Card>

      {!can('presets.manage') && (
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted">
          <CalendarClock className="h-3.5 w-3.5" />
          A administração de presets é restrita à liderança do estúdio.
        </p>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Novo preset' : 'Editar preset'}
        description="Usado como referência ao montar a agenda recorrente do estúdio."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} disabled={!name.trim()} onClick={save}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" required>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Tipo">
              <Select value={type} onChange={(event) => setType(event.target.value)}>
                {(options.data?.event_types ?? ['Culto']).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Dia da semana">
              <Select
                value={String(weekday)}
                onChange={(event) => setWeekday(Number(event.target.value))}
              >
                {WEEKDAYS.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Horário inicial" required>
              <Input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </Field>
            <Field label="Horário final">
              <Input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </Field>
          <label className="flex items-center gap-2 text-[12.5px] text-ink/80">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="h-3.5 w-3.5 accent-ink"
            />
            Preset ativo
          </label>
        </div>
      </Modal>
    </div>
  );
}
