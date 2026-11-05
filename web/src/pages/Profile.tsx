import { useEffect, useState, type FormEvent } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Film,
  KeyRound,
  UserRound,
} from 'lucide-react';
import { Shell } from '../components/layout/Shell';
import { useApi } from '../lib/useApi';
import { useAuth } from '../lib/auth';
import { patch, post } from '../lib/api';
import {
  AUTH_STATUS,
  ROLE_LABELS,
  formatDate,
  formatDateTime,
  formatDayLabel,
} from '../lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  StatCard,
  StatusBadge,
} from '../components/ui';
import { useToast } from '../components/Toast';

interface ProfilePayload {
  user: {
    id: string;
    full_name: string;
    username: string;
    email: string | null;
    status: string;
    roles: string[];
    sectors: { id: string; name: string; is_lead: boolean }[];
    created_at: string;
    last_login_at: string | null;
  };
  stats: {
    tasks_done: number;
    tasks_pending: number;
    tasks_blocked: number;
    readiness_confirmed: number;
    assignments: number;
    problems_identified: number;
    media_handled: number;
    reports_authored: number;
  };
  upcoming: {
    id: string;
    role_title: string;
    call_time: string | null;
    event_name: string;
    starts_at: string;
  }[];
}

export default function Profile() {
  const { data, loading, reload } = useApi<ProfilePayload>('/profile');
  const { refresh } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setFullName(data.user.full_name);
      setEmail(data.user.email ?? '');
    }
  }, [data?.user.id, data?.user.full_name, data?.user.email]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await patch('/auth/profile', { full_name: fullName, email: email || null });
      await reload();
      await refresh();
      toast.push('Perfil atualizado.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (next !== confirm) {
      toast.push('A confirmação não corresponde à nova senha.', 'error');
      return;
    }
    setChanging(true);
    try {
      await post('/auth/password', {
        current_password: current,
        new_password: next,
      });
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.push('Senha alterada com sucesso.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível alterar a senha.', 'error');
    } finally {
      setChanging(false);
    }
  }

  if (loading || !data) {
    return (
      <Shell>
        <LoadingBlock label="Carregando perfil…" />
      </Shell>
    );
  }

  const { user, stats, upcoming } = data;

  return (
    <Shell>
      <PageHeader
        eyebrow="Plataforma"
        title="Meu perfil"
        description="Identidade única compartilhada por todos os aplicativos do MMV Connect."
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <Avatar name={user.full_name} size="lg" className="bg-brass" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[18px] font-semibold text-ink">
                    {user.full_name}
                  </h2>
                  <StatusBadge map={AUTH_STATUS} value={user.status} />
                </div>
                <p className="text-[12.5px] text-muted">
                  @{user.username}
                  {user.email ? ` · ${user.email}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.roles.map((role) => (
                    <Badge key={role} tone="accent">
                      {ROLE_LABELS[role] ?? role}
                    </Badge>
                  ))}
                  {user.sectors.map((sector) => (
                    <Badge key={sector.id}>
                      {sector.name}
                      {sector.is_lead ? ' · liderança' : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4 text-[12px] sm:grid-cols-3">
              <div>
                <p className="mmv-label">Conta criada</p>
                <p className="mt-1 text-ink/80">{formatDate(user.created_at)}</p>
              </div>
              <div>
                <p className="mmv-label">Último acesso</p>
                <p className="mt-1 text-ink/80">
                  {user.last_login_at ? formatDateTime(user.last_login_at) : '—'}
                </p>
              </div>
              <div>
                <p className="mmv-label">Setores</p>
                <p className="mt-1 text-ink/80">{user.sectors.length}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Dados pessoais"
              description="Estas informações aparecem em todos os módulos da plataforma."
              icon={UserRound}
            />
            <form onSubmit={saveProfile} className="space-y-4 p-5">
              <Field label="Nome completo" required>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </Field>
              <Field label="E-mail" hint="Opcional">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@exemplo.com"
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" loading={saving} size="sm">
                  Salvar alterações
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Segurança"
              description="Altere a senha de acesso à plataforma."
              icon={KeyRound}
            />
            <form onSubmit={changePassword} className="space-y-4 p-5">
              <Field label="Senha atual" required>
                <Input
                  type="password"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nova senha" hint="mín. 8 caracteres" required>
                  <Input
                    type="password"
                    value={next}
                    onChange={(event) => setNext(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </Field>
                <Field label="Confirmar nova senha" required>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" size="sm" loading={changing}>
                  Alterar senha
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Tarefas concluídas"
              value={stats.tasks_done}
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              label="Tarefas pendentes"
              value={stats.tasks_pending}
              icon={ClipboardList}
              tone="warning"
            />
            <StatCard
              label="Prontidão confirmada"
              value={stats.readiness_confirmed}
              icon={CalendarClock}
              tone="info"
            />
            <StatCard
              label="Designações ativas"
              value={stats.assignments}
              icon={CalendarClock}
            />
            <StatCard
              label="Problemas identificados"
              value={stats.problems_identified}
              icon={ClipboardList}
            />
            <StatCard
              label="Mídias acompanhadas"
              value={stats.media_handled}
              icon={Film}
            />
          </div>

          <Card>
            <CardHeader
              title="Próximas designações"
              description="Escalas publicadas ou em rascunho atribuídas a você."
              icon={CalendarClock}
            />
            {upcoming.length === 0 ? (
              <p className="px-5 py-6 text-[12.5px] text-muted">
                Nenhuma designação futura registrada.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((item) => (
                  <li key={item.id} className="px-5 py-3">
                    <p className="text-[13px] font-medium text-ink">
                      {item.role_title}
                    </p>
                    <p className="text-[11.5px] text-muted">
                      {item.event_name} · {formatDayLabel(item.starts_at)}
                      {item.call_time ? ` · apresentação ${item.call_time.slice(0, 5)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-[11.5px] leading-relaxed text-muted">
              Seus dados, cargos e setores são únicos na plataforma. Alterações
              administrativas em cargos e situação da conta são registradas na
              auditoria.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
