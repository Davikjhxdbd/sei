import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  Pencil,
  Plus,
  Users2,
  XCircle,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { patch, post } from '../../lib/api';
import {
  ASSIGNMENT_STATUS,
  EVENT_STATUS,
  READINESS,
  REPORT_STATUS,
  SEVERITY,
  ERROR_STATUS,
  formatDateTime,
  formatTime,
  toDateTimeInput,
} from '../../lib/format';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/ui';
import { useToast } from '../../components/Toast';

interface Payload {
  event: {
    id: string;
    name: string;
    type: string;
    starts_at: string;
    ends_at: string | null;
    notes: string | null;
    status: string;
    created_by_name: string | null;
    created_at: string;
  };
  runs: {
    id: string;
    name: string;
    status: string;
    tasks_total: number;
    tasks_done: number;
    tasks_blocked: number;
  }[];
  reports: {
    id: string;
    title: string;
    status: string;
    created_by_name: string | null;
    updated_at: string;
  }[];
  errors: {
    id: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    occurred_at: string;
  }[];
  assignments: {
    id: string;
    role_title: string;
    status: string;
    call_time: string | null;
    user_name: string | null;
    sector_name: string | null;
    readiness: string | null;
  }[];
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { data, loading, reload } = useApi<Payload>(`/studio/events/${id}`);
  const templates = useApi<{ items: { id: string; name: string; active: boolean }[] }>(
    '/studio/checklist-templates',
  );

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  const [runOpen, setRunOpen] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [creatingRun, setCreatingRun] = useState(false);

  if (loading || !data) return <LoadingBlock label="Carregando evento…" />;
  const { event } = data;

  if (!initialized) {
    setInitialized(true);
    setName(event.name);
    setType(event.type);
    setStartsAt(toDateTimeInput(event.starts_at));
    setEndsAt(toDateTimeInput(event.ends_at));
    setNotes(event.notes ?? '');
  }

