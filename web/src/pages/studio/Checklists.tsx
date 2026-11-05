import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { patch, post } from '../../lib/api';
import { formatDayLabel, formatDateTime } from '../../lib/format';
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
  Textarea,
  cx,
} from '../../components/ui';
import { useToast } from '../../components/Toast';

interface RunRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  event_id: string;
  event_name: string;
  starts_at: string;
  tasks_total: number;
  tasks_done: number;
  tasks_blocked: number;
}

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sector_id: string | null;
  sector_name: string | null;
  item_count: number;
}

interface TemplateItem {
  title: string;
  description: string | null;
}

export default function Checklists() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<'runs' | 'templates'>('runs');

  const runs = useApi<{ items: RunRow[] }>('/studio/checklist-runs');
  const templates = useApi<{ items: TemplateRow[] }>('/studio/checklist-templates');
  const events = useApi<{ items: { id: string; name: string; starts_at: string }[] }>(
    '/studio/events?status=scheduled',
  );
  const sectors = useApi<{ items: { id: string; name: string }[] }>('/catalog/sectors');

  const [runOpen, setRunOpen] = useState(false);
  const [eventId, setEventId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [creatingRun, setCreatingRun] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | 'new' | null>(null);
  const [initialized, setInitialized] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [active, setActive] = useState(true);
  const [items, setItems] = useState<TemplateItem[]>([{ title: '', description: '' }]);
  const [saving, setSaving] = useState(false);

  const key = editingTemplate === 'new' ? 'new' : (editingTemplate?.id ?? null);
  if (key !== initialized) {
    setInitialized(key);
    if (editingTemplate && editingTemplate !== 'new') {
      setName(editingTemplate.name);
      setDescription(editingTemplate.description ?? '');
      setSectorId(editingTemplate.sector_id ?? '');
      setActive(editingTemplate.active);
      setItems([{ title: '', description: '' }]);
      fetch(`/api/studio/checklist-templates/${editingTemplate.id}`)
        .then((response) => response.json())
        .then((payload) => {
          const loaded: TemplateItem[] = (payload.items ?? []).map((item: any) => ({
            title: item.title,
            description: item.description ?? '',
          }));
          if (loaded.length) setItems(loaded);
        })
        .catch(() => undefined);
    } else {
      setName('');
      setDescription('');
      setSectorId('');
      setActive(true);
      setItems([{ title: '', description: '' }]);
    }
  }

  const activeTemplates = useMemo(
    () => (templates.data?.items ?? []).filter((item) => item.active),
    [templates.data],
  );

  async function createRun() {
    setCreatingRun(true);
    try {
      const result = await post<{ run: { id: string } }>('/studio/checklist-runs', {
        event_id: eventId,
        template_id: templateId,
      });
      setRunOpen(false);
      setEventId('');
      setTemplateId('');
      await runs.reload();
      toast.push('Execução criada.');
      navigate(`/m/studio/checklists/runs/${result.run.id}`);
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível criar.', 'error');
    } finally {
      setCreatingRun(false);
    }
  }

  async function saveTemplate() {
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        sector_id: sectorId || null,
        active,
        items: items.filter((item) => item.title.trim()),
      };
      if (editingTemplate === 'new') await post('/studio/checklist-templates', payload);
      else if (editingTemplate)
        await patch(`/studio/checklist-templates/${editingTemplate.id}`, payload);
      setEditingTemplate(null);
      await templates.reload();
      toast.push('Modelo salvo.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Gestão do Estúdio"
        title="Checklists"
        description="Modelos reutilizáveis e execuções por evento, com histórico completo de cada tarefa."
        actions={
          can('checklists.run') && (
            <Button
              icon={Plus}
              onClick={() => {
                setEventId(events.data?.items[0]?.id ?? '');
                setTemplateId(activeTemplates[0]?.id ?? '');
                setRunOpen(true);
              }}
            >
              Nova execução
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-1.5">
        {[
          { value: 'runs', label: 'Execuções' },
          { value: 'templates', label: 'Modelos' },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value as 'runs' | 'templates')}
            className={cx(
              'rounded-full border px-3 py-1.5 text-[12.5px] font-medium',
              tab === item.value
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface text-muted',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'runs' ? (
        <Card className="overflow-hidden">
          <CardHeader
            icon={ListChecks}
            title="Execuções por evento"
            description="Progresso calculado a partir das tarefas registradas."
          />
          {runs.loading ? (
            <LoadingBlock />
          ) : !runs.data?.items.length ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma execução"
              description="Crie uma execução a partir de um modelo para começar."
            />
          ) : (
            <ul className="divide-y divide-line">
              {runs.data.items.map((run) => {
                const progress = run.tasks_total
                  ? Math.round((run.tasks_done / run.tasks_total) * 100)
                  : 0;
                return (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/m/studio/checklists/runs/${run.id}`)}
                      className="w-full px-5 py-3.5 text-left hover:bg-ink/[0.02]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13.5px] font-medium text-ink">
                          {run.name}
                        </span>
                        <span className="text-[11.5px] text-muted">
                          {run.event_name} · {formatDayLabel(run.starts_at)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] tabular-nums text-muted">
                          {run.tasks_done}/{run.tasks_total}
                        </span>
                        {run.tasks_blocked > 0 && (
                          <Badge tone="warning">{run.tasks_blocked} bloqueada(s)</Badge>
                        )}
                        <Badge tone={run.status === 'completed' ? 'success' : 'neutral'}>
                          {run.status === 'completed'
                            ? 'Concluída'
                            : run.status === 'cancelled'
                              ? 'Cancelada'
                              : 'Em aberto'}
                        </Badge>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {can('checklists.manage') && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                icon={Plus}
                onClick={() => setEditingTemplate('new')}
              >
                Novo modelo
              </Button>
            </div>
          )}
          {templates.loading ? (
            <LoadingBlock />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(templates.data?.items ?? []).map((template) => (
                <Card key={template.id} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-semibold text-ink">
                          {template.name}
                        </h3>
                        <Badge tone={template.active ? 'success' : 'neutral'}>
                          {template.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {template.sector_name ?? 'sem setor'} ·{' '}
                        {template.item_count} itens
                      </p>
                    </div>
                    {can('checklists.manage') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Pencil}
                        onClick={() => setEditingTemplate(template)}
                        aria-label={`Editar ${template.name}`}
                      />
                    )}
                  </div>
                  {template.description && (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                      {template.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title="Nova execução de checklist"
        description="A execução copia os itens do modelo para o evento escolhido."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRunOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={creatingRun}
              disabled={!eventId || !templateId}
              onClick={createRun}
            >
              Criar execução
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
          <Field label="Modelo" required>
            <Select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
            >
              <option value="">Selecione…</option>
              {activeTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.item_count} itens)
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingTemplate)}
        onClose={() => setEditingTemplate(null)}
        size="lg"
        title={editingTemplate === 'new' ? 'Novo modelo' : 'Editar modelo'}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditingTemplate(null)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} disabled={!name.trim()} onClick={saveTemplate}>
              Salvar modelo
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome" required>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Setor responsável">
              <Select value={sectorId} onChange={(event) => setSectorId(event.target.value)}>
                <option value="">Nenhum</option>
                {(sectors.data?.items ?? []).map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Descrição">
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-ink/80">Itens do checklist</p>
              <Button
                size="sm"
                variant="ghost"
                icon={Plus}
                onClick={() =>
                  setItems((current) => [...current, { title: '', description: '' }])
                }
              >
                Adicionar item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="rounded-lg border border-line p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2.5 w-4 shrink-0 text-center text-[11px] text-muted">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.title}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry, position) =>
                              position === index
                                ? { ...entry, title: event.target.value }
                                : entry,
                            ),
                          )
                        }
                        placeholder="Título do item"
                      />
                      <Textarea
                        value={item.description ?? ''}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry, position) =>
                              position === index
                                ? { ...entry, description: event.target.value }
                                : entry,
                            ),
                          )
                        }
                        placeholder="Descrição / critério de conclusão"
                        rows={2}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Remover item"
                      onClick={() =>
                        setItems((current) =>
                          current.filter((_, position) => position !== index),
                        )
                      }
                      className="mt-2 grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12.5px] text-ink/80">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="h-3.5 w-3.5 accent-[#0E1A2B]"
            />
            Modelo disponível para novas execuções
          </label>

          {editingTemplate && editingTemplate !== 'new' && (
            <p className="text-[11px] text-muted">
              Alterações no modelo não afetam execuções já criadas — cada execução
              mantém suas próprias tarefas e histórico.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
