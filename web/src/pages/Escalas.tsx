import { CalendarDays, Clock3, Users } from 'lucide-react';
import { Shell } from '../components/layout/Shell';
import { CalendarDays as CalendarIcon } from 'lucide-react';
import type { NavGroup } from '../modules/registry';

const nav: NavGroup[] = [{ title: 'Organização', items: [{ label: 'Escalas', to: '/escalas', icon: CalendarIcon, end: true }] }];

const groups = [
  { title: 'TRANSMISSÃO', people: [['Davi', 'Stream / Corte'], ['Davi', 'Comunicação Live'], ['João Neto', 'Data Vídeo Live']] },
  { title: 'ÁUDIO', people: [['Leonardo', 'Som Live'], ['Leonardo', 'Som Nave']] },
  { title: 'TELÃO E SLIDES', people: [['Maria Fernanda', 'Telão'], ['Gabriely', 'Slide']] },
  { title: 'ILUMINAÇÃO', people: [['Leonardo', 'Luz']] },
  { title: 'FOTOGRAFIA', people: [['Grazi', 'Fotos']] },
];

export default function EscalasPage() {
  return <Shell nav={nav} sidebarEyebrow="Organização">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mmv-label">Equipe e operação</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Escalas</h1><p className="mt-1 text-sm text-muted">Organização das equipes e responsabilidades dos cultos.</p></div>
        <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted"><CalendarDays size={14}/> Segunda-feira, 23 de novembro de 2026</span>
      </header>
      <section className="mmv-surface overflow-hidden">
        <div className="border-b border-line p-5"><p className="mmv-label">Escala do dia</p><h2 className="mt-1 text-lg font-semibold text-ink">Segunda-feira • 23/11/2026</h2></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(group => <article key={group.title} className="rounded-xl border border-line p-4">
            <h3 className="text-[11px] font-bold tracking-[0.12em] text-brass">{group.title}</h3>
            <div className="mt-3 space-y-3">{group.people.map(([name, role]) => <div key={role} className="flex items-center justify-between gap-3 border-b border-line/70 pb-2 last:border-0 last:pb-0"><div><p className="text-sm font-semibold text-ink">{name}</p><p className="text-xs text-muted">{role}</p></div><Users size={15} className="shrink-0 text-muted/60"/></div>)}</div>
          </article>)}
        </div>
        <div className="border-t border-line bg-canvas/60 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-ink"><Clock3 size={16} className="text-brass"/> Oração às 18h10</div><p className="mt-2 text-sm leading-relaxed text-muted">Lembrem-se da nossa oração às 18h10 na live. Estejam todos presentes para já se preparar e organizar as questões para o culto. Deus abençoe!</p></div>
      </section>
    </div>
  </Shell>;
}
