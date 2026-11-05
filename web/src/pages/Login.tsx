import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button, Field, InlineError, Input } from '../components/ui';

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      {/* Painel de identidade */}
      <div className="relative hidden overflow-hidden bg-strong lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="mmv-grid-pattern absolute inset-0 opacity-70" aria-hidden />
        <div
          className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(circle at center, rgba(176,133,67,0.55), transparent 65%)',
          }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brass text-[14px] font-bold text-white">
            MV
          </span>
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider2 text-white">
              MMV Connect
            </p>
            <p className="text-[10.5px] uppercase tracking-wider2 text-white/40">
              Plataforma operacional
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-wider2 text-brass-soft">
            Um acesso · uma identidade
          </p>
          <h1 className="font-display text-[38px] leading-[1.1] text-white">
            Uma plataforma para todos os aplicativos da operação.
          </h1>
          <p className="mt-5 text-[13.5px] leading-relaxed text-white/60">
            A central reúne os aplicativos disponíveis para o seu perfil. A
            mesma sessão, o mesmo cadastro e as mesmas permissões acompanham você
            em cada módulo.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              'Autenticação única e conta gerenciada pela administração',
              'Hierarquia de cargos e setores compartilhada',
              'Notificações e auditoria em toda a plataforma',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brass-soft" />
                <span className="text-[12.5px] leading-relaxed text-white/70">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] uppercase tracking-wider2 text-white/30">
          Acesso restrito à equipe autorizada
        </p>
      </div>

      {/* Formulário */}
      <div className="flex flex-col justify-center bg-canvas px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-strong text-[12px] font-bold text-white">
              MV
            </span>
            <span className="text-[12.5px] font-semibold uppercase tracking-wider2 text-ink">
              MMV Connect
            </span>
          </div>

          <p className="mmv-label mb-2">Acesso à plataforma</p>
          <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] text-ink">
            Entrar na sua conta
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Use as credenciais fornecidas pela administração do MMV Connect.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            <Field label="Nome de usuário" required htmlFor="username">
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  id="username"
                  className="pl-9"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="seu.usuario"
                  required
                />
              </div>
            </Field>

            <Field label="Senha" required htmlFor="password">
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  id="password"
                  className="pl-9 pr-10"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            {error && <InlineError>{error}</InlineError>}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={submitting}
              disabled={!username.trim() || !password}
            >
              Entrar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-[11.5px] leading-relaxed text-muted">
            O cadastro é controlado. Contas são criadas e liberadas por
            administradores autorizados — não existe autocadastro público.
          </p>

          {import.meta.env.DEV && (
            <div className="mt-8 rounded-xl border border-line bg-surface/70 p-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider2 text-muted">
                Ambiente de demonstração
              </p>
              <div className="mt-2 space-y-1 text-[11.5px] text-ink/70">
                <p>
                  Administrador:{' '}
                  <code className="rounded bg-canvas px-1 py-0.5">davi.gomes</code>{' '}
                  /{' '}
                  <code className="rounded bg-canvas px-1 py-0.5">
                    MMVconnect#2026
                  </code>
                </p>
                <p className="text-muted">
                  Outros perfis: helena.duarte, rafael.prado, camila.ferreira,
                  bruno.alves, juliana.reis, tiago.moraes — mesma senha.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
