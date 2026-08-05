/**
 * A generic undo/redo enhancer for any (state, action) => state reducer,
 * in the spirit of `redux-undo`. It wraps `present` in a { past, present,
 * future } envelope and intercepts two extra action types.
 *
 * Kept intentionally dependency-free and generic — it knows nothing about
 * transactions or budgets, only about "some state" and "some actions".
 * Any action type listed in `exemptActionTypes` updates `present` without
 * pushing a history entry (useful for things like theme toggles that
 * shouldn't be Ctrl+Z-able).
 */

export interface UndoableState<T> {
  past: T[];
  present: T;
  future: T[];
}

export const UNDO = '@@undoable/UNDO';
export const REDO = '@@undoable/REDO';

export type UndoAction = { type: typeof UNDO };
export type RedoAction = { type: typeof REDO };

export function undo(): UndoAction {
  return { type: UNDO };
}

export function redo(): RedoAction {
  return { type: REDO };
}

export function createInitialUndoableState<T>(present: T): UndoableState<T> {
  return { past: [], present, future: [] };
}

interface UndoableOptions {
  /** Action `type` strings that should not create a history entry. */
  exemptActionTypes?: readonly string[];
  /** Caps memory use — oldest entries are dropped once this is exceeded. */
  maxHistory?: number;
}

export function undoable<T, A extends { type: string }>(
  reducer: (state: T, action: A) => T,
  options: UndoableOptions = {}
) {
  const exempt = new Set(options.exemptActionTypes ?? []);
  const maxHistory = options.maxHistory ?? 50;

  return function undoableReducer(state: UndoableState<T>, action: A | UndoAction | RedoAction): UndoableState<T> {
    const { past, present, future } = state;

    if (action.type === UNDO) {
      const previous = past[past.length - 1];
      if (previous === undefined) return state;
      return { past: past.slice(0, -1), present: previous, future: [present, ...future] };
    }

    if (action.type === REDO) {
      const next = future[0];
      if (next === undefined) return state;
      return { past: [...past, present], present: next, future: future.slice(1) };
    }

    const newPresent = reducer(present, action as A);
    if (newPresent === present) return state;

    if (exempt.has(action.type)) {
      return { past, present: newPresent, future };
    }

    const newPast = [...past, present].slice(-maxHistory);
    return { past: newPast, present: newPresent, future: [] };
  };
}
