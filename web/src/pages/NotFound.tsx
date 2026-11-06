import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Shell } from '../components/layout/Shell';

export default function NotFound() {
  return (
    <Shell>
      <div className="mmv-surface mx-auto max-w-lg px-6 py-12 text-center">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-ink/[0.05] text-muted">
          <Compass className="h-5 w-5" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wider2 text-muted">
          Página não encontrada
        </p>
        <h1 className="mt-2 text-[20px] font-semibold text-ink">
          Este endereço não existe na plataforma
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          O endereço pode ter mudado ou o recurso pertence a um aplicativo que
          não está habilitado.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-strong px-4 text-[13px] font-medium text-white"
        >
          Ir para a central de aplicativos
        </Link>
      </div>
    </Shell>
  );
}