  async function saveEvent() {
    setSaving(true);
    try {
      await patch(`/studio/events/${event.id}`, {
        name,
        type,
        starts_at: startsAt,
        ends_at: endsAt || null,
        notes,
      });
      setEditOpen(false);
      await reload();
      toast.push('Evento atualizado.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: 'completed' | 'cancelled') {
    try {
      await post(`/studio/events/${event.id}/status`, { status });
      await reload();
      toast.push(
        status === 'completed' ? 'Evento concluído.' : 'Evento cancelado.',
      );
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível alterar.', 'error');
    }
  }

  async function createRun() {
    setCreatingRun(true);
    try {
      const result = await post<{ run: { id: string } }>('/studio/checklist-runs', {
        event_id: event.id,
        template_id: templateId,
      });
      setRunOpen(false);
      toast.push('Execução de checklist criada.');
      navigate(`/m/studio/checklists/runs/${result.run.id}`);
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível criar a execução.', 'error');
    } finally {
      setCreatingRun(false);
    }
  }

  async function createReport() {
    try {
      const result = await post<{ report: { id: string } }>('/studio/reports', {
        event_id: event.id,
      });
      toast.push('Relatório criado com as seções padrão.');
      navigate(`/m/studio/reports/${result.report.id}`);
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível criar o relatório.', 'error');
    }
  }

  const finished = event.status !== 'scheduled';

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/m/studio/events')}
        className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Eventos
      </button>

      <PageHeader
        eyebrow={`${event.type} · ${formatDateTime(event.starts_at)}`}
        title={event.name}
        description={event.notes ?? undefined}
        actions={
          <>
            <StatusBadge map={EVENT_STATUS} value={event.status} />
            {can('events.edit') && !finished && (
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            )}
            {can('events.manage') && event.status === 'scheduled' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={() => changeStatus('completed')}
                >
                  Concluir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={XCircle}
                  onClick={() => changeStatus('cancelled')}
                >
                  Cancelar
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={ListChecks}
              title="Checklists do evento"
              description="Execuções geradas a partir dos modelos do estúdio."
              action={
                can('checklists.run') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() => {
                      setTemplateId(
                        templates.data?.items.filter((item) => item.active)[0]?.id ?? '',
                      );
                      setRunOpen(true);
                    }}
                  >
                    Nova execução
                  </Button>
                )
              }
            />
            {data.runs.length === 0 ? (
              <EmptyState
                compact
                icon={ClipboardList}
                title="Nenhum checklist iniciado"
                description="Crie uma execução a partir de um modelo para acompanhar a operação."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.runs.map((run) => {
                  const progress = run.tasks_total
                    ? Math.round((run.tasks_done / run.tasks_total) * 100)
                    : 0;
                  return (
                    <li key={run.id}>
                      <Link
                        to={`/m/studio/checklists/runs/${run.id}`}
                        className="block px-5 py-3 hover:bg-ink/[0.02]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-ink">
                            {run.name}
                          </span>
                          <span className="text-[11.5px] text-muted">
                            {run.tasks_done}/{run.tasks_total} concluídas
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {run.tasks_blocked > 0 && (
                          <p className="mt-1.5 text-[11px] text-amber-700">
                            {run.tasks_blocked} tarefa(s) bloqueada(s)
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={FileText}
              title="Relatórios"
              description="Documentação formal do evento, com seções e revisão."
              action={
                can('reports.create') && (
                  <Button size="sm" variant="secondary" icon={Plus} onClick={createReport}>
                    Criar relatório
                  </Button>
                )
              }
            />
            {data.reports.length === 0 ? (
              <EmptyState
                compact
                icon={FileText}
                title="Nenhum relatório criado"
                description="O relatório organiza abertura, execução, ocorrências e avaliação."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.reports.map((report) => (
                  <li key={report.id}>
                    <Link
                      to={`/m/studio/reports/${report.id}`}
                      className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-ink/[0.02]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-ink">
                          {report.title}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {report.created_by_name ?? '—'} · atualizado em{' '}
                          {formatDateTime(report.updated_at)}
                        </span>
                      </span>
                      <StatusBadge map={REPORT_STATUS} value={report.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={XCircle}
              title="Erros operacionais"
              description="Acontecimentos identificados durante a operação deste evento."
              action={
                <Link
                  to="/m/studio/errors"
                  className="text-[12px] font-medium text-studio hover:underline"
                >
                  Área de erros
                </Link>
              }
            />
            {data.errors.length === 0 ? (
              <EmptyState compact title="Nenhum erro registrado" />
            ) : (
              <ul className="divide-y divide-line">
                {data.errors.map((error) => (
                  <li key={error.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{error.category}</Badge>
                      <StatusBadge map={SEVERITY} value={error.severity} />
                      <StatusBadge map={ERROR_STATUS} value={error.status} />
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-ink/80">
                      {error.description}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatDateTime(error.occurred_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={Users2}
              title="Escalas do evento"
              description="Pessoas designadas por posto de trabalho."
              action={
                <Link
                  to="/m/studio/schedules"
                  className="text-[12px] font-medium text-studio hover:underline"
                >
                  Gerenciar
                </Link>
              }
            />
            {data.assignments.length === 0 ? (
              <EmptyState
                compact
                icon={Users2}
                title="Sem designações"
                description="Monte a escala deste evento na área de escalas."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.assignments.map((assignment) => (
                  <li key={assignment.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-ink">
                          {assignment.role_title}
                        </p>
                        <p className="truncate text-[11.5px] text-muted">
                          {assignment.user_name ?? 'sem responsável'}
                          {assignment.sector_name
                            ? ` · ${assignment.sector_name}`
                            : ''}
                        </p>
                        {assignment.call_time && (
                          <p className="text-[11px] text-muted">
                            apresentação {formatTime(assignment.call_time)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge map={ASSIGNMENT_STATUS} value={assignment.status} />
                        {assignment.readiness && (
                          <StatusBadge map={READINESS} value={assignment.readiness} />
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="mmv-label mb-2">Informações do registro</p>
            <dl className="space-y-2 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Criado por</dt>
                <dd className="text-ink/80">{event.created_by_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Criado em</dt>
                <dd className="text-ink/80">{formatDateTime(event.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Início</dt>
                <dd className="text-ink/80">{formatDateTime(event.starts_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Término</dt>
                <dd className="text-ink/80">
                  {event.ends_at ? formatDateTime(event.ends_at) : '—'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar evento"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={saveEvent}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome" required>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <Input value={type} onChange={(event) => setType(event.target.value)} />
            </Field>
            <Field label="Observações">
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
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
            <Field label="Término">
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title="Nova execução de checklist"
        description="As tarefas são copiadas do modelo escolhido e podem ser atribuídas depois."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRunOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={creatingRun}
              disabled={!templateId}
              onClick={createRun}
            >
              Criar execução
            </Button>
          </>
        }
      >
        <Field label="Modelo de checklist" required>
          <Select
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            <option value="">Selecione…</option>
            {(templates.data?.items ?? [])
              .filter((item) => item.active)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
