import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, MapPin,
  Clock3, Pencil, Trash2, X,
} from 'lucide-react';
import { Shell } from '../components/layout/Shell';
import { CALENDAR_NAV } from '../modules/registry';
import { useAuth } from '../lib/auth';
import { get, post, patch, del } from '../lib/api';
import { useToast } from '../components/Toast';

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  created_by_name?: string | null;
  source?: 'shared' | 'studio';
  studio_event_id?: string;
  studio_status?: string;
  assignments?: number;
  checklist_runs?: number;
  reports?: number;
};

const categories = [
  { name: 'Culto', color: '#B58B4B' },
  { name: 'Reunião', color: '#6485A5' },
  { name: 'Evento especial', color: '#9875A8' },
  { name: 'Gravação', color: '#5B9A87' },
  { name: 'Compromisso', color: '#8B929D' },
  { name: 'Outros', color: '#A1A1AA' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function localDateTime(value: string) {
  const date = new Date(value);
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  return new Date(value).toISOString();
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(date);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function categoryColor(category: string) {
  return categories.find((item) => item.name === category)?.color ?? '#A1A1AA';
}

export default function CalendarPage() {
  const [searchParams] = useSearchParams();
  const requestedDate = searchParams.get('date');
  const { level } = useAuth();
  const toast = useToast();
  const canManage = level >= 4;

  const [month, setMonth] = useState(() => requestedDate ? new Date(`${requestedDate}T12:00:00`) : new Date());
  const [selectedDay, setSelectedDay] = useState(() => requestedDate || dateKey(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Culto');
  const [date, setDate] = useState(dateKey(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const rangeStart = new Date(month.getFullYear(), month.getMonth(), 1);
  rangeStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));
  const rangeEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  rangeEnd.setDate(rangeEnd.getDate() + (7 - ((rangeEnd.getDay() + 6) % 7)) % 7);
  if (rangeEnd <= lastDay) rangeEnd.setDate(rangeEnd.getDate() + 7);

  async function loadEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
      });
      const [sharedResult, studioResult] = await Promise.all([
        get<{ items: CalendarEvent[] }>(`/calendar?${params}`),
        get<{ items: { id: string; name: string; type: string; starts_at: string; ends_at: string | null; notes: string | null; status: string; created_by_name?: string | null; assignments: number; checklist_runs: number; reports: number }[] }>(`/studio/events?${params}`),
      ]);
      const sharedEvents = (sharedResult.items ?? []).map((event) => ({ ...event, source: 'shared' as const }));
      const studioEvents = (studioResult.items ?? []).map((event) => ({
        id: `studio-${event.id}`,
        studio_event_id: event.id,
        title: event.name,
        description: event.notes,
        category: categories.some((item) => item.name === event.type) ? event.type : 'Evento especial',
        location: null,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        all_day: false,
        created_by_name: event.created_by_name,
        source: 'studio' as const,
        studio_status: event.status,
        assignments: event.assignments,
        checklist_runs: event.checklist_runs,
        reports: event.reports,
      }));
      setEvents([...sharedEvents, ...studioEvents].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível carregar o calendário.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      const selected = new Date(`${requestedDate}T12:00:00`);
      if (!Number.isNaN(selected.getTime())) {
        setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
        setSelectedDay(requestedDate);
      }
    }
  }, [requestedDate]);

  useEffect(() => {
    void loadEvents();
  }, [month.getFullYear(), month.getMonth()]);

  const days = useMemo(() => {
    const result: Date[] = [];
    const cursor = new Date(rangeStart);
    while (cursor < rangeEnd) {
      result.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [month.getFullYear(), month.getMonth()]);

  const selectedEvents = events.filter(
    (event) => dateKey(new Date(event.starts_at)) === selectedDay,
  );

  const upcoming = [...events]
    .filter((event) => new Date(event.starts_at).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 5);

  function resetForm() {
    setEditing(null);
    setTitle('');
    setCategory('Culto');
    setDate(selectedDay);
    setStartTime('09:00');
    setEndTime('10:00');
    setAllDay(false);
    setLocation('');
    setDescription('');
  }

  function openNew() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setTitle(event.title);
    setCategory(event.category);
    setDate(dateKey(new Date(event.starts_at)));
    setStartTime(localDateTime(event.starts_at).slice(11));
    setEndTime(event.ends_at ? localDateTime(event.ends_at).slice(11) : '');
    setAllDay(event.all_day);
    setLocation(event.location ?? '');
    setDescription(event.description ?? '');
    setModalOpen(true);
  }

  async function saveEvent() {
    if (!title.trim() || !date || (!allDay && !startTime)) return;
    setSaving(true);
    try {
      const startsAt = toIso(`${date}T${allDay ? '00:00' : startTime}:00`);
      const endsAt = !allDay && endTime
        ? toIso(`${date}T${endTime}:00`)
        : null;

      const body = {
        title, category, starts_at: startsAt, ends_at: endsAt,
        all_day: allDay, location, description,
      };

      if (editing) {
        await patch(`/calendar/${editing.id}`, body);
        toast.push('Evento atualizado.');
      } else {
        await post('/calendar', body);
        toast.push('Evento criado.');
      }

      setModalOpen(false);
      await loadEvents();
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar o evento.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent(event: CalendarEvent) {
    if (!window.confirm(`Excluir o evento "${event.title}"?`)) return;
    try {
      await del(`/calendar/${event.id}`);
      toast.push('Evento excluído.');
      await loadEvents();
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível excluir o evento.', 'error');
    }
  }

  return (
    <Shell nav={CALENDAR_NAV} sidebarEyebrow="Plataforma">
      <div className="space-y-6">
        <header className="mmv-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mmv-label">Organização e planejamento</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Calendário</h1>
            <p className="mt-1 text-sm text-muted">
              A agenda compartilhada do Ministério Mudança de Vida.
            </p>
          </div>
          {canManage && (
            <button
              onClick={openNew}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-strong px-4 text-sm font-medium text-white hover:bg-strong-soft"
            >
              <Plus className="h-4 w-4" /> Novo evento
            </button>
          )}
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="mmv-surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:px-5">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-brass" />
                <h2 className="text-base font-semibold capitalize text-ink">{monthLabel(month)}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  aria-label="Mês anterior"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-ink/[0.04]"
                ><ChevronLeft className="h-4 w-4" /></button>
                <button
                  onClick={() => {
                    const now = new Date();
                    setMonth(now);
                    setSelectedDay(dateKey(now));
                  }}
                  className="h-8 rounded-lg border border-line px-3 text-xs font-medium text-ink hover:bg-ink/[0.04]"
                >Hoje</button>
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  aria-label="Próximo mês"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-ink/[0.04]"
                ><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-line bg-canvas/60">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                <div key={day} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = dateKey(day);
                const dayEvents = events.filter((event) => dateKey(new Date(event.starts_at)) === key);
                const inMonth = day.getMonth() === month.getMonth();
                const selected = key === selectedDay;
                const today = key === dateKey(new Date());

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`min-h-[88px] border-b border-r border-line p-1.5 text-left transition-colors sm:min-h-[112px] sm:p-2 ${
                      selected ? 'bg-brass/[0.09]' : 'hover:bg-ink/[0.025]'
                    } ${!inMonth ? 'opacity-40' : ''}`}
                  >
                    <span className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs ${
                      today ? 'bg-strong font-semibold text-white' : selected ? 'bg-brass text-white' : 'text-ink'
                    }`}>{day.getDate()}</span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div key={event.id} className="truncate rounded px-1 py-0.5 text-[9px] font-medium text-ink sm:text-[10px]" style={{ backgroundColor: `${categoryColor(event.category)}25`, borderLeft: `2px solid ${categoryColor(event.category)}` }}>
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <p className="px-1 text-[9px] text-muted">+{dayEvents.length - 3} eventos</p>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line px-4 py-3">
              {categories.map((item) => (
                <span key={item.name} className="flex items-center gap-1.5 text-[10px] text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="mmv-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="mmv-label">Agenda do dia</p>
                  <h2 className="mt-1 text-sm font-semibold capitalize text-ink">{dayLabel(new Date(`${selectedDay}T12:00:00`))}</h2>
                </div>
                {canManage && (
                  <button onClick={openNew} title="Adicionar evento" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-ink/[0.04]">
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="py-5 text-center text-xs text-muted">Carregando agenda…</p>
                ) : selectedEvents.length === 0 ? (
                  <div className="rounded-lg bg-canvas px-3 py-6 text-center">
                    <CalendarDays className="mx-auto h-5 w-5 text-muted/60" />
                    <p className="mt-2 text-xs font-medium text-ink">Nenhum evento neste dia</p>
                    <p className="mt-1 text-[11px] text-muted">Selecione outra data no calendário.</p>
                  </div>
                ) : selectedEvents.map((event) => (
                  <article key={event.id} className="rounded-lg border border-line p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(event.category) }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{event.title}</p>
                        <p className="mt-1 text-[11px] text-muted">{event.source === 'studio' ? `Estúdio · ${event.category}` : event.category}</p>
                      </div>
                      {event.source === 'studio' && event.studio_event_id ? (
                        <Link to={`/m/studio/events/${event.studio_event_id}`} aria-label="Abrir evento do estúdio" className="rounded p-1 text-muted hover:bg-ink/[.05]"><CalendarDays className="h-3.5 w-3.5" /></Link>
                      ) : canManage && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(event)} aria-label="Editar evento" className="rounded p-1 text-muted hover:bg-ink/[0.05]"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => removeEvent(event)} aria-label="Excluir evento" className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 mt-2 space-y-1 text-[11px] text-muted">
                      <p className="flex items-center gap-1.5"><Clock3 className="h-3 w-3" />{event.all_day ? 'Dia inteiro' : `${timeLabel(event.starts_at)}${event.ends_at ? ` – ${timeLabel(event.ends_at)}` : ''}`}</p>
                      {event.location && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{event.location}</p>}
                      {event.description && <p className="pt-1 leading-relaxed">{event.description}</p>}
                      {event.source === 'studio' && <p className="pt-1 text-[10px] text-muted">{event.assignments ?? 0} designações · {event.checklist_runs ?? 0} checklists · {event.reports ?? 0} relatórios</p>}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mmv-surface p-4">
              <p className="mmv-label">Próximos eventos</p>
              <div className="mt-3 space-y-3">
                {upcoming.length === 0 ? (
                  <p className="text-xs text-muted">Nenhum evento próximo cadastrado.</p>
                ) : upcoming.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      const date = new Date(event.starts_at);
                      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                      setSelectedDay(dateKey(date));
                    }}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canvas text-center">
                      <span className="text-[9px] uppercase text-muted">{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(event.starts_at))}</span>
                      <span className="text-sm font-semibold text-ink">{new Date(event.starts_at).getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink">{event.title}</span>
                      <span className="mt-1 block text-[10px] text-muted">{event.all_day ? 'Dia inteiro' : timeLabel(event.starts_at)} · {event.source === 'studio' ? 'Evento do estúdio' : event.category}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/55 p-4">
          <div className="mmv-glass-modal my-auto w-full max-w-xl rounded-2xl border border-line bg-surface shadow-lift">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="mmv-label">Calendário compartilhado</p>
                <h2 className="mt-1 text-base font-semibold text-ink">{editing ? 'Editar evento' : 'Novo evento'}</h2>
              </div>
              <button onClick={() => setModalOpen(false)} aria-label="Fechar" className="rounded-lg p-2 text-muted hover:bg-ink/[0.05]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-ink">Título *</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do evento" className="mmv-form-control h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brass" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-ink">Categoria</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="mmv-form-control h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink">
                    {categories.map((item) => <option key={item.name}>{item.name}</option>)}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-ink">Data *</span>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mmv-form-control h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink" />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-ink">
                <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                Evento durante o dia inteiro
              </label>
              {!allDay && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-ink">Horário de início</span>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mmv-form-control h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-ink">Horário de término</span>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mmv-form-control h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink" />
                  </label>
                </div>
              )}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-ink">Local</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Local do evento" className="mmv-form-control h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-ink">Descrição</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Informações adicionais…" className="mmv-form-control w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brass" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button onClick={() => setModalOpen(false)} className="h-9 rounded-lg border border-line px-4 text-xs font-medium text-ink hover:bg-ink/[0.04]">Cancelar</button>
              <button onClick={saveEvent} disabled={saving || !title.trim() || !date || (!allDay && !startTime)} className="h-9 rounded-lg bg-strong px-4 text-xs font-medium text-white disabled:opacity-50">
                {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
