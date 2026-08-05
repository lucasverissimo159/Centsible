import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/Icon';
import { previewUpcoming, toISODate } from '@/domain/recurrence';
import { formatSignedAmount } from '@/domain/money';
import { useApp } from '@/store/AppContext';

const HORIZON_DAYS = 14;

function formatUpcomingDate(iso: string, locale: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

export function UpcomingRecurring() {
  const { state, categoryMap } = useApp();

  const upcoming = useMemo(() => {
    return previewUpcoming(state.recurringRules, new Date(), HORIZON_DAYS).slice(0, 6);
  }, [state.recurringRules]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-text-muted" />
          <CardTitle>Upcoming ({HORIZON_DAYS} days)</CardTitle>
        </div>
      </CardHeader>

      {upcoming.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">Nothing scheduled in the next {HORIZON_DAYS} days.</p>
      ) : (
        <ul className="divide-y divide-border">
          {upcoming.map(({ rule, date }) => {
            const category = categoryMap.get(rule.categoryId);
            const iso = toISODate(date);
            return (
              <li key={`${rule.id}-${iso}`} className="flex items-center gap-3 py-2.5">
                <CategoryIcon icon={category?.icon ?? 'tag'} color={category?.color ?? '#7C878E'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{rule.description}</p>
                  <p className="text-xs text-text-faint">{formatUpcomingDate(iso, state.settings.locale)}</p>
                </div>
                <p
                  className={`figure shrink-0 text-sm font-medium ${
                    rule.type === 'income' ? 'text-positive' : 'text-negative'
                  }`}
                >
                  {formatSignedAmount(rule.amountCents, rule.type, state.settings.locale, state.settings.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
