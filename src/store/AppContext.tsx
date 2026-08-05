import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { AppState, Budget, Category, RecurringRule, Settings, Transaction } from '@/types';
import { appReducer, UNDO_EXEMPT_ACTION_TYPES } from './appReducer';
import { createInitialUndoableState, redo as redoAction, undo as undoAction, undoable } from './undoable';
import { clearPersistedState, loadPersistedState, persistState } from './persistence';
import { createEmptyState, createSeedState } from '@/domain/seedData';
import { materializeDueTransactions } from '@/domain/recurrence';
import { generateId } from '@/domain/id';
import { selectCategoryMap } from './selectors';

const undoableAppReducer = undoable(appReducer, {
  exemptActionTypes: UNDO_EXEMPT_ACTION_TYPES,
  maxHistory: 50,
});

function resolveInitialState(): AppState {
  return loadPersistedState() ?? createSeedState(new Date());
}

const PERSIST_DEBOUNCE_MS = 400;

interface AppContextValue {
  state: AppState;
  categoryMap: Map<string, Category>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  bulkDeleteTransactions: (ids: string[]) => void;
  importTransactions: (transactions: Transaction[]) => void;

  addCategory: (input: Omit<Category, 'id' | 'isDefault'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;

  addRecurringRule: (input: Omit<RecurringRule, 'id'>) => void;
  updateRecurringRule: (rule: RecurringRule) => void;
  deleteRecurringRule: (id: string) => void;
  toggleRecurringRulePaused: (id: string) => void;

  setBudget: (categoryId: string, monthlyLimitCents: number) => void;
  deleteBudget: (id: string) => void;

  updateSettings: (partial: Partial<Settings>) => void;

  resetToDemoData: () => void;
  resetToEmpty: () => void;
  restoreFromBackup: (state: AppState) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const FALLBACK_CATEGORY_ID = 'cat-other';

export function AppProvider({ children }: { children: ReactNode }) {
  const [history, dispatch] = useReducer(
    undoableAppReducer,
    undefined,
    () => createInitialUndoableState(resolveInitialState())
  );
  const state = history.present;

  // --- Materialize due recurring transactions on mount, and again whenever
  // the rule set itself changes (adding a rule should catch it up
  // immediately rather than waiting for the next page load). Re-running
  // after a MATERIALIZE_RECURRING that had nothing left to do is a no-op —
  // the reducer returns the same state reference, so this settles rather
  // than looping. See domain/recurrence.ts for why this is idempotent.
  useEffect(() => {
    const { newTransactions, updatedRules } = materializeDueTransactions(
      state.recurringRules,
      new Date(),
      new Date().toISOString()
    );
    if (newTransactions.length > 0) {
      dispatch({ type: 'MATERIALIZE_RECURRING', payload: { newTransactions, updatedRules } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.recurringRules]);

  // --- Debounced persistence: write-behind rather than on every keystroke.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => persistState(state), PERSIST_DEBOUNCE_MS);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [state]);

  // --- Theme sync.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.settings.theme === 'dark');
  }, [state.settings.theme]);

  const categoryMap = useMemo(() => selectCategoryMap(state.categories), [state.categories]);

  const undo = useCallback(() => dispatch(undoAction()), []);
  const redo = useCallback(() => dispatch(redoAction()), []);

  const addTransaction = useCallback((input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    dispatch({ type: 'ADD_TRANSACTION', payload: { ...input, id: generateId(), createdAt: now, updatedAt: now } });
  }, []);

  const updateTransaction = useCallback((transaction: Transaction) => {
    dispatch({
      type: 'UPDATE_TRANSACTION',
      payload: { ...transaction, updatedAt: new Date().toISOString() },
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: { id } });
  }, []);

  const bulkDeleteTransactions = useCallback((ids: string[]) => {
    dispatch({ type: 'BULK_DELETE_TRANSACTIONS', payload: { ids } });
  }, []);

  const importTransactions = useCallback((transactions: Transaction[]) => {
    dispatch({ type: 'IMPORT_TRANSACTIONS', payload: { transactions } });
  }, []);

  const addCategory = useCallback((input: Omit<Category, 'id' | 'isDefault'>) => {
    dispatch({ type: 'ADD_CATEGORY', payload: { ...input, id: generateId() } });
  }, []);

  const updateCategory = useCallback((category: Category) => {
    dispatch({ type: 'UPDATE_CATEGORY', payload: category });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: { id, fallbackCategoryId: FALLBACK_CATEGORY_ID } });
  }, []);

  const addRecurringRule = useCallback((input: Omit<RecurringRule, 'id'>) => {
    dispatch({ type: 'ADD_RECURRING_RULE', payload: { ...input, id: generateId() } });
  }, []);

  const updateRecurringRule = useCallback((rule: RecurringRule) => {
    dispatch({ type: 'UPDATE_RECURRING_RULE', payload: rule });
  }, []);

  const deleteRecurringRule = useCallback((id: string) => {
    dispatch({ type: 'DELETE_RECURRING_RULE', payload: { id } });
  }, []);

  const toggleRecurringRulePaused = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_RECURRING_RULE_PAUSED', payload: { id } });
  }, []);

  const setBudget = useCallback(
    (categoryId: string, monthlyLimitCents: number) => {
      const existing = state.budgets.find((b) => b.categoryId === categoryId);
      const payload: Budget = { id: existing?.id ?? generateId(), categoryId, monthlyLimitCents };
      dispatch({ type: 'SET_BUDGET', payload });
    },
    [state.budgets]
  );

  const deleteBudget = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BUDGET', payload: { id } });
  }, []);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: partial });
  }, []);

  const resetToDemoData = useCallback(() => {
    clearPersistedState();
    dispatch({ type: 'RESET_STATE', payload: createSeedState(new Date()) });
  }, []);

  const resetToEmpty = useCallback(() => {
    clearPersistedState();
    dispatch({ type: 'RESET_STATE', payload: createEmptyState() });
  }, []);

  const restoreFromBackup = useCallback((backup: AppState) => {
    dispatch({ type: 'LOAD_STATE', payload: backup });
  }, []);

  const value: AppContextValue = {
    state,
    categoryMap,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    bulkDeleteTransactions,
    importTransactions,
    addCategory,
    updateCategory,
    deleteCategory,
    addRecurringRule,
    updateRecurringRule,
    deleteRecurringRule,
    toggleRecurringRulePaused,
    setBudget,
    deleteBudget,
    updateSettings,
    resetToDemoData,
    resetToEmpty,
    restoreFromBackup,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp() must be called within <AppProvider>');
  return ctx;
}
