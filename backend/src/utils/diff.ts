function valuesEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

/**
 * Field-level before/after diff for audit logging. Only reports keys
 * present in `after` (the update payload) whose value actually changed —
 * not every field on `before`. Assumes primitive or flat-array values,
 * which covers every editable field on RopaRecord/User.
 */
export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(after)) {
    const oldValue = before[key];
    const newValue = after[key];
    if (!valuesEqual(oldValue, newValue)) {
      changes[key] = { old: oldValue, new: newValue };
    }
  }
  return changes;
}
