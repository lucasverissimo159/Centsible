import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

/**
 * The app's one surface primitive. Deliberately shadow-free — separation
 * between surfaces comes from a 1px border, the way a ruled ledger page
 * separates sections with a line rather than by lifting them off the page.
 */
export function Card({ children, padded = true, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface ${padded ? 'p-5' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 flex items-center justify-between gap-3 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`font-display text-base font-semibold text-text ${className}`}>{children}</h3>;
}
