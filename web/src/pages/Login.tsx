import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
} from 'lucide-react';
import { useAuth, startWelcomeAudio, stopWelcomeAudio } from '../lib/auth';
import { post } from '../lib/api';
import { Button, Field, InlineError, Input } from '../components/ui';

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryHelp, setShowRecoveryHelp] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const welcomeAudio = startWelcomeAudio();

    try {
      await login(username.trim(), password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err: any) {
      stopWelcomeAudio(welcomeAudio);
      setError(err?.message ?? 'Não foi possível entrar. Verifique suas credenciais.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onRecoverySubmit(event: FormEvent) {
    event.preventDefault();
    setRecoveryError('');
    setRecoveryLoading(true);

    try {
      await post('/auth/forgot-password', { email: recoveryEmail.trim() });
      setRecoverySent(true);
    } catch (err: any) {
      setRecoveryError(err?.message || 'Não foi possível processar a solicitação.');
    } finally {
      setRecoveryLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0D10] px-5 py-10 sm:px-8 lg:justify-end lg:px-[10%]">
      {/* VÍDEO CINEMATOGRÁFICO DE FUNDO */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/site/login-hero.png"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      >
        <source src="/site/SITE.mp4" type="video/mp4" />
      </video>

      {/* CAMADA DE LEITURA */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,12,.28),rgba(5,7,12,.68))]"
        aria-hidden="true"
      />

      {/* IDENTIDADE MMV CONNECT */}
      <div className="absolute left-7 top-7 z-10 flex items-center gap-3 sm:left-10 sm:top-9">
        <div className="grid h-11 w-11 place-items-center rounded-[12px] border border-[#8D9EFF]/40 bg-[#0B0D10]/80 shadow-[0_8px_28px_rgba(0,0,0,.3)] backdrop-blur-md">
          <svg viewBox="0 0 64 64" className="h-8 w-8" fill="none" aria-hidden="true">
            <path d="M12 47V18L32 37L52 18V47" stroke="#DCE1FF" strokeWidth="3.2" strokeLinecap="square" strokeLinejoin="round" />
            <path d="M32 37V10" stroke="#8D9EFF" strokeWidth="3.2" strokeLinecap="square" />
            <circle cx="32" cy="9" r="3.2" fill="#F4F5F6" />
            <circle cx="12" cy="18" r="2.3" fill="#8D9EFF" />
            <circle cx="52" cy="18" r="2.3" fill="#8D9EFF" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-semibold tracking-[0.2em] text-white">MMV<span className="text-[#8D9EFF]">/</span>CONNECT</p>
          <p className="mt-1.5 text-[8px] font-medium tracking-[0.24em] text-white/45">PLATAFORMA INTEGRADA</p>
        </div>
      </div>

      {/* PAINEL DE LOGIN SOBRE A IMAGEM */}
      <section className="relative z-20 w-full max-w-[420px] rounded-2xl border border-white/15 bg-[#111111]/85 px-7 py-9 shadow-[0_25px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:px-10 sm:py-11">
        <div className="mb-7">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#C6CEFF]">
            Área de acesso
          </p>
          <h2 className="font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-[50px]">
            Seja bem-vindo.
          </h2>
          <p className="mt-4 text-[15px] leading-6 text-white/65">
            Entre com suas credenciais para acessar a plataforma.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field label="Nome de usuário" required htmlFor="username">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8D9EFF]/70" />
              <Input
                id="username"
                className="h-12 border-white/15 bg-white/[0.06] pl-10 text-white placeholder:text-white/30 focus:border-[#8D9EFF]"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Seu nome de usuário"
                required
              />
            </div>
          </Field>

          <Field label="Senha" required htmlFor="password">
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8D9EFF]/70" />
              <Input
                id="password"
                className="h-12 border-white/15 bg-white/[0.06] pl-10 pr-11 text-white placeholder:text-white/30 focus:border-[#8D9EFF]"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-white/40 transition hover:text-[#C6CEFF]"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>

          <div className="-mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setShowRecoveryHelp((value) => !value)}
              aria-expanded={showRecoveryHelp}
              className="text-[13px] font-semibold text-[#C6CEFF] transition hover:text-[#8D9EFF] hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>

          {showRecoveryHelp && (
            <div className="rounded-xl border border-[#8D9EFF]/30 bg-[#8D9EFF]/[0.08] p-4">
              {recoverySent ? (
                <>
                  <p className="text-sm font-semibold text-[#C6CEFF]">
                    Verifique seu e-mail
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-white/65">
                    Se o endereço estiver cadastrado, você receberá as instruções
                    para redefinir sua senha. Confira também a caixa de spam.
                  </p>
                </>
              ) : (
                <form onSubmit={onRecoverySubmit}>
                  <p className="text-sm font-semibold text-[#C6CEFF]">
                    Recuperar acesso
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-white/65">
                    Informe o e-mail vinculado à sua conta. Enviaremos um link
                    seguro para criar uma nova senha.
                  </p>
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    value={recoveryEmail}
                    onChange={(event) => setRecoveryEmail(event.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="mt-3 h-11 border-white/15 bg-white/[0.06] text-white placeholder:text-white/30 focus:border-[#8D9EFF]"
                  />
                  {recoveryError && (
                    <p role="alert" className="mt-2 text-[12px] text-red-300">
                      {recoveryError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={recoveryLoading || !recoveryEmail.trim()}
                    className="mt-3 h-11 w-full rounded-lg border border-[#8D9EFF]/50 bg-[#171717] text-[13px] font-semibold text-[#C6CEFF] transition hover:bg-[#252525] disabled:opacity-50"
                  >
                    {recoveryLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </button>
                </form>
              )}
            </div>
          )}

          {error && <InlineError>{error}</InlineError>}

          <Button
            type="submit"
            size="lg"
            className="mt-4 h-14 w-full justify-center gap-3 text-[15px] font-semibold border border-[#8D9EFF]/50 bg-[#171717] !text-[#C6CEFF] hover:!bg-[#252525] hover:!text-[#C6CEFF] active:!text-[#C6CEFF] [&_svg]:!text-[#C6CEFF]"
            loading={submitting}
            disabled={!username.trim() || !password}
          >
            Acessar plataforma
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="text-[12px] leading-6 text-white/50">
            Acesso exclusivo para membros autorizados. O cadastro é gerenciado
            pela administração da plataforma.
          </p>
        </div>
      </section>

      <div className="absolute bottom-4 right-6 z-10 hidden text-[9px] uppercase tracking-[0.2em] text-white/35 sm:block">
        MMV CONNECT · Plataforma integrada
      </div>
    </main>
  );
}
