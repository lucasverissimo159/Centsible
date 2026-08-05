/**
 * Generates a unique id. Uses the platform crypto API where available
 * (every evergreen browser) and falls back to a timestamp+random string
 * so the app never hard-crashes in an unusual embedding context.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
