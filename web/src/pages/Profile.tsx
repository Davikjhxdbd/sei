import { useEffect, useState, type FormEvent } from 'react';
import {
  CalendarClock,
  Camera,
  Sparkles,
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
import { PushNotifications } from '../components/PushNotifications';
import { PushNotifications } from '../components/PushNotifications';

interface ProfilePayload {
  user: {
    id: string;
    full_name: string;
    username: string;
    email: string | null;
    avatar_url: string | null;
    profile_emoji: string | null;
    profile_bio: string | null;
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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileEmoji, setProfileEmoji] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [saving, setSaving] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setFullName(data.user.full_name);
      setEmail(data.user.email ?? '');
      setAvatarUrl(data.user.avatar_url ?? '');
      setProfileEmoji(data.user.profile_emoji ?? '');
      setProfileBio(data.user.profile_bio ?? '');
    }
  }, [data?.user.id, data?.user.full_name, data?.user.email]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await patch('/auth/profile', { full_name: fullName, email: email || null, avatar_url: avatarUrl || null, profile_emoji: profileEmoji || null, profile_bio: profileBio || null });
      await reload();
      await refresh();
      toast.push('Perfil atualizado.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }


  async function chooseAvatar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.push('Escolha um arquivo de imagem.', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.push('A imagem precisa ter até 8 MB.', 'error');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível processar a imagem.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      let imageData = canvas.toDataURL('image/jpeg', 0.78);
      if (imageData.length > 440000) imageData = canvas.toDataURL('image/jpeg', 0.62);
      if (imageData.length > 450000) {
        toast.push('Essa imagem ficou muito pesada. Escolha outra foto.', 'error');
        return;
      }
      setAvatarUrl(imageData);
      setProfileEmoji('');
      toast.push('Foto pronta. Salve as alterações para publicar no seu perfil.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível carregar essa foto.', 'error');
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
              <Avatar name={user.full_name} size="lg" className="bg-brass" avatarUrl={user.avatar_url} emoji={user.profile_emoji} />
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

              <div className="rounded-xl border border-line bg-canvas/60 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={fullName || user.full_name} size="lg" className="bg-brass" avatarUrl={avatarUrl || null} emoji={profileEmoji || null} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">Sua identidade</p>
                    <p className="text-[11.5px] text-muted">Escolha uma foto ou um avatar que tenha a sua cara.</p>
                  </div>
                  <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-brass/30 bg-surface px-3 text-[12px] font-medium text-ink transition-colors hover:bg-brass/[0.08]">
                    <Camera className="h-4 w-4" /> Foto
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => { void chooseAvatar(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Escolher avatar">
                  {['🎬','📸','🎨','🎧','🎛️','✨','🌟','🚀','🦁','🎮','💡','🤍'].map((emoji) => (
                    <button key={emoji} type="button" onClick={() => { setProfileEmoji(emoji); setAvatarUrl(''); }} aria-label={'Usar avatar ' + emoji} aria-pressed={profileEmoji === emoji && !avatarUrl} className={'grid h-9 w-9 place-items-center rounded-full border text-lg transition-colors ' + (profileEmoji === emoji && !avatarUrl ? 'border-brass bg-brass/15 ring-2 ring-brass/20' : 'border-line bg-surface hover:border-brass/50')}>
                      {emoji}
                    </button>
                  ))}
                  {(avatarUrl || profileEmoji) && (
                    <button type="button" onClick={() => { setAvatarUrl(''); setProfileEmoji(''); }} className="rounded-full px-3 text-[11px] text-muted hover:bg-ink/5 hover:text-ink">Remover</button>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1 text-[10.5px] text-muted"><Sparkles className="h-3 w-3" /> A foto e o avatar aparecem no menu e nas áreas da plataforma.</p>
              </div>
              <Field label="Nome de exibição" required>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </Field>
              <Field label="Sua frase" hint="Opcional · até 80 caracteres">
                <Input value={profileBio} onChange={(event) => setProfileBio(event.target.value.slice(0, 80))} maxLength={80} placeholder="Ex.: Criando com propósito ✨" />
              </Field>
              <Field label="E-mail" hint="Opcional">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@exemplo.com"
                />
              </Field>
              <p className="text-[11px] text-muted">Seu identificador de acesso é @{user.username} e não muda ao editar o nome de exibição.</p>
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
          <PushNotifications />
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
