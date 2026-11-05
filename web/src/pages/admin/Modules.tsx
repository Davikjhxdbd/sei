import { useState } from 'react';
import { Boxes, Check, Pencil, Power } from 'lucide-react';
import { Shell } from '../../components/layout/Shell';
import { useApi } from '../../lib/useApi';
import { patch } from '../../lib/api';
import { ROLE_LABELS } from '../../lib/format';
import { moduleIcon } from '../../modules/registry';
import {
  Badge,
  Button,
  Card,
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

interface ModuleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  route: string;
  active: boolean;
  sort_order: number;
  allowed_roles: string[];
  settings: Record<string, unknown>;
  usage_events: number;
}

const ICON_OPTIONS = ['AudioLines', 'Clapperboard', 'Boxes', 'Film', 'ListChecks', 'Users'];

export default function ModulesPage() {
  const { data, loading, reload } = useApi<{ items: ModuleRow[] }>('/admin/modules');
  const toast = useToast();
  const [editing, setEditing] = useState<ModuleRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleActive(row: ModuleRow) {
    setBusy(row.id);
    try {
      await patch(`/admin/modules/${row.id}`, { active: !row.active });
      await reload();
      toast.push(
        row.active
          ? `${row.name} foi desativado e saiu da central.`
          : `${row.name} está ativo e já aparece para os cargos autorizados.`,
      );
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível alterar o módulo.', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Registro de módulos"
        description="A central de aplicativos é montada a partir desta tabela. Habilitar um módulo o publica automaticamente para os cargos autorizados — nenhuma alteração de código é necessária na central."
      />

      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(data?.items ?? []).map((row) => {
            const Icon = moduleIcon(row.icon);
            return (
              <Card key={row.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-xl text-white"
                      style={{ backgroundColor: row.color }}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-semibold text-ink">{row.name}</h2>
                        <Badge tone={row.active ? 'success' : 'neutral'}>
                          {row.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        {row.key} · {row.route}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Pencil}
                    onClick={() => setEditing(row)}
                    aria-label={`Editar ${row.name}`}
                  >
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                </div>

                <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                  {row.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {row.allowed_roles.map((role) => (
                    <Badge key={role} tone="accent">
                      {ROLE_LABELS[role] ?? role}
                    </Badge>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="text-[11px] text-muted">
                    ordem {row.sort_order} · {row.usage_events} eventos de auditoria
                  </span>
                  <Button
                    size="sm"
                    variant={row.active ? 'secondary' : 'primary'}
                    icon={row.active ? Power : Check}
                    loading={busy === row.id}
                    onClick={() => toggleActive(row)}
                  >
                    {row.active ? 'Desativar' : 'Habilitar'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-muted">
        <Boxes className="mt-0.5 h-4 w-4 shrink-0" />
        Módulos inativos permanecem registrados na plataforma, mas não aparecem na
        central e suas rotas ficam bloqueadas pelo servidor.
      </p>

      <ModuleForm
        module={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await reload();
          toast.push('Módulo atualizado.');
        }}
        onError={(message) => toast.push(message, 'error')}
      />
    </Shell>
  );
}

function ModuleForm({
  module,
  onClose,
  onSaved,
  onError,
}: {
  module: ModuleRow | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [initialized, setInitialized] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Boxes');
  const [color, setColor] = useState('#3B4FA0');
  const [sortOrder, setSortOrder] = useState(100);
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (module && initialized !== module.id) {
    setInitialized(module.id);
    setName(module.name);
    setDescription(module.description ?? '');
    setIcon(module.icon);
    setColor(module.color);
    setSortOrder(module.sort_order);
    setRoles(module.allowed_roles);
  }

  return (
    <Modal
      open={Boolean(module)}
      onClose={onClose}
      size="lg"
      title="Editar módulo"
      description="Identificação e regras de disponibilidade do aplicativo na central."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            loading={saving}
            disabled={!name.trim() || roles.length === 0}
            onClick={async () => {
              if (!module) return;
              setSaving(true);
              try {
                await patch(`/admin/modules/${module.id}`, {
                  name,
                  description,
                  icon,
                  color,
                  sort_order: sortOrder,
                  allowed_roles: roles,
                });
                onSaved();
              } catch (error: any) {
                onError(error?.message ?? 'Falha ao salvar.');
              } finally {
                setSaving(false);
              }
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome exibido" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Descrição">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ícone">
            <Select value={icon} onChange={(event) => setIcon(event.target.value)}>
              {ICON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cor">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-surface p-1"
                aria-label="Cor do módulo"
              />
              <Input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="flex-1"
              />
            </div>
          </Field>
          <Field label="Ordem">
            <Input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-[12.5px] font-medium text-ink/80">
            Cargos com acesso
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(ROLE_LABELS).map(([value, label]) => {
              const active = roles.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setRoles((current) =>
                      current.includes(value)
                        ? current.filter((role) => role !== value)
                        : [...current, value],
                    )
                  }
                  className={cx(
                    'flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[12.5px]',
                    active
                      ? 'border-ink bg-ink/[0.04] font-medium text-ink'
                      : 'border-line text-muted',
                  )}
                >
                  {label}
                  <span
                    className={cx(
                      'h-3.5 w-3.5 rounded-full border',
                      active ? 'border-ink bg-ink' : 'border-line',
                    )}
                  />
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            O administrador do sistema tem acesso a todos os módulos,
            independentemente desta lista.
          </p>
        </div>
      </div>
    </Modal>
  );
}
