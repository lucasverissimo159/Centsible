import type { AppState } from '@/types';

/**
 * Every real app's data shape changes over time. Writing the raw AppState
 * straight into localStorage works fine until the day you add a required
 * field and every existing user's saved data is suddenly malformed. The
 * fix costs almost nothing up front: wrap the payload in an envelope that
 * carries a schema version, and keep a chain of migration functions.
 *
 * There is exactly one schema version so far, so MIGRATIONS is empty — but
 * the shape is here so that "add a field to Transaction" becomes "bump
 * CURRENT_VERSION and add one migration function", not a breaking change.
 */

export const STORAGE_KEY = 'centsible:data';
export const CURRENT_VERSION = 1;

interface PersistedEnvelope {
  version: number;
  data: unknown;
}

type Migration = (data: unknown) => unknown;

/** Keyed by the version being migrated FROM. MIGRATIONS[1] takes v1 data and returns v2 data. */
const MIGRATIONS: Record<number, Migration> = {
  // 1: (data) => migrateV1toV2(data),
};

function runMigrations(envelope: PersistedEnvelope): unknown {
  let { version, data } = envelope;
  while (version < CURRENT_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      throw new Error(`No migration registered for schema version ${version}`);
    }
    data = migrate(data);
    version += 1;
  }
  return data;
}

/** Minimal structural check — enough to catch corrupted/foreign data without a full schema validator. */
function isPlausibleAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.transactions) &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.recurringRules) &&
    Array.isArray(candidate.budgets) &&
    typeof candidate.settings === 'object' &&
    candidate.settings !== null
  );
}

export function loadPersistedState(): AppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as PersistedEnvelope;
    const migrated = runMigrations(envelope);
    return isPlausibleAppState(migrated) ? migrated : null;
  } catch (error) {
    console.error('Centsible: failed to load saved data, starting fresh.', error);
    return null;
  }
}

export function persistState(state: AppState): void {
  try {
    const envelope: PersistedEnvelope = { version: CURRENT_VERSION, data: state };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch (error) {
    console.error('Centsible: failed to save data.', error);
  }
}

export function clearPersistedState(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
