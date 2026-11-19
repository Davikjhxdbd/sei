import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  History,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { get, patch } from '../../lib/api';
import { TASK_STATUS, formatDateTime, formatDayLabel } from '../../lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  cx,
} from '../../components/ui';
import { useToast } from '../../components/Toast';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  notes: string | null;
  block_reason: string | null;
  sector_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  completed_at: string | null;
  completed_by_name: string | null;
}

interface Payload {
  run: {
    id: string;
    name: string;
    status: string;
    event_id: string;
    event_name: string;
    starts_at: string;
    created_at: string;
  };
  tasks: TaskRow[];
}

interface HistoryRow {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  created_at: string;
  user_name: string | null;
}

const HISTORY_LABELS: Record<string, string> = {
  'task.created': 'Tarefa criada',
  'task.completed': 'Concluída',
  'task.blocked': 'Bloqueada',
  'task.reopened': 'Reaberta',
  'task.reassigned': 'Responsável alterado',
};

export default function ChecklistRun() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can, user } = useAuth();
  const { data, loading, reload } = useApi<Payload>(`/studio/checklist-runs/${id}`);
  const people = useApi<{ items: { id: string; full_name: string }[] }>('/catalog/people');

  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [notes, setNotes] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('pending');
  const [busy, setBusy] = useState(false);

  if (loading || !data) return <LoadingBlock label="Carregando checklist…" />;

  const done = data.tasks.filter((task) => task.status === 'done').length;
  const progress = data.tasks.length ? Math.round((done / data.tasks.length) * 100) : 0;

  async function openTask(task: TaskRow) {
    setSelected(task);
    setNotes(task.notes ?? '');
    setBlockReason(task.block_reason ?? '');
    setAssignee(task.assignee_id ?? '');
    setStatus(task.status);
    setHistory([]);
    try {
      const payload = await get<{ items: HistoryRow[] }>(
        `/studio/checklist-tasks/${task.id}/history`,
      );
      setHistory(payload.items);
    } catch {
      setHistory([]);
    }
  }

  async function toggleDone(task: TaskRow) {
    try {
      await patch(`/studio/checklist-tasks/${task.id}`, {
        status: task.status === 'done' ? 'pending' : 'done',
      });
      await reload();
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível atualizar a tarefa.', 'error');
    }
  }

  async function saveTask() {
    if (!selected) return;
    if (status === 'blocked' && !blockReason.trim()) {
      toast.push('Informe o motivo do bloqueio.', 'error');
      return;
    }
    setBusy(true);
    try {
      await patch(`/studio/checklist-tasks/${selected.id}`, {
        status,
        notes,
        block_reason: status === 'blocked' ? blockReason : null,
        ...(can('checklists.assign') ? { assignee_id: assignee || null } : {}),
      });
      setSelected(null);
      await reload();
      toast.push('Tarefa atualizada.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const canEditTask = (task: TaskRow) =>
    can('checklists.assign') || !task.assignee_id || task.assignee_id === user?.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/m/studio/checklists')}
        className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Checklists
      </button>

      <PageHeader
        eyebrow={`${data.run.event_name} · ${formatDayLabel(data.run.starts_at)}`}
        title={data.run.name}
        description="Marque as tarefas conforme a conferência avança. Cada alteração gera histórico."
        actions={
          <>
            <Badge tone={data.run.status === 'completed' ? 'success' : 'neutral'}>
              {data.run.status === 'completed' ? 'Concluída' : 'Em aberto'}
            </Badge>
            <Link
              to={`/m/studio/events/${data.run.event_id}`}
              className="inline-flex h-8 items-center rounded-lg border border-line bg-surface px-3 text-[12px] font-medium text-ink hover:border-ink/30"
            >
              Ver evento
            </Link>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[12px] tabular-nums text-muted">
            {done}/{data.tasks.length} concluídas
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {data.tasks.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa nesta execução"
            description="O modelo utilizado não possuía itens."
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.tasks.map((task) => (
              <li
                key={task.id}
                className={cx(
                  'flex items-start gap-3 px-4 py-3.5 sm:px-5',
                  task.status === 'blocked' && 'bg-amber-50/40',
                )}
              >
                <button
                  type="button"
                  onClick={() => (canEditTask(task) ? toggleDone(task) : openTask(task))}
                  aria-label={
                    task.status === 'done'
                      ? `Reabrir ${task.title}`
                      : `Concluir ${task.title}`
                  }
                  className={cx(
                    'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
                    task.status === 'done'
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-line text-transparent hover:border-ink/40',
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => openTask(task)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cx(
                        'text-[13.5px]',
                        task.status === 'done'
                          ? 'text-muted line-through'
                          : 'font-medium text-ink',
                      )}
                    >
                      {task.title}
                    </span>
                    <StatusBadge map={TASK_STATUS} value={task.status} />
                  </div>
                  {task.description && (
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                      {task.description}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-3 w-3" />
                      {task.assignee_name ?? 'sem responsável'}
                    </span>
                    {task.sector_name && <span>{task.sector_name}</span>}
                    {task.completed_at && (
                      <span className="text-emerald-700">
                        concluída em {formatDateTime(task.completed_at)}
                      </span>
                    )}
                  </p>
                  {task.status === 'blocked' && task.block_reason && (
                    <p className="mt-1.5 rounded-md bg-amber-100/70 px-2 py-1 text-[11.5px] text-amber-900">
                      Bloqueio: {task.block_reason}
                    </p>
                  )}
                </button>

                {can('checklists.assign') && task.status !== 'done' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={CircleSlash}
                    aria-label={`Bloquear ${task.title}`}
                    onClick={() => {
                      openTask(task);
                      setStatus('blocked');
                    }}
                  >
                    <span className="hidden lg:inline">Bloquear</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected?.title ?? 'Tarefa'}
        description={selected?.description ?? undefined}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
              Fechar
            </Button>
            <Button size="sm" loading={busy} onClick={saveTask}>
              Salvar tarefa
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Situação">
              <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="pending">Pendente</option>
                <option value="done">Concluída</option>
                <option value="blocked">Bloqueada</option>
              </Select>
            </Field>
            <Field
              label="Responsável"
              hint={can('checklists.assign') ? undefined : 'somente liderança'}
            >
              <Select
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                disabled={!can('checklists.assign')}
              >
                <option value="">Sem responsável</option>
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
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Informações registradas durante a execução"
            />
          </Field>

          {status === 'blocked' && (
            <Field label="Motivo do bloqueio" required>
              <Textarea
                value={blockReason}
                onChange={(event) => setBlockReason(event.target.value)}
                rows={2}
              />
            </Field>
          )}

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-ink/80">
              <History className="h-3.5 w-3.5" /> Histórico da tarefa
            </p>
            {history.length === 0 ? (
              <p className="text-[12px] text-muted">Nenhuma alteração registrada.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-line px-3 py-2 text-[11.5px]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-ink">
                        {HISTORY_LABELS[entry.action] ?? entry.action}
                      </span>
                      <span className="text-muted">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-muted">
                      {entry.user_name ?? 'sistema'}
                      {entry.from_status
                        ? ` · ${TASK_STATUS[entry.from_status]?.label ?? entry.from_status} → ${TASK_STATUS[entry.to_status ?? '']?.label ?? entry.to_status}`
                        : ''}
                      {entry.notes ? ` · ${entry.notes}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected?.status === 'done' && !can('checklists.assign') && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <RotateCcw className="h-3.5 w-3.5" /> Reabrir uma tarefa concluída exige
              liderança.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
