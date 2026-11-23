import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/layout/Shell';
import type { NavGroup } from '../modules/registry';
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Home, Sparkles, Users } from 'lucide-react';

const nav: NavGroup[] = [{
  title: 'Meu espaço',
  items: [
    { label: 'Visão pessoal', to: '/pessoal', icon: Home, end: true },
    { label: 'Escala de limpeza', to: '/pessoal#limpeza', icon: ClipboardCheck },
  ],
}];

const cleaners = ['Davi', 'João Neto', 'Maria Fernanda', 'Evelyn', 'João Pedro'];
const startDate = new Date(2026, 10, 23);

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayOffset(date: Date) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current.getTime() - startDate.getTime()) / 86400000);
}

function assignmentFor(date: Date) {
  const offset = dayOffset(date);
  return cleaners[((offset % cleaners.length) + cleaners.length) % cleaners.length];
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}

export default function PersonalArea() {
  const today = new Date();
  const currentPerson = assignmentFor(today);
  const rotation = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
    return { date, person: assignmentFor(date) };
  }), []);

  return (
    <Shell nav={nav} sidebarEyebrow="Meu espaço">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mmv-label">Organização pessoal</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Meu espaço</h1>
            <p className="mt-1 text-sm text-muted">Rotinas, tarefas e responsabilidades do dia a dia.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted">
            <CalendarDays size={14} /> {formatDate(today, { weekday: 'long', day: '2-digit', month: 'long' })}
          </span>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="mmv-surface p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><Sparkles size={15} className="text-brass" /> Seu espaço</div>
            <h2 className="mt-3 text-lg font-semibold text-ink">Tudo organizado em um só lugar.</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">Aqui ficam as escalas e pequenas responsabilidades que fazem parte da rotina.</p>
          </article>
          <article className="mmv-surface p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><Users size={15} className="text-brass" /> Escala de hoje</div>
            <p className="mt-3 text-2xl font-semibold text-ink">{currentPerson}</p>
            <p className="mt-1 text-sm text-muted">Responsável pela limpeza de hoje.</p>
            <a href="#limpeza" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brass hover:underline">Ver escala completa <ChevronRight size={14} /></a>
          </article>
        </section>

        <section id="limpeza" className="mmv-surface overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mmv-label">Rotina compartilhada</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">Escala diária de limpeza</h2>
              <p className="mt-1 text-sm text-muted">Revezamento diário entre os cinco participantes.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-canvas px-3 py-1.5 text-xs font-medium text-muted"><CalendarDays size={13} /> Ciclo iniciado em 23/11/2026</span>
          </div>
          <div className="divide-y divide-line">
            {rotation.map(({ date, person }, index) => {
              const isToday = index === 0;
              return (
                <div key={localDateKey(date)} className={`flex items-center justify-between gap-4 px-5 py-4 ${isToday ? 'bg-canvas/70' : ''}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${isToday ? 'border-brass/40 bg-brass/10 text-brass' : 'border-line bg-canvas text-muted'}`}>
                      {isToday ? <CheckCircle2 size={17} /> : <span className="text-sm font-semibold">{date.getDate()}</span>}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{formatDate(date, { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                      <p className="mt-0.5 text-xs text-muted">{person}</p>
                    </div>
                  </div>
                  {isToday && <span className="rounded-full bg-brass/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brass">Hoje</span>}
                </div>
              );
            })}
          </div>
          <div className="border-t border-line bg-canvas/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ordem do revezamento</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {cleaners.map((name, index) => <span key={name} className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink"><span className="mr-2 text-brass">{String(index + 1).padStart(2, '0')}</span>{name}</span>)}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">A sequência se repete automaticamente a cada cinco dias.</p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link to="/escalas" className="mmv-surface group flex items-center justify-between p-4 transition hover:border-brass/40">
            <div><p className="text-sm font-semibold text-ink">Escalas dos cultos</p><p className="mt-1 text-xs text-muted">Equipe, funções e organização dos cultos.</p></div>
            <ChevronRight size={17} className="text-muted transition group-hover:translate-x-1 group-hover:text-brass" />
          </Link>
          <div className="mmv-surface flex items-center justify-between p-4 opacity-70">
            <div><p className="text-sm font-semibold text-ink">Minhas tarefas</p><p className="mt-1 text-xs text-muted">Área preparada para próximas rotinas.</p></div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Em breve</span>
          </div>
        </section>
      </div>
    </Shell>
  );
}
