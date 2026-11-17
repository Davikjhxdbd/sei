import { useState } from 'react';
import { useApi } from '../lib/useApi';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Aperture,
  Bell,
  CalendarDays,
  Camera,
  Clapperboard,
  Command,
  Film,
  FolderKanban,
  Layers3,
  Palette,
  Play,
  Share2,
  Radio,
  Presentation,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Shell } from '../components/layout/Shell';
import { ROLE_LABELS } from '../lib/format';
import { moduleIcon } from '../modules/registry';

const cores = [
  { number: '01', slug: 'transmissao', name: 'Transmissão', description: 'Operação técnica, câmeras, áudio e transmissão dos cultos.', detail: 'LIVE · OPERATION · STREAMING', icon: Radio, color: '#B9955B', glow: 'rgba(185,149,91,.20)' },
  { number: '02', slug: 'slide', name: 'Slide', description: 'Letras, apresentações e conteúdo visual durante os cultos.', detail: 'PRESENTATION · WORSHIP · MEDIA', icon: Presentation, color: '#80A7A0', glow: 'rgba(128,167,160,.20)' },
  { number: '03', slug: 'audiovisual', name: 'Audiovisual', description: 'Captação, edição, vídeos e experiências cinematográficas.', detail: 'MOTION · FILM · POST-PRODUCTION', icon: Clapperboard, color: '#B9955B', glow: 'rgba(185,149,91,.20)' },
  { number: '04', slug: 'fotos', name: 'Fotos', description: 'Fotografia, cobertura, seleção e tratamento de imagens.', detail: 'PHOTOGRAPHY · IMAGE', icon: Camera, color: '#80A7A0', glow: 'rgba(128,167,160,.20)' },
  { number: '05', slug: 'design', name: 'Design', description: 'Identidade visual, campanhas e direção de arte.', detail: 'BRANDING · ART DIRECTION', icon: Palette, color: '#A58ACB', glow: 'rgba(165,138,203,.20)' },
];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function AppCentral() {
  const { user, modules, level, state } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>('visao');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => localDateKey(new Date()));
  const unread = state?.notifications.unread ?? 0;

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthOffset = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCellCount = Math.ceil((monthOffset + daysInMonth) / 7) * 7;
  const calendarGridStart = new Date(monthStart);
  calendarGridStart.setDate(1 - monthOffset);
  const calendarDays = Array.from({ length: calendarCellCount }, (_, index) => {
    const date = new Date(calendarGridStart);
    date.setDate(calendarGridStart.getDate() + index);
    return date;
  });

  const calendarFrom = new Date(calendarGridStart);
  const calendarTo = new Date(calendarGridStart);
  calendarTo.setDate(calendarGridStart.getDate() + calendarCellCount);

  const calendarQuery = new URLSearchParams({
    from: calendarFrom.toISOString(),
    to: calendarTo.toISOString(),
  }).toString();

  const calendarData = useApi<{ items: { id: string; title: string; category: string; starts_at: string; location: string | null }[] }> (activeSection === 'visao' ? `/calendar?${calendarQuery}` : null));
  const calendarEvents = calendarData.data?.items ?? [];
  const selectedDayEvents = calendarEvents.filter(event => localDateKey(new Date(event.starts_at)) === selectedCalendarDate);
  const todayKey = localDateKey(new Date());
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarMonth);
  const reportsData = useApi<{ items: { id: string; title: string; event_name: string; status: string; updated_at: string; sections: number; sections_filled: number }[] }>(activeSection === 'visao' ? '/studio/reports' : null));

  const productionData = useApi<{
    totals: { areas: number; members: number; tasks: number; open: number; published: number };
    byStatus: { status: string; total: number }[];
    byArea: { id: string; name: string; slug: string; tasks: number; open_tasks: number; published: number }[];
  }> (activeSection === 'visao' ? '/studio/production/summary' : null));



  const mediaStatsData = useApi<{ totals: Record<string, number> }>(activeSection === 'cultos' ? '/studio/media/stats' : null));
  const mediaRecordsData = useApi<{ items: {
    id: string; service_date: string; service_time: string | null;
    preacher: string | null; event_name: string | null; status: string;
    editor_name: string | null;
  }[]; total: number }> (activeSection === 'cultos' ? '/studio/media?limit=100' : null));

  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  return (
    <Shell>
      <div className="mx-auto max-w-[1450px] space-y-8 pb-12">

        {/* CABEÇALHO */}
        <section id="visao-geral" className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.32em] text-[#C4A66A]">
              MMV CREATIVE / WORKSPACE
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {greeting()},{' '}
              <span className="text-[#C4A66A]">
                {user?.full_name?.split(' ')[0] ?? 'criativo'}.
              </span>
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Seu espaço de criação, colaboração e realização.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.7)]" />
            <span className="text-[11px] uppercase tracking-wider text-white/65">
              Workspace ativo
            </span>
            <span className="mx-1 h-3 w-px bg-white/15" />
            <span className="text-[11px] capitalize text-white/45">{today}</span>
          </div>
        </section>

        {/* HERO */}
        <section className="group relative isolate flex min-h-[340px] overflow-hidden rounded-[22px] border border-white/[.12] shadow-[0_25px_80px_rgba(0,0,0,.28)] sm:min-h-[410px] bg-[#090909] sm:min-h-[450px]">
          <img
            src="/images/templo-sede.jpg"
            alt="Templo sede do Ministério Mudança de Vida"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center brightness-[.58] saturate-[.72] transition-transform duration-[1800ms] group-hover:scale-[1.025]"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080808]/95 via-[#080808]/70 to-[#080808]/20" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080808]/75 via-transparent to-black/10" />
          <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-transparent via-[#C4A66A] to-transparent" />

          <div className="relative flex w-full flex-col justify-between p-7 sm:p-10 lg:p-14">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#C4A66A]" />
                <span className="text-[10px] font-semibold uppercase tracking-[.35em] text-[#D8BD86]">
                  Mais que criatividade. Propósito.
                </span>
              </div>
              <h2 className="mt-7 max-w-3xl text-4xl font-bold uppercase leading-[.98] tracking-[-.045em] text-white sm:text-6xl lg:text-[76px]">
                IDEIAS QUE
                <span className="mt-2 block text-[#D8BD86]">MOVEM</span>
                <span className="block">PROPÓSITOS.</span>
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-7 text-white/65 sm:text-base">
                Um ambiente integrado para transformar ideias em projetos,
                projetos em experiências e experiências em histórias.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-end justify-between gap-5">
              <div className="flex flex-wrap gap-2">
                {user?.roles.map((role) => (
                  <span key={role} className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[10px] text-white/75 backdrop-blur-md">
                    {ROLE_LABELS[role] ?? role}
                  </span>
                ))}
                {user?.sectors.map((sector) => (
                  <span key={sector.id} className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] text-white/65 backdrop-blur-md">
                    {sector.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.25em] text-[#D8BD86]">
                <span className="h-px w-8 bg-[#C4A66A]/60" />
                MMV CREATIVE
              </div>
            </div>
          </div>
        </section>

        {/* APLICATIVOS INDEPENDENTES */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#C4A66A]">Seu ambiente de trabalho</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Aplicativos</h2>
              <p className="mt-1 text-xs text-white/40">Ferramentas independentes para cada etapa da operação.</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-white/30">{modules.length} disponíveis</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.filter(module => module.key !== 'studio').map(module => {
              const Icon = moduleIcon(module.icon);
              return (
                <Link key={module.id} to={module.route}
                  className="group rounded-2xl border border-white/[.09] bg-gradient-to-br from-[#191919] to-[#101010] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#C4A66A]/40 hover:bg-[#1B1B1B]">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[.08] bg-white/[.035]">
                      <Icon className="h-5 w-5" style={{ color: module.color || '#C4A66A' }} />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-white/25 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#D8BD86]" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-white">{module.name}</h3>
                  <p className="mt-1 min-h-10 text-xs leading-5 text-white/40">{module.description || 'Acesse este aplicativo.'}</p>
                  <div className="mt-4 border-t border-white/[.07] pt-3 text-[9px] font-semibold uppercase tracking-[.18em] text-[#C4A66A]">Abrir aplicativo</div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* NAVEGAÇÃO EXPANSÍVEL DO WORKSPACE */}
        <section className="space-y-3">
          <nav className="flex flex-wrap gap-2 rounded-2xl border border-white/[.08] bg-[#0D0D0D] p-2.5 shadow-[0_12px_35px_rgba(0,0,0,.18)]">
            {[
              { id: 'visao', label: 'Visão geral' },
              { id: 'nucleos', label: 'Núcleos criativos' },
              { id: 'producao', label: 'Produção' },
              { id: 'cultos', label: 'Edição de cultos' },
              { id: 'agenda', label: 'Agenda' },
              { id: 'equipe', label: 'Equipe' },
              { id: 'biblioteca', label: 'Biblioteca' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(activeSection === item.id ? null : item.id);
                  setExpandedItem(null);
                }}
                className={`rounded-xl border px-4 py-3 text-[10px] font-semibold uppercase tracking-[.12em] transition-all duration-300 ${
                  activeSection === item.id
                    ? 'border-[#C4A66A]/35 bg-gradient-to-b from-[#C4A66A]/15 to-[#C4A66A]/[.04] text-[#E2C98F] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
                    : 'border-white/[.09] bg-white/[.025] text-white/55 hover:border-[#C4A66A]/40 hover:text-[#D8BD86]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {activeSection === 'visao' && (
            <div className="space-y-5 mmv-fade-in">
              <section className="overflow-hidden rounded-[24px] border border-white/[.09] bg-[#101010] shadow-[0_24px_70px_rgba(0,0,0,.24)]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.07] px-5 py-5 sm:px-7">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C4A66A] shadow-[0_0_12px_#C4A66A]" />
                      <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#C4A66A]">Planejamento operacional</p>
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold capitalize tracking-tight text-white sm:text-3xl">{monthLabel}</h2>
                    <p className="mt-1 text-xs text-white/40">Agenda geral · compromissos e atividades</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const previous = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                        setCalendarMonth(previous);
                        setSelectedCalendarDate(localDateKey(previous));
                      }}
                      aria-label="Mês anterior"
                      className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-white/65 transition hover:border-[#C4A66A]/40 hover:bg-[#C4A66A]/10 hover:text-[#D8BD86]"
                    >‹</button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                        setCalendarMonth(next);
                        setSelectedCalendarDate(localDateKey(next));
                      }}
                      aria-label="Próximo mês"
                      className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-white/65 transition hover:border-[#C4A66A]/40 hover:bg-[#C4A66A]/10 hover:text-[#D8BD86]"
                    >›</button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                        setSelectedCalendarDate(localDateKey(now));
                      }}
                      className="h-10 rounded-xl border border-[#C4A66A]/30 bg-[#C4A66A]/[.08] px-4 text-[10px] font-semibold uppercase tracking-wider text-[#D8BD86] transition hover:bg-[#C4A66A]/15"
                    >Hoje</button>
                  </div>
                </div>

                <div className="p-3 sm:p-6">
                  <div className="mb-2 grid grid-cols-7">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                      <div key={day} className="py-3 text-center text-[9px] font-semibold uppercase tracking-[.15em] text-white/35 sm:text-[10px]">{day}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 overflow-hidden rounded-xl border-l border-t border-white/[.07]">
                    {calendarDays.map(date => {
                      const key = localDateKey(date);
                      const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                      const isToday = key === todayKey;
                      const isSelected = key === selectedCalendarDate;
                      const dayEvents = calendarEvents.filter(event => localDateKey(new Date(event.starts_at)) === key);

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedCalendarDate(key)}
                          className={`group relative min-w-0 min-h-[82px] border-b border-r border-white/[.07] p-1.5 text-left transition-all sm:min-h-[116px] sm:p-3 ${
                            isSelected ? 'bg-[#C4A66A]/[.12] ring-1 ring-inset ring-[#C4A66A]/50' :
                            isCurrentMonth ? 'bg-white/[.015] hover:bg-white/[.055]' : 'bg-black/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`grid h-6 w-6 place-items-center rounded-lg text-[11px] font-medium sm:h-7 sm:w-7 sm:text-xs ${
                              isToday ? 'bg-[#C4A66A] font-bold text-black' :
                              isSelected ? 'text-[#E6C987]' :
                              isCurrentMonth ? 'text-white/75' : 'text-white/20'
                            }`}>{date.getDate()}</span>
                            {dayEvents.length > 0 && (
                              <span className="rounded-full bg-[#C4A66A]/15 px-1.5 py-0.5 text-[8px] font-semibold text-[#D8BD86]">{dayEvents.length}</span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1">
                            {dayEvents.slice(0, 2).map(event => (
                              <div key={event.id} className="truncate rounded-md border-l-2 border-[#C4A66A] bg-[#C4A66A]/[.10] px-1.5 py-1 text-[8px] leading-tight text-[#E6D3AA] sm:text-[10px]">
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <p className="pl-1 text-[8px] text-white/35">+{dayEvents.length - 2} eventos</p>
                            )}
                          </div>
                          {isSelected && <span className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-[#D8BD86] sm:bottom-2 sm:right-2 sm:h-1.5 sm:w-1.5" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[.07] pt-4 text-[10px] text-white/40">
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#C4A66A]" /> Hoje</span>
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm border border-[#C4A66A]/70 bg-[#C4A66A]/20" /> Dia selecionado</span>
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-[#C4A66A]" /> Compromisso</span>
                    <span className="ml-auto text-white/25">{calendarEvents.length} evento(s) no período</span>
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-white/[.09] bg-gradient-to-br from-[#171717] to-[#101010] p-5 shadow-[0_15px_45px_rgba(0,0,0,.16)] sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#C4A66A]">Agenda selecionada</p>
                    <h3 className="mt-1 text-lg font-semibold capitalize text-white">
                      {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(`${selectedCalendarDate}T12:00:00`))}
                    </h3>
                  </div>
                  <CalendarDays className="h-5 w-5 text-[#C4A66A]" />
                </div>

                {calendarData.loading ? (
                  <p className="py-5 text-sm text-white/40">Atualizando compromissos...</p>
                ) : calendarData.error ? (
                  <p className="py-5 text-sm text-red-300/80">{calendarData.error}</p>
                ) : selectedDayEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/[.10] px-4 py-7 text-center">
                    <p className="text-sm text-white/45">Nenhum compromisso nesta data.</p>
                    <p className="mt-1 text-[11px] text-white/25">Selecione outro dia para consultar a agenda.</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedDayEvents.map(event => (
                      <div key={event.id} className="flex items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-4 transition hover:border-[#C4A66A]/25">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C4A66A]/10 text-[#D8BD86]"><CalendarDays className="h-4 w-4" /></div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{event.title}</p>
                          <p className="mt-1 text-xs text-white/40">{event.category}</p>
                          <p className="mt-2 text-[11px] text-[#D8BD86]">{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.starts_at))}{event.location ? ` · ${event.location}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* PAINEL ANALÍTICO */}
              <ProductionAnalytics
                data={productionData.data ?? undefined}
                loading={productionData.loading}
                error={productionData.error}
              />

              <section className="rounded-[20px] border border-white/[.09] bg-gradient-to-br from-[#171717] to-[#101010] p-5 shadow-[0_15px_45px_rgba(0,0,0,.16)] sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.22em] text-[#C4A66A]">Acompanhamento</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">Relatórios recentes</h3>
                  </div>
                  <FolderKanban className="h-5 w-5 text-[#C4A66A]" />
                </div>
                {reportsData.loading ? (
                  <p className="text-sm text-white/40">Carregando relatórios...</p>
                ) : (reportsData.data?.items ?? []).length === 0 ? (
                  <p className="text-sm text-white/40">Nenhum relatório disponível.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {(reportsData.data?.items ?? []).slice(0, 4).map(report => (
                      <div key={report.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium text-white">{report.title}</p>
                          <span className="shrink-0 text-[10px] text-[#D8BD86]">{report.status === 'finalized' ? 'Finalizado' : report.status === 'in_review' ? 'Em revisão' : 'Rascunho'}</span>
                        </div>
                        <p className="mt-1 text-xs text-white/40">{report.event_name} · {report.sections_filled}/{report.sections} seções</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeSection && activeSection !== 'visao' && activeSection !== 'nucleos' && (
            <div className="mmv-fade-in rounded-[20px] border border-white/[.09] bg-gradient-to-br from-[#171717] to-[#101010] p-5 shadow-[0_15px_45px_rgba(0,0,0,.16)] transition-colors duration-300 hover:border-[#C4A66A]/20 sm:p-7">
              {(() => {
                const sections: Record<string, { title: string; subtitle: string; items: { name: string; description: string }[] }> = {
                  visao: {
                    title: 'Visão geral',
                    subtitle: 'Acompanhe o ambiente de trabalho e suas principais informações.',
                    items: [
                      { name: 'Indicadores', description: 'Resumo dos núcleos, acessos, notificações e equipe.' },
                      { name: 'Atividade recente', description: 'Espaço reservado para acompanhar as últimas movimentações do Workspace.' },
                    ],
                  },
                  nucleos: {
                    title: 'Departamentos',
                    subtitle: 'Acesse o ambiente de trabalho de cada departamento.',
                    items: [
                      { name: 'Transmissão', description: 'Operação técnica e transmissão dos cultos.' },
                      { name: 'Slide', description: 'Letras e apresentações dos cultos.' },
                      { name: 'Audiovisual', description: 'Captação, edição e produção de vídeos.' },
                      { name: 'Fotos', description: 'Cobertura fotográfica e tratamento de imagens.' },
                      { name: 'Design', description: 'Identidade visual e peças gráficas.' },
                    ],
                  },
                  cultos: {
                    title: 'Edição de cultos',
                    subtitle: 'Acompanhamento das gravações, edições e publicações.',
                    items: [
                      { name: 'Painel de edição', description: 'Indicadores e acompanhamento dos cultos.' },
                      { name: 'Acervo de mídia', description: 'Cadastro, edição e histórico dos cultos.' },
                    ],
                  },
                  producao: {
                    title: 'Projetos e produção',
                    subtitle: 'Organização do fluxo de criação e entrega.',
                    items: [
                      { name: 'Central de produção', description: 'Projetos, demandas e acompanhamento das entregas.' },
                      { name: 'Meu espaço', description: 'Área individual de trabalho e participação na produção.' },
                    ],
                  },
                  agenda: {
                    title: 'Agenda',
                    subtitle: 'Organização dos compromissos e atividades.',
                    items: [
                      { name: 'Calendário', description: 'Agenda compartilhada da equipe.' },
                      { name: 'Eventos', description: 'Eventos e programações da operação.' },
                    ],
                  },
                  equipe: {
                    title: 'Equipe',
                    subtitle: 'Pessoas, responsabilidades e organização.',
                    items: [
                      { name: 'Meu espaço', description: 'Acompanhe sua participação e suas atividades.' },
                      { name: 'Escalas', description: 'Organização das equipes e responsabilidades.' },
                    ],
                  },
                  biblioteca: {
                    title: 'Biblioteca',
                    subtitle: 'Acervo e materiais de apoio à criação.',
                    items: [
                      { name: 'Acervo de mídia', description: 'Organização e consulta dos arquivos de mídia.' },
                    ],
                  },

                };
                const section = sections[activeSection];
                return (
                  <>
                    <div className="mb-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#C4A66A]">WORKSPACE / SEÇÕES</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{section.title}</h3>
                      <p className="mt-1 text-[12px] text-white/45">{section.subtitle}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {section.items.map((item) => {
                        const isOpen = expandedItem === item.name;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setExpandedItem(isOpen ? null : item.name)}
                            className={`rounded-xl border p-4 text-left transition-all ${
                              isOpen
                                ? 'border-[#C4A66A]/40 bg-[#C4A66A]/[.07]'
                                : 'border-white/[.08] bg-white/[.02] hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-white">{item.name}</span>
                              <span className="text-lg text-[#C4A66A]">{isOpen ? '−' : '+'}</span>
                            </div>
                            {isOpen && (
                              <p className="mt-3 border-t border-white/[.08] pt-3 text-[12px] leading-6 text-white/55">
                                {item.description}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </section>

        {activeSection === "nucleos" && (
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.3em] text-[#C4A66A]">
                THE CREATIVE DEPARTMENTS
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Núcleos de criação
              </h2>
              <p className="mt-2 text-[13px] text-white/45">
                Cada especialidade, seu próprio ambiente de trabalho.
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-[.18em] text-white/35">
              04 DEPARTAMENTOS
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {cores.map((core) => {
              const Icon = core.icon;
              return (
                <article
                  key={core.number}
                  className={`group relative isolate flex min-h-[235px] flex-col overflow-hidden rounded-[20px] border border-white/[.09] bg-gradient-to-br from-[#181818] to-[#101010] p-6 shadow-[0_16px_45px_rgba(0,0,0,.2)] transition-all duration-500 hover:-translate-y-1 hover:border-white/20`}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
                    event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.removeProperty('--mx');
                    event.currentTarget.style.removeProperty('--my');
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: `radial-gradient(350px circle at var(--mx,50%) var(--my,50%), ${core.glow}, transparent 70%)` }}
                  />
                  <div className="pointer-events-none absolute -right-12 -top-16 -z-10 h-48 w-48 rounded-full opacity-20 blur-[65px] transition-opacity duration-500 group-hover:opacity-50" style={{ background: core.color }} />

                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-medium tracking-[.25em] text-white/30">{core.number} / MMV</span>
                    <Icon className="h-6 w-6 transition-transform duration-500 group-hover:scale-110" style={{ color: core.color }} />
                  </div>

                  <div className="mt-auto">
                    <p className="mb-2 text-[9px] font-semibold tracking-[.2em]" style={{ color: core.color }}>{core.detail}</p>
                    <h3 className="text-2xl font-semibold tracking-tight text-white">{core.name}</h3>
                    <p className="mt-2 max-w-md text-[12px] leading-5 text-white/45">{core.description}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/[.08] pt-4">
                    <span className="text-[9px] uppercase tracking-[.17em] text-white/30">Ambiente em desenvolvimento</span>
                    <Sparkles className="h-4 w-4 text-white/30 transition-colors group-hover:text-[#D8BD86]" />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        )}

        {activeSection === 'cultos' && (
          <CultosDashboard
            stats={mediaStatsData.data?.totals}
            records={mediaRecordsData.data?.items ?? []}
            loading={mediaStatsData.loading || mediaRecordsData.loading}
          />
        )}

        {/* RODAPÉ */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.08] pt-6">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-white/35">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#C4A66A] text-[9px] text-black">MV</span>
            MMV CREATIVE
          </div>
          <div className="flex items-center gap-4 text-[11px] text-white/35">
            <Link to="/notifications" className="transition-colors hover:text-white">Notificações</Link>
            <Link to="/profile" className="transition-colors hover:text-white">Meu perfil</Link>
            {level >= 4 && <Link to="/admin/audit" className="transition-colors hover:text-white">Administração</Link>}
          </div>
        </footer>
      </div>
    </Shell>
  );
}

type ProductionAnalyticsProps = {
  data?: {
    totals: { areas: number; members: number; tasks: number; open: number; published: number };
    byStatus: { status: string; total: number }[];
    byArea: { id: string; name: string; slug: string; tasks: number; open_tasks: number; published: number }[];
  };
  loading: boolean;
  error?: string | null;
};

function ProductionAnalytics({ data, loading, error }: ProductionAnalyticsProps) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const totals = data?.totals;
  const areas = data?.byArea ?? [];
  const statuses = data?.byStatus ?? [];
  const maxTasks = Math.max(1, ...areas.map(area => area.tasks));

  const statusLabels: Record<string, string> = {
    planning: 'Planejamento',
    recording: 'Gravação',
    editing: 'Edição',
    review: 'Revisão',
    published: 'Publicado',
  };

  const statusColors: Record<string, string> = {
    planning: '#8B8B8B',
    recording: '#80A7A0',
    editing: '#A58ACB',
    review: '#D8BD86',
    published: '#C4A66A',
  };

  const selected = areas.find(area => area.id === selectedArea);
  const statusTotal = statuses.reduce((sum, item) => sum + item.total, 0);
  const circumference = 2 * Math.PI * 48;
  let accumulated = 0;

  const metrics = [
    { label: 'Tarefas totais', value: totals?.tasks ?? 0, detail: 'Em todos os núcleos', icon: '▦' },
    { label: 'Em andamento', value: totals?.open ?? 0, detail: 'Ainda não publicadas', icon: '◷' },
    { label: 'Publicadas', value: totals?.published ?? 0, detail: 'Produções concluídas', icon: '✓' },
    { label: 'Equipe ativa', value: totals?.members ?? 0, detail: `${totals?.areas ?? 0} núcleos ativos`, icon: '◉' },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#C4A66A]">Inteligência operacional</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Visão da produção</h2>
          <p className="mt-1 text-xs text-white/40">Indicadores atualizados a partir das atividades dos núcleos.</p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-emerald-300/80">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Dados do sistema
        </span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/[.08] bg-[#101010] p-8 text-center text-sm text-white/40">
          Carregando indicadores...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-400/15 bg-red-400/[.04] p-5 text-sm text-red-200/80">
          Não foi possível carregar os indicadores: {error}
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-white/[.08] bg-[#101010] p-8 text-center text-sm text-white/40">
          Nenhum dado de produção disponível.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <div key={metric.label} className="group relative overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-br from-[#191919] to-[#101010] p-4 transition hover:-translate-y-0.5 hover:border-[#C4A66A]/30 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">{metric.label}</span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#C4A66A]/15 bg-[#C4A66A]/[.07] text-sm text-[#D8BD86]">{metric.icon}</span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{metric.value}</p>
                <p className="mt-1 text-[10px] text-white/35">{metric.detail}</p>
                <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#C4A66A]/40 to-transparent" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-2xl border border-white/[.08] bg-[#101010] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#C4A66A]">Desempenho</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Produção por núcleo</h3>
                  <p className="mt-1 text-[11px] text-white/35">Selecione um núcleo para ver os detalhes.</p>
                </div>
                <span className="text-[10px] text-white/35">{areas.length} áreas</span>
              </div>

              <div className="mt-6 space-y-5">
                {areas.map(area => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
                    className={`block w-full rounded-xl p-2 text-left transition ${selectedArea === area.id ? 'bg-[#C4A66A]/[.08]' : 'hover:bg-white/[.035]'}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className={`truncate text-xs font-medium ${selectedArea === area.id ? 'text-[#E6C987]' : 'text-white/75'}`}>{area.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-white/65">{area.tasks} <span className="text-white/30">tarefas</span></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#927344] to-[#D8BD86] transition-all duration-700"
                        style={{ width: `${(area.tasks / maxTasks) * 100}%` }}
                      />
                    </div>
                  </button>
                ))}
                {areas.length === 0 && <p className="py-6 text-center text-xs text-white/35">Nenhum núcleo cadastrado.</p>}
              </div>

              {selected && (
                <div className="mt-5 rounded-xl border border-[#C4A66A]/20 bg-[#C4A66A]/[.05] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#E6C987]">{selected.name}</p>
                    <button type="button" onClick={() => setSelectedArea(null)} className="text-[10px] text-white/40 hover:text-white">Limpar seleção ×</button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div><p className="text-xl font-semibold text-white">{selected.tasks}</p><p className="text-[9px] text-white/40">Total</p></div>
                    <div><p className="text-xl font-semibold text-white">{selected.open_tasks}</p><p className="text-[9px] text-white/40">Em aberto</p></div>
                    <div><p className="text-xl font-semibold text-white">{selected.published}</p><p className="text-[9px] text-white/40">Publicadas</p></div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/[.08] bg-[#101010] p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#C4A66A]">Fluxo de trabalho</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Etapas da produção</h3>
              <p className="mt-1 text-[11px] text-white/35">Distribuição das tarefas por status.</p>

              <div className="my-7 flex items-center justify-center">
                <div className="relative h-40 w-40">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="12" />
                    {statuses.map(item => {
                      const length = statusTotal > 0 ? (item.total / statusTotal) * circumference : 0;
                      const offset = accumulated;
                      accumulated += length;
                      return (
                        <circle
                          key={item.status}
                          cx="60"
                          cy="60"
                          r="48"
                          fill="none"
                          stroke={statusColors[item.status] ?? '#C4A66A'}
                          strokeWidth="12"
                          strokeDasharray={`${length} ${circumference - length}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="butt"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-semibold text-white">{statusTotal}</span>
                    <span className="text-[9px] uppercase tracking-wider text-white/40">Tarefas</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {statuses.map(item => (
                  <div key={item.status} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs text-white/60">
                      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: statusColors[item.status] ?? '#C4A66A' }} />
                      {statusLabels[item.status] ?? item.status}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-white">{item.total}</span>
                  </div>
                ))}
                {statuses.length === 0 && <p className="text-center text-xs text-white/35">Ainda não há tarefas.</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}


type CultoRecord = {
  id: string;
  service_date: string;
  service_time: string | null;
  preacher: string | null;
  event_name: string | null;
  status: string;
  editor_name: string | null;
};

function CultosDashboard({ stats, records, loading }: {
  stats?: Record<string, number>;
  records: CultoRecord[];
  loading: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = records.filter(r => {
    const date = new Date(r.service_date + 'T00:00:00');
    return date < today && !['published', 'reported_lost', 'not_found'].includes(r.status);
  });

  const cards = [
    { label: 'Em aberto', key: 'awaiting_edit', color: '#D8BD86' },
    { label: 'Em andamento', key: 'in_edit', color: '#75A9D8' },
    { label: 'Atrasados', key: 'overdue', color: '#E27B70' },
    { label: 'Aguardando publicação', key: 'awaiting_publication', color: '#B69BDD' },
    { label: 'Publicados', key: 'published', color: '#80B99A' },
  ];

  const value = (key: string) => key === 'overdue'
    ? overdue.length
    : stats?.[key] ?? 0;

  const labels: Record<string, string> = {
    awaiting_edit: 'Aguardando edição',
    in_edit: 'Em edição',
    awaiting_publication: 'Aguardando publicação',
    published: 'Publicado',
    reported_lost: 'Perda reportada',
    not_found: 'Não localizado',
  };

  const date = (value: string) => new Date(value + 'T00:00:00')
    .toLocaleDateString('pt-BR');

  return (
    <section className="space-y-6 mmv-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.3em] text-[#C4A66A]">MMV CREATIVE / AUDIOVISUAL</p>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Edição de cultos</h2>
          <p className="mt-2 text-sm text-white/45">Controle de edição, prazos e publicações.</p>
        </div>
        <Link to="/m/studio/media" className="rounded-xl border border-[#C4A66A]/30 bg-[#C4A66A]/10 px-4 py-3 text-xs font-semibold text-[#E2C98F] transition hover:bg-[#C4A66A]/20">
          ABRIR ACERVO DE MÍDIA ↗
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(card => (
          <article key={card.key} className="rounded-2xl border border-white/[.08] bg-[#141414] p-5">
            <div className="mb-4 h-1 w-8 rounded-full" style={{ background: card.color }} />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
              {loading ? '—' : value(card.key)}
            </p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[.08] bg-[#141414] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Cultos recentes</h3>
            <p className="mt-1 text-xs text-white/40">Acompanhamento dos registros cadastrados.</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-white/35">{records.length} registros</span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-white/40">Carregando registros...</p>
        ) : records.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">Nenhum culto cadastrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 12).map(record => {
              const late = overdue.some(item => item.id === record.id);
              return (
                <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{record.event_name || 'Culto'}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {date(record.service_date)}{record.service_time ? ` · ${record.service_time.slice(0,5)}` : ''}
                      {record.preacher ? ` · ${record.preacher}` : ''}
                    </p>
                    <p className="mt-1 text-[11px] text-white/35">Editor: {record.editor_name || 'Não atribuído'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {late && <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase text-red-300">Atrasado</span>}
                    <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white/65">
                      {labels[record.status] || record.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 border-t border-white/[.07] pt-4">
          <Link to="/m/studio/media" className="text-xs font-semibold text-[#C4A66A] hover:text-[#E2C98F]">Ver todos os cultos →</Link>
        </div>
      </div>
    </section>
  );
}
