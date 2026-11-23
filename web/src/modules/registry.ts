import {
  AudioLines,
  Boxes,
  Boxes as BoxesIcon,
  CalendarDays,
  Clapperboard,
  LayoutGrid,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
  Building2,
  MessageSquare,
  Home,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  minLevel?: number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Navegação interna registrada por cada módulo (independente entre módulos). */
export const MODULE_NAV: Record<string, NavGroup[]> = {
  communication: [{ title: 'Comunicação institucional', items: [
    { label: 'Comunicados', to: '/m/communication', icon: MessageSquare, end: true },
  ]}],
  departments: [{ title: 'Departamentos', items: [
    { label: 'Visão geral', to: '/m/departments', icon: Building2, end: true },
  ]}],
  people: [{ title: 'Pessoas', items: [
    { label: 'Diretório', to: '/m/people', icon: Users, end: true },
  ]}],

};

export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'Gestão institucional',
    items: [
      { label: 'Visão geral', to: '/admin', icon: Home, end: true, minLevel: 4 },
      { label: 'Usuários', to: '/admin/users', icon: Users, minLevel: 5 },
      { label: 'Módulos', to: '/admin/modules', icon: Boxes, minLevel: 5 },
      { label: 'Setores', to: '/admin/sectors', icon: ShieldCheck, minLevel: 4 },
      { label: 'Configurações', to: '/admin/settings', icon: Settings2, minLevel: 4 },
      { label: 'Auditoria', to: '/admin/audit', icon: ScrollText, minLevel: 4 },
    ],
  },
];

const MODULE_ICONS: Record<string, LucideIcon> = {
  AudioLines,
  Clapperboard,
  Boxes: BoxesIcon,
  LayoutGrid,
  Users,
  Building2,
  MessageSquare,
};

export function moduleIcon(name?: string | null): LucideIcon {
  return (name && MODULE_ICONS[name]) || BoxesIcon;
}

export function navGroups(groups: NavGroup[] | undefined, level: number): NavGroup[] {
  if (!groups) return [];
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => level >= (item.minLevel ?? 1)),
    }))
    .filter((group) => group.items.length > 0);
}

export function moduleTopics(moduleKey: string, limit = 4): string[] {
  const groups = MODULE_NAV[moduleKey];
  if (!groups) return [];
  return groups
    .flatMap((group) => group.items.map((item) => item.label))
    .filter((label) => label !== 'Usuários' && label !== 'Configurações')
    .slice(0, limit);
}


export const CALENDAR_NAV: NavGroup[] = [
  {
    title: 'Agenda',
    items: [
      { label: 'Calendário', to: '/calendar', icon: CalendarDays, end: true },
    ],
  },
];
