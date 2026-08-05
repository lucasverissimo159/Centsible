import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ToastMessage } from '@/types';
import { generateId } from '@/domain/id';

const DEFAULT_DURATION_MS = 4000;
const ACTION_DURATION_MS = 6000;

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (input: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (input: Omit<ToastMessage, 'id'>) => {
      const id = generateId();
      setToasts((current) => [...current, { ...input, id }]);
      const duration = input.actionLabel ? ACTION_DURATION_MS : DEFAULT_DURATION_MS;
      setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast]
  );

  return <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() must be called within <ToastProvider>');
  return ctx;
}
