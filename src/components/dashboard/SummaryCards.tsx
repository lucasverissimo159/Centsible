import type { ReactNode } from 'react';
import { Landmark, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/domain/money';
import type { SummaryFigures } from '@/store/selectors';
import type { Settings } from '@/types';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
}

function StatCard({ icon, label, value, tone }: StatCardProps) {
  const toneClass = tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : 'text-text';
  return (
    <Card className="flex items-start gap-2.5 !p-3.5 sm:gap-3 sm:!p-5">
      <span className="shrink-0 rounded-md bg-surface-raised p-1.5 text-text-muted sm:p-2">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs text-text-muted">{label}</p>
        <p className={`figure mt-0.5 truncate text-base font-semibold sm:text-lg ${toneClass}`}>{value}</p>
      </div>
    </Card>
  );
}

interface SummaryCardsProps {
  summary: SummaryFigures;
  settings: Settings;
}

export function SummaryCards({ summary, settings }: SummaryCardsProps) {
  const fmt = (cents: number) => formatMoney(cents, settings.locale, settings.currency);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard icon={<Landmark size={18} />} label="Total balance" value={fmt(summary.balanceCents)} />
      <StatCard
        icon={<TrendingUp size={18} />}
        label="Income this month"
        value={fmt(summary.monthIncomeCents)}
        tone="positive"
      />
      <StatCard
        icon={<TrendingDown size={18} />}
        label="Expenses this month"
        value={fmt(summary.monthExpenseCents)}
        tone="negative"
      />
      <StatCard
        icon={<PiggyBank size={18} />}
        label="Savings rate"
        value={summary.savingsRatePercent === null ? '—' : `${summary.savingsRatePercent.toFixed(0)}%`}
      />
    </div>
  );
}
