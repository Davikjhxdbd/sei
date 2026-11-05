import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { post } from '../../lib/api';
import { PROBLEM_STATUS, SEVERITY, formatDate, formatDateTime } from '../../lib/format';
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

interface ProblemRow {
  id: string;
  code: string;
  title: string;
  status: string;
  urgency: string;
  priority: string;
  impact: string | null;
  identified_at: string;
  resolution_due: string | null;
  created_at: string;
  sector_name: string | null;
  owner_name: string | null;
  identified_by_name: string | null;
  updates_count: number;
  pending_authorizations: number;
}

export default function Problems() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('open_all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const sectors = useApi<{ items: { id: string; name: string }[] }>('/catalog/sectors');
  const people = useApi<{ items: { id: string; full_name: string }[] }>('/catalog/people');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== 'open_all' && status !== 'all') params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    const suffix = params.toString();
    return `/studio/problems${suffix ? `?${suffix}` : ''}`;
  }, [status, q]);

  const { data, loading, reload } = useApi<{ items: ProblemRow[] }>(query);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [category, setCategory] = useState('');
  const [impact, setImpact] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [priority, setPriority] = useState('medium');
  const [ownerId, setOwnerId] = useState('');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const result = await post<{ problem: { id: string } }>('/studio/problems', {
        title,
        description,
        sector_id: sectorId || null,
        category,
        impact,
        urgency,
        priority,
        owner_id: ownerId || null,
        resolution_due: due || null,
      });
      setCreating(false);
      setTitle('');
      setDescription('');
      await reload();
      toast.push('Problema registrado.');
      navigate(`/m/studio/problems/${result.problem.id}`);
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível registrar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const visible = (data?.items ?? []).filter((row) => {
    if (status === 'open_all')
      return !['resolved', 'cancelled'].includes(row.status);
    return true;
  });

  const columns: Column<ProblemRow>[] = [
    {
      key: 'title',
      header: 'Problema',
      primary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10.5px] text-muted">{row.code}</span>
            <span className="truncate font-medium text-ink">{row.title}</span>
          </div>
          <p className="truncate text-[11px] text-muted">
            {row.sector_name ?? 'sem setor'} · {row.owner_name ?? 'sem responsável'}
          </p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Prioridade',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge map={SEVERITY} value={row.priority} />
          {row.pending_authorizations > 0 && (
            <Badge tone="warning">{row.pending_authorizations} autorização</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'identified',
      header: 'Identificado',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[12px] text-muted">
          {formatDate(row.identified_at)} · {row.identified_by_name ?? '—'}
        </span>
      ),
    },
    {
      key: 'updates',
      header: 'Andamento',
      render: (row) => (
        <span className="text-[11.5px] text-muted">
          {row.updates_count} atualizações
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (row) => <StatusBadge map={PROBLEM_STATUS} value={row.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Gestão do Estúdio"
        title="Problemas"
        description="Questões estruturais que exigem investigação, causa confirmada, solução e autorização."
        actions={
          can('problems.create') && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Novo problema
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar por código, título ou descrição…"
            className="sm:max-w-xs"
          />
          <FilterPills
            value={status}
            onChange={setStatus}
            items={[
              { value: 'open_all', label: 'Em aberto' },
              { value: 'awaiting_authorization', label: 'Autorização' },
              { value: 'in_progress', label: 'Execução' },
              { value: 'resolved', label: 'Resolvidos' },
              { value: 'all', label: 'Todos' },
            ]}
          />
        </div>

        <RecordList
          items={visible}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => navigate(`/m/studio/problems/${row.id}`)}
          emptyTitle="Nenhum problema nesta visão"
          emptyDescription="Problemas nascem de erros recorrentes ou de análise da operação."
        />
      </Card>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title="Registrar problema"
        description="O código é gerado automaticamente na plataforma."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={saving}
              disabled={!title.trim() || !description.trim()}
              onClick={create}
            >
              Registrar problema
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Título" required>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Descrição" required>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Qual é a questão estrutural identificada?"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Setor">
              <Select
                value={sectorId}
                onChange={(event) => setSectorId(event.target.value)}
              >
                <option value="">Sem setor</option>
                {(sectors.data?.items ?? []).map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Categoria">
              <Input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Ex.: Processo, Equipamento…"
              />
            </Field>
          </div>
          <Field label="Impacto">
            <Input value={impact} onChange={(event) => setImpact(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Urgência">
              <Select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
                {Object.entries(SEVERITY).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prioridade">
              <Select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {Object.entries(SEVERITY).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Responsável pelo acompanhamento">
              <Select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                <option value="">Eu mesmo</option>
                {(people.data?.items ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prazo da solução">
              <Input
                type="date"
                value={due}
                onChange={(event) => setDue(event.target.value)}
              />
            </Field>
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-canvas px-3 py-2 text-[11.5px] text-muted">
            <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Registrado em {formatDateTime(new Date().toISOString())} por você. O
            histórico de atualizações é preservado integralmente.
          </p>
        </div>
      </Modal>
    </div>
  );
}
