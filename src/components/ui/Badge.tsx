import type { ReactNode } from 'react';

type Tone = 'neutral' | 'positive' | 'negative' | 'warning' | 'accent';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-surface-raised text-text-muted border-border',
  positive: 'bg-positive-soft text-positive border-transparent',
  negative: 'bg-negative-soft text-negative border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  accent: 'bg-accent-soft text-accent border-transparent',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

/** A small solid dot in an arbitrary hex color — used for category identity in lists and legends. */
export function ColorDot({ color, className = '' }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}
