import { useEffect, useState } from 'react';
import type { BudgetStatus } from '@/types';

const STATUS_CLASSES: Record<BudgetStatus, string> = {
  under: 'bg-positive',
  warning: 'bg-warning',
  over: 'bg-negative',
};

interface ProgressBarProps {
  percent: number;
  status: BudgetStatus;
  label?: string;
}

export function ProgressBar({ percent, status, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  // Animate the fill in on mount rather than snapping to its final width.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-raised"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${STATUS_CLASSES[status]}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
