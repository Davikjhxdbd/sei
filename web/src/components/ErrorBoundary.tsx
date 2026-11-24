import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    // Avoid writing user data, component props, or server responses to the console.
    console.error('[MMV] erro de renderização:', error.name || 'UnknownError');
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12 text-ink"
        >
          <section className="w-full max-w-md text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-brass/30 bg-brass/10">
              <svg viewBox="0 0 64 64" className="h-10 w-10" fill="none" aria-hidden="true">
                <path d="M12 47V18L32 37L52 18V47" stroke="#F0E3C4" strokeWidth="3.2" strokeLinecap="square" strokeLinejoin="round" />
                <path d="M32 37V10" stroke="#C4A66A" strokeWidth="3.2" strokeLinecap="square" />
                <circle cx="32" cy="9" r="3.2" fill="#F4F2ED" />
                <circle cx="12" cy="18" r="2.3" fill="#C4A66A" />
                <circle cx="52" cy="18" r="2.3" fill="#C4A66A" />
              </svg>
            </span>
            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.35em] text-brass">
              MMV / CONNECT
            </p>
            <h1 className="mt-4 text-2xl font-semibold">
              Não foi possível carregar esta tela
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Ocorreu uma falha inesperada. Seus dados não foram apagados.
              Tente carregar a plataforma novamente.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-brass px-5 text-sm font-semibold text-[#111111] transition hover:brightness-110"
            >
              Recarregar plataforma
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
