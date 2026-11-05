import { useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, UserPlus, Users as UsersIcon } from 'lucide-react';
import { Shell } from '../../components/layout/Shell';
import { useApi } from '../../lib/useApi';
import { patch, post } from '../../lib/api';
import { AUTH_STATUS, ROLE_LABELS, formatDate, formatDateTime } from '../../lib/format';
import {
  Avatar,
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
  cx,
} from '../../components/ui';
import { RecordList, type Column } from '../../components/RecordList';
import { useToast } from '../../components/Toast';

interface UserRow {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  status: string;
  roles: string[];
  sectors: { id: string; name: string; is_lead: boolean }[];
  created_at: string;
  last_login_at: string | null;
}

interface SectorOption {
  id: string;
  name: string;
  active: boolean;
}

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status !== 'all') params.set('status', status);
    const suffix = params.toString();
    return `/admin/users${suffix ? `?${suffix}` : ''}`;
  }, [q, status]);

  const { data, loading, reload } = useApi<{ items: UserRow[]; total: number }>(query);
  const sectors = useApi<{ items: SectorOption[] }>('/catalog/sectors');
  const toast = useToast();

  const [editing, setEditing] = useState<UserRow | 'new' | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'Pessoa',
      primary: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.full_name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.full_name}</p>
            <p className="truncate text-[11.5px] text-muted">@{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Cargos',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <Badge key={role} tone="accent">
              {ROLE_LABELS[role] ?? role}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'sectors',
      header: 'Setores',
      mobileHidden: true,
      render: (row) =>
        row.sectors.length ? (
          <span className="text-[12.5px] text-ink/70">
            {row.sectors.map((sector) => sector.name).join(', ')}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (row) => <StatusBadge map={AUTH_STATUS} value={row.status} />,
    },
    {
      key: 'last_login',
      header: 'Último acesso',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[12px] text-muted">
          {row.last_login_at ? formatDateTime(row.last_login_at) : 'nunca'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={Pencil}
            aria-label={`Editar ${row.full_name}`}
            onClick={(event) => {
              event.stopPropagation();
              setEditing(row);
            }}
          >
            <span className="hidden lg:inline">Editar</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={KeyRound}
            aria-label={`Redefinir senha de ${row.full_name}`}
            onClick={(event) => {
              event.stopPropagation();
              setResetTarget(row);
              setResetPassword('');
            }}
          >
            <span className="hidden lg:inline">Senha</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Usuários"
        description="Identidade única de cada pessoa. Cargos e situação da conta são válidos em todos os aplicativos."
        actions={
          <Button icon={UserPlus} onClick={() => setEditing('new')}>
            Novo usuário
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar por nome, usuário ou e-mail…"
            className="sm:max-w-xs"
          />
          <FilterPills
            value={status}
            onChange={setStatus}
            items={[
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Ativas' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'suspended', label: 'Suspensas' },
              { value: 'inactive', label: 'Inativas' },
            ]}
          />
        </div>

        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => setEditing(row)}
          emptyTitle="Nenhum usuário encontrado"
          emptyDescription="Ajuste os filtros ou cadastre uma nova pessoa."
        />

        <div className="border-t border-line px-4 py-2.5 text-[11.5px] text-muted">
          {data?.total ?? 0} contas na plataforma ·{' '}
          {data?.items.filter((row) => row.status === 'active').length ?? 0}{' '}
          ativas nesta listagem
        </div>
      </Card>

      <UserFormModal
        target={editing}
        sectors={sectors.data?.items ?? []}
        onClose={() => setEditing(null)}
        onSaved={async (mode) => {
          setEditing(null);
          await reload();
          toast.push(
            mode === 'new' ? 'Usuário criado com sucesso.' : 'Usuário atualizado.',
          );
        }}
        onError={(message) => toast.push(message, 'error')}
      />

      <Modal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title="Redefinir senha"
        description={
          resetTarget
            ? `${resetTarget.full_name} · as sessões abertas serão encerradas.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setResetTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={resetPassword.length < 8}
              onClick={async () => {
                if (!resetTarget) return;
                try {
                  await post(`/admin/users/${resetTarget.id}/password`, {
                    password: resetPassword,
                  });
                  toast.push('Senha redefinida.');
                  setResetTarget(null);
                } catch (error: any) {
                  toast.push(error?.message ?? 'Falha ao redefinir.', 'error');
                }
              }}
            >
              Redefinir
            </Button>
          </>
        }
      >
        <Field label="Nova senha" hint="mín. 8 caracteres" required>
          <Input
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
            placeholder="••••••••"
          />
        </Field>
      </Modal>
    </Shell>
  );
}

function UserFormModal({
  target,
  sectors,
  onClose,
  onSaved,
  onError,
}: {
  target: UserRow | 'new' | null;
  sectors: SectorOption[];
  onClose: () => void;
  onSaved: (mode: 'new' | 'edit') => void;
  onError: (message: string) => void;
}) {
  const isNew = target === 'new';
  const user = target && target !== 'new' ? target : null;

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('active');
  const [roles, setRoles] = useState<string[]>(['member']);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [leadSectors, setLeadSectors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState<string | null>(null);

  const key = target === 'new' ? 'new' : (target?.id ?? null);
  if (key !== initialized) {
    setInitialized(key);
    if (user) {
      setFullName(user.full_name);
      setUsername(user.username);
      setEmail(user.email ?? '');
      setStatus(user.status);
      setRoles(user.roles);
      setSelectedSectors(user.sectors.map((sector) => sector.id));
      setLeadSectors(
        user.sectors.filter((sector) => sector.is_lead).map((sector) => sector.id),
      );
    } else {
      setFullName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setStatus('active');
      setRoles(['member']);
      setSelectedSectors([]);
      setLeadSectors([]);
    }
  }

  function toggle(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  async function submit() {
    setSaving(true);
    try {
      if (isNew) {
        await post('/admin/users', {
          full_name: fullName,
          username,
          email: email || null,
          password,
          status,
          roles,
          sectors: selectedSectors,
          lead_sectors: leadSectors,
        });
      } else if (user) {
        await patch(`/admin/users/${user.id}`, {
          full_name: fullName,
          email: email || null,
          status,
          roles,
          sectors: selectedSectors,
          lead_sectors: leadSectors,
        });
      }
      onSaved(isNew ? 'new' : 'edit');
    } catch (error: any) {
      onError(error?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      size="lg"
      title={isNew ? 'Novo usuário' : 'Editar usuário'}
      description={
        isNew
          ? 'A conta nasce com as credenciais definidas aqui e pode ser liberada imediatamente.'
          : 'Alterações de cargos e situação são registradas na auditoria.'
      }
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            loading={saving}
            icon={isNew ? Plus : undefined}
            disabled={!fullName.trim() || (isNew && (!username.trim() || password.length < 8))}
            onClick={submit}
          >
            {isNew ? 'Criar usuário' : 'Salvar alterações'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" required>
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nome e sobrenome"
            />
          </Field>
          <Field label="Nome de usuário" required={isNew} hint="minúsculas">
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              disabled={!isNew}
              placeholder="nome.sobrenome"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail" hint="opcional">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nome@exemplo.com"
            />
          </Field>
          <Field label="Situação da conta">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              {Object.entries(AUTH_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {isNew && (
          <Field label="Senha inicial" hint="mín. 8 caracteres" required>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>
        )}

        <div>
          <p className="mb-2 text-[12.5px] font-medium text-ink/80">Cargos globais</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_OPTIONS.map(([value, label]) => {
              const active = roles.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRoles(toggle(roles, value))}
                  className={cx(
                    'flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors',
                    active
                      ? 'border-strong bg-strong/[0.04] font-medium text-ink'
                      : 'border-line text-muted hover:border-ink/30',
                  )}
                >
                  {label}
                  <span
                    className={cx(
                      'h-3.5 w-3.5 rounded-full border',
                      active ? 'border-strong bg-strong' : 'border-line',
                    )}
                  />
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            O nível de autoridade efetivo é o mais alto entre os cargos atribuídos.
          </p>
        </div>

        <div>
          <p className="mb-2 text-[12.5px] font-medium text-ink/80">Setores</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sectors.map((sector) => {
              const active = selectedSectors.includes(sector.id);
              return (
                <div
                  key={sector.id}
                  className={cx(
                    'rounded-lg border px-3 py-2 text-[12.5px]',
                    active ? 'border-ink/40 bg-ink/[0.02]' : 'border-line',
                  )}
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() =>
                        setSelectedSectors((current) => toggle(current, sector.id))
                      }
                      className="h-3.5 w-3.5 accent-ink"
                    />
                    <span className={active ? 'text-ink' : 'text-muted'}>
                      {sector.name}
                    </span>
                  </label>
                  {active && (
                    <label className="mt-1.5 flex items-center gap-1.5 pl-5 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={leadSectors.includes(sector.id)}
                        onChange={() =>
                          setLeadSectors((current) => toggle(current, sector.id))
                        }
                        className="h-3 w-3 accent-brass"
                      />
                      liderança neste setor
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {!isNew && user && (
          <p className="rounded-lg bg-canvas px-3 py-2 text-[11.5px] text-muted">
            Criado em {formatDate(user.created_at)} · último acesso{' '}
            {user.last_login_at ? formatDateTime(user.last_login_at) : '—'}
          </p>
        )}
      </div>
    </Modal>
  );
}
