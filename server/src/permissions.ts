/**
 * Modelo de autorização global do MMV Connect.
 *
 * Um único lugar define o nível mínimo para cada ação. A interface usa a
 * mesma matriz (via /api/auth/me) apenas para esconder o que não é permitido —
 * a decisão real é sempre tomada aqui, no servidor.
 */

export const ROLE_LABELS: Record<string, string> = {
  member: 'Membro',
  sector_lead: 'Líder de setor',
  studio_lead: 'Líder do estúdio',
  senior_lead: 'Liderança sênior',
  sysadmin: 'Administrador do sistema',
};

export const ROLE_LEVELS: Record<string, number> = {
  member: 1,
  sector_lead: 2,
  studio_lead: 3,
  senior_lead: 4,
  sysadmin: 5,
};

/** Nível mínimo exigido por ação. */
export const ACTIONS = {
  // eventos
  'events.view': 1,
  'events.create': 2,
  'events.edit': 2,
  'events.manage': 3, // concluir / cancelar
  'events.delete': 4,
  // presets
  'presets.view': 1,
  'presets.manage': 3,
  // checklists
  'checklists.view': 1,
  'checklists.run': 2,
  'checklists.assign': 2,
  'checklists.manage': 3,
  // relatórios
  'reports.view': 1,
  'reports.create': 2,
  'reports.edit': 2,
  'reports.finalize': 3,
  'reports.reopen': 4,
  // erros
  'errors.view': 1,
  'errors.create': 1,
  'errors.edit': 2,
  'errors.delete': 4,
  // ocorrências administrativas
  'occurrences.view': 3,
  'occurrences.manage': 3,
  // problemas
  'problems.view': 1,
  'problems.create': 2,
  'problems.edit': 2,
  'problems.decide': 4,
  // escalas
  'schedules.view': 1,
  'schedules.manage': 3,
  // mídia
  'media.view': 1,
  'media.create': 2,
  'media.edit': 2,
  'media.delete': 4,
  // plataforma
  'users.view': 5,
  'users.manage': 5,
  'sectors.manage': 4,
  'settings.view': 4,
  'settings.manage': 4,
  'modules.manage': 5,
  'audit.view': 4,
} as const;

export type Action = keyof typeof ACTIONS;

export function can(level: number, action: Action): boolean {
  return level >= ACTIONS[action];
}

export function assertAction(level: number, action: Action): void {
  if (!can(level, action)) {
    const error = new Error('Seu cargo não permite executar esta ação.');
    (error as any).status = 403;
    (error as any).code = 'forbidden';
    throw error;
  }
}

/** Ações que o usuário pode executar — enviadas ao frontend. */
export function allowedActions(level: number): Action[] {
  return (Object.keys(ACTIONS) as Action[]).filter((a) => can(level, a));
}

/** Nível de cada ação — usado pela interface para decisões finas. */
export function actionLevels(): Record<string, number> {
  return { ...ACTIONS };
}
