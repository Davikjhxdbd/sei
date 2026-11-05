import {
  AudioLines,
  Boxes,
  Boxes as BoxesIcon,
  CalendarDays,
  Clapperboard,
  FileText,
  Film,
  Gauge,
  Gavel,
  LayoutGrid,
  ListChecks,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
  Users2,
  Bug,
  Layers,
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
  studio: [
    {
      title: 'Operação',
      items: [
        { label: 'Painel', to: '/m/studio', icon: Gauge, end: true },
        { label: 'Eventos', to: '/m/studio/events', icon: CalendarDays },
        { label: 'Escalas', to: '/m/studio/schedules', icon: Users2 },
        { label: 'Checklists', to: '/m/studio/checklists', icon: ListChecks },
        { label: 'Relatórios', to: '/m/studio/reports', icon: FileText },
      ],
    },
    {
      title: 'Qualidade',
      items: [
        { label: 'Erros', to: '/m/studio/errors', icon: Bug },
        { label: 'Problemas', to: '/m/studio/problems', icon: Layers },
        { label: 'Ocorrências', to: '/m/studio/occurrences', icon: Gavel, minLevel: 3 },
      ],
    },
    {
      title: 'Acervo',
      items: [{ label: 'Mídia', to: '/m/studio/media', icon: Film }],
    },
    {
      title: 'Administração',
      items: [
        { label: 'Presets de eventos', to: '/m/studio/presets', icon: CalendarDays, minLevel: 1 },
        { label: 'Configurações', to: '/m/studio/settings', icon: Settings2, minLevel: 4 },
        { label: 'Usuários', to: '/admin/users', icon: Users, minLevel: 5 },
        { label: 'Auditoria', to: '/admin/audit', icon: ScrollText, minLevel: 4 },
      ],
    },
  ],
};

export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'Plataforma',
    items: [
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
  Film,
  ListChecks,
  LayoutGrid,
  Users,
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
