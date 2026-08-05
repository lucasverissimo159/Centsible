import type { AppState, Budget, Category, RecurringRule, Settings, Transaction } from '@/types';

export type AppAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: { id: string } }
  | { type: 'BULK_DELETE_TRANSACTIONS'; payload: { ids: string[] } }
  | { type: 'IMPORT_TRANSACTIONS'; payload: { transactions: Transaction[] } }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: { id: string; fallbackCategoryId: string } }
  | { type: 'ADD_RECURRING_RULE'; payload: RecurringRule }
  | { type: 'UPDATE_RECURRING_RULE'; payload: RecurringRule }
  | { type: 'DELETE_RECURRING_RULE'; payload: { id: string } }
  | { type: 'TOGGLE_RECURRING_RULE_PAUSED'; payload: { id: string } }
  | { type: 'MATERIALIZE_RECURRING'; payload: { newTransactions: Transaction[]; updatedRules: RecurringRule[] } }
  | { type: 'SET_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: { id: string } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'RESET_STATE'; payload: AppState };

/** Action types that should never create an undo/redo history entry. */
export const UNDO_EXEMPT_ACTION_TYPES: readonly AppAction['type'][] = [
  'UPDATE_SETTINGS',
  'LOAD_STATE',
  'RESET_STATE',
  'MATERIALIZE_RECURRING',
];

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };

    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };

    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.payload.id) };

    case 'BULK_DELETE_TRANSACTIONS': {
      const idsToRemove = new Set(action.payload.ids);
      return { ...state, transactions: state.transactions.filter((t) => !idsToRemove.has(t.id)) };
    }

    case 'IMPORT_TRANSACTIONS':
      return { ...state, transactions: [...state.transactions, ...action.payload.transactions] };

    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };

    case 'DELETE_CATEGORY': {
      const { id, fallbackCategoryId } = action.payload;
      if (id === fallbackCategoryId) return state; // guard: can't delete the fallback bucket itself
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== id),
        transactions: state.transactions.map((t) =>
          t.categoryId === id ? { ...t, categoryId: fallbackCategoryId } : t
        ),
        recurringRules: state.recurringRules.map((r) =>
          r.categoryId === id ? { ...r, categoryId: fallbackCategoryId } : r
        ),
        budgets: state.budgets.filter((b) => b.categoryId !== id),
      };
    }

    case 'ADD_RECURRING_RULE':
      return { ...state, recurringRules: [...state.recurringRules, action.payload] };

    case 'UPDATE_RECURRING_RULE':
      return {
        ...state,
        recurringRules: state.recurringRules.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };

    case 'DELETE_RECURRING_RULE':
      return { ...state, recurringRules: state.recurringRules.filter((r) => r.id !== action.payload.id) };

    case 'TOGGLE_RECURRING_RULE_PAUSED':
      return {
        ...state,
        recurringRules: state.recurringRules.map((r) =>
          r.id === action.payload.id ? { ...r, isPaused: !r.isPaused } : r
        ),
      };

    case 'MATERIALIZE_RECURRING': {
      const { newTransactions, updatedRules } = action.payload;
      if (newTransactions.length === 0) return state;
      const updatedById = new Map(updatedRules.map((r) => [r.id, r]));
      return {
        ...state,
        transactions: [...state.transactions, ...newTransactions],
        recurringRules: state.recurringRules.map((r) => updatedById.get(r.id) ?? r),
      };
    }

    case 'SET_BUDGET': {
      const exists = state.budgets.some((b) => b.categoryId === action.payload.categoryId);
      return {
        ...state,
        budgets: exists
          ? state.budgets.map((b) => (b.categoryId === action.payload.categoryId ? action.payload : b))
          : [...state.budgets, action.payload],
      };
    }

    case 'DELETE_BUDGET':
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.payload.id) };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'LOAD_STATE':
    case 'RESET_STATE':
      return action.payload;

    default:
      return state;
  }
}
