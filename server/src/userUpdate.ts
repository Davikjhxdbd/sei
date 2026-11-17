const USER_PATCH_FIELDS = new Set(['full_name', 'email', 'status']);

export function buildUserUpdateQuery(
  patch: Record<string, unknown>,
  targetId: string,
): { text: string; values: unknown[] } | null {
  const entries = Object.entries(patch).filter(([key]) =>
    USER_PATCH_FIELDS.has(key),
  );
  if (!entries.length) return null;

  const assignments = entries
    .map(([key], index) => `${key} = $${index + 1}`)
    .join(', ');

  return {
    text: `update users set ${assignments}, updated_at = now() where id = $${entries.length + 1}`,
    values: [...entries.map(([, value]) => value), targetId],
  };
}
