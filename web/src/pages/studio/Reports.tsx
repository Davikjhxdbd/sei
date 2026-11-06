import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, FileText } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { post } from '../../lib/api';
import { REPORT_STATUS, formatDateTime, formatDayLabel } from '../../lib/format';
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
} from '../../components/ui';
import { RecordList, type Column } from '../../components/RecordList';
import { useToast } from '../../components/Toast';

interface ReportRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  event_id: string;
  event_name: string;
  starts_at: string;
  created_by_name: string | null;
  sections: number;
  sections_filled: number;
}

export default function Reports() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [eventId, setEventId] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    const suffix = params.toString();
    return `/studio/reports${suffix ? `?${suffix}` : ''}`;
  }, [status, q]);

  const { data, loading, reload } = useApi<{ items: ReportRow[] }>(query);
  const events = useApi<{ items: { id: string; name: string; starts_at: string }[] }>(
    '/studio/events?limit=100',
  );

  async function create() {
    setSaving(true);
    try {
      const result = await post<{ report: { id: string } }>('/studio/reports', {
        event_id: eventId,
        title: title || undefined,
      });
      setCreating(false);
      setTitle('');
      await reload();
      toast.push('Relatório criado com as seções padrão.');
      navigate(`/m/studio/reports/${result.report.id}`);
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível criar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<ReportRow>[] = [
    {
      key: 'title',
      header: 'Relatório',
      primary: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.title}</p>
          <p className="truncate text-[11.5px] text-muted">{row.event_name}</p>
        </div>
      ),
    },
    {
      key: 'event_date',
      header: 'Evento',
      render: (row) => (
        <span className="text-[12.5px] text-ink/75">
          {formatDayLabel(row.starts_at)}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Seções',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/[0.07]">
            <div
              className="h-full rounded-full bg-studio"
              style={{
                width: `${row.sections ? (row.sections_filled / row.sections) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted">
            {row.sections_filled}/{row.sections}
          </span>
        </div>
      ),
    },
    {
      key: 'author',
      header: 'Autor',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[12px] text-muted">{row.created_by_name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (row) => <StatusBadge map={REPORT_STATUS} value={row.status} />,
    },
    {
      key: 'updated',
      header: 'Atualizado',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[11.5px] text-muted">
          {formatDateTime(row.updated_at)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Gestão do Estúdio"
        title="Relatórios de eventos"
        description="Documentação formal por evento, com seções editáveis, autoria e fluxo de revisão."
        actions={
          can('reports.create') && (
            <Button icon={FilePlus2} onClick={() => setCreating(true)}>
              Novo relatório
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar por título ou evento…"
            className="sm:max-w-xs"
          />
          <FilterPills
            value={status}
            onChange={setStatus}
            items={[
              { value: 'all', label: 'Todos' },
              { value: 'draft', label: 'Rascunhos' },
              { value: 'in_review', label: 'Em revisão' },
              { value: 'finalized', label: 'Finalizados' },
            ]}
          />
        </div>

        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => navigate(`/m/studio/reports/${row.id}`)}
          emptyTitle="Nenhum relatório encontrado"
          emptyDescription="Relatórios são criados a partir de um evento e já nascem com as seções padrão."
        />
      </Card>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo relatório"
        description="As seções padrão são criadas automaticamente a partir das configurações do módulo."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} disabled={!eventId} onClick={create}>
              Criar relatório
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Evento" required>
            <Select value={eventId} onChange={(event) => setEventId(event.target.value)}>
              <option value="">Selecione…</option>
              {(events.data?.items ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} — {formatDayLabel(event.starts_at)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Título" hint="opcional">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Deixe em branco para usar o nome do evento"
            />
          </Field>
          <p className="flex items-start gap-2 rounded-lg bg-canvas px-3 py-2 text-[11.5px] text-muted">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            O relatório nasce como rascunho. A finalização exige revisão de outra
            pessoa com autoridade.
          </p>
        </div>
      </Modal>
    </div>
  );
}
