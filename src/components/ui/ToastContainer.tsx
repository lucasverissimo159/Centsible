import { createPortal } from 'react-dom';
import { CircleAlert, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { ToastMessage } from '@/types';

const TONE_ACCENT: Record<ToastMessage['tone'], string> = {
  default: 'bg-accent',
  success: 'bg-positive',
  danger: 'bg-negative',
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-[min(92vw,22rem)] items-center gap-3 overflow-hidden rounded-lg border border-border bg-surface-raised py-3 pl-0 pr-3 shadow-lg animate-rise"
        >
          <span className={`h-full min-h-10 w-1 self-stretch ${TONE_ACCENT[toast.tone]}`} aria-hidden="true" />
          {toast.tone === 'danger' && <CircleAlert size={16} className="shrink-0 text-negative" aria-hidden="true" />}
          <p className="flex-1 text-sm text-text">{toast.text}</p>
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={() => {
                toast.onAction?.();
                dismissToast(toast.id);
              }}
              className="shrink-0 text-sm font-semibold text-accent hover:underline"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 text-text-faint hover:text-text"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
