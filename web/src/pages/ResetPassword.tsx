import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Eye, EyeOff } from 'lucide-react';
import { post } from '../lib/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await post('/auth/reset-password', {
        token,
        new_password: password,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível redefinir sua senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101010] px-5 py-10">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/site/login-hero.png')" }}
        aria-hidden="true"
      />

      <div className="absolute left-7 top-7 z-10 flex items-center gap-3 sm:left-10 sm:top-9">
        <div className="grid h-11 w-11 place-items-center border border-[#C4A66A] bg-[#111111]/80 text-sm font-bold text-[#D8BD86] backdrop-blur-md">
          M
        </div>
        <div>
          <p className="text-[13px] font-semibold tracking-[0.24em] text-white">
            MMV / CONNECT
          </p>
          <div className="mt-1 h-px w-12 bg-[#C4A66A]" />
        </div>
      </div>

      <section className="relative z-10 w-full max-w-[440px] rounded-2xl border border-white/15 bg-[#111111]/90 px-7 py-9 shadow-[0_25px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:px-10 sm:py-11">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#D8BD86]">
          Segurança da conta
        </p>

        <h1 className="font-display text-[38px] font-semibold leading-tight tracking-[-0.04em] text-white">
          {done ? 'Senha atualizada.' : 'Crie uma nova senha.'}
        </h1>

        {done ? (
          <>
            <p className="mt-4 text-[14px] leading-6 text-white/65">
              Sua senha foi redefinida com sucesso. Agora você já pode entrar
              na plataforma usando sua nova senha.
            </p>
            <Link
              to="/login"
              className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-[#C4A66A]/50 bg-[#171717] text-[15px] font-semibold text-[#D8BD86] transition hover:bg-[#252525]"
            >
              Voltar para o acesso <ArrowRight size={17} />
            </Link>
          </>
        ) : !token ? (
          <>
            <p className="mt-4 text-sm leading-6 text-white/65">
              O link de recuperação não foi encontrado. Solicite uma nova
              recuperação na tela de acesso.
            </p>
            <Link to="/login" className="mt-7 inline-block text-sm font-semibold text-[#D8BD86] hover:underline">
              Voltar para o login
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-[14px] leading-6 text-white/65">
              Escolha uma senha com pelo menos 8 caracteres para proteger sua
              conta.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-5">
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-white/80">
                  Nova senha
                </span>
                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4A66A]/70" />
                  <input
                    type={visible ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    required
                    minLength={8}
                    className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.06] pl-10 pr-11 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#C4A66A]"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-[#D8BD86]"
                  >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-white/80">
                  Confirmar nova senha
                </span>
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Digite a senha novamente"
                  required
                  minLength={8}
                  className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#C4A66A]"
                />
              </label>

              {error && (
                <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-[13px] text-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirmation}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-[#C4A66A]/50 bg-[#171717] text-[15px] font-semibold text-[#D8BD86] transition hover:bg-[#252525] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Redefinir senha'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
