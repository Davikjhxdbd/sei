export const WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

interface ToneMap {
  [key: string]: { label: string; tone: string };
}

export const EVENT_STATUS: ToneMap = {
  scheduled: { label: 'Agendado', tone: 'info' },
  completed: { label: 'Concluído', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
};

export const TASK_STATUS: ToneMap = {
  pending: { label: 'Pendente', tone: 'neutral' },
  done: { label: 'Concluída', tone: 'success' },
  blocked: { label: 'Bloqueada', tone: 'warning' },
};

export const REPORT_STATUS: ToneMap = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  in_review: { label: 'Em revisão', tone: 'warning' },
  finalized: { label: 'Finalizado', tone: 'success' },
};

export const ERROR_STATUS: ToneMap = {
  open: { label: 'Aberto', tone: 'warning' },
  in_analysis: { label: 'Em análise', tone: 'info' },
  resolved: { label: 'Resolvido', tone: 'success' },
  closed: { label: 'Encerrado', tone: 'neutral' },
};

export const SEVERITY: ToneMap = {
  low: { label: 'Baixa', tone: 'neutral' },
  medium: { label: 'Média', tone: 'info' },
  high: { label: 'Alta', tone: 'warning' },
  critical: { label: 'Crítica', tone: 'danger' },
};

export const OCCURRENCE_STATUS: ToneMap = {
  registered: { label: 'Registrada', tone: 'info' },
  under_review: { label: 'Em análise', tone: 'warning' },
  closed: { label: 'Encerrada', tone: 'neutral' },
};

export const PROBLEM_STATUS: ToneMap = {
  open: { label: 'Aberto', tone: 'warning' },
  in_analysis: { label: 'Em análise', tone: 'info' },
  solution_proposed: { label: 'Solução proposta', tone: 'info' },
  awaiting_authorization: { label: 'Aguardando autorização', tone: 'warning' },
  in_progress: { label: 'Em execução', tone: 'info' },
  resolved: { label: 'Resolvido', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
};

export const ASSIGNMENT_STATUS: ToneMap = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  published: { label: 'Publicada', tone: 'success' },
  ended: { label: 'Encerrada', tone: 'neutral' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
};

export const READINESS: ToneMap = {
  ready: { label: 'Pronto', tone: 'success' },
  attention: { label: 'Atenção', tone: 'warning' },
  unavailable: { label: 'Indisponível', tone: 'danger' },
};

export const MEDIA_STATUS: ToneMap = {
  awaiting_edit: { label: 'Aguardando edição', tone: 'warning' },
  in_edit: { label: 'Em edição', tone: 'info' },
  awaiting_publication: { label: 'Aguardando publicação', tone: 'info' },
  published: { label: 'Publicado', tone: 'success' },
  reported_lost: { label: 'Reportado como perdido', tone: 'danger' },
  not_found: { label: 'Não localizado', tone: 'danger' },
};

export const AUTH_STATUS: ToneMap = {
  active: { label: 'Ativa', tone: 'success' },
  pending: { label: 'Pendente', tone: 'warning' },
  suspended: { label: 'Suspensa', tone: 'danger' },
  inactive: { label: 'Inativa', tone: 'neutral' },
};

export const ROLE_LABELS: Record<string, string> = {
  member: 'Membro',
  sector_lead: 'Líder de setor',
  studio_lead: 'Líder do estúdio',
  senior_lead: 'Liderança sênior',
  sysadmin: 'Administrador do sistema',
};

export const AUTHORIZATION_STATUS: ToneMap = {
  pending: { label: 'Pendente', tone: 'warning' },
  approved: { label: 'Aprovada', tone: 'success' },
  rejected: { label: 'Reprovada', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function formatTime(value?: string | null) {
  if (!value) return '—';
  const raw = String(value);
  if (/^\d{2}:\d{2}/.test(raw) && raw.length <= 8) return raw.slice(0, 5);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return timeFormatter.format(date);
}

export function formatDayLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function toDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function initials(name?: string | null) {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
