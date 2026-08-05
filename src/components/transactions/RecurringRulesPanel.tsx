import { Pause, Play, Repeat, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/Icon';
import { describeRecurrence } from '@/domain/recurrence';
import { formatSignedAmount } from '@/domain/money';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';

export function RecurringRulesPanel() {
  const { state, categoryMap, deleteRecurringRule, toggleRecurringRulePaused } = useApp();
  const { showToast } = useToast();

  if (state.recurringRules.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Repeat size={16} className="text-text-muted" />
          <CardTitle>Recurring</CardTitle>
        </div>
        <span className="text-xs text-text-faint">{state.recurringRules.length} rules</span>
      </CardHeader>

      <ul className="divide-y divide-border">
        {state.recurringRules.map((rule) => {
          const category = categoryMap.get(rule.categoryId);
          return (
            <li key={rule.id} className={`flex items-center gap-3 py-2.5 ${rule.isPaused ? 'opacity-50' : ''}`}>
              <CategoryIcon icon={category?.icon ?? 'tag'} color={category?.color ?? '#7C878E'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{rule.description}</p>
                <p className="truncate text-xs text-text-muted">
                  {describeRecurrence(rule)}
                  {rule.isPaused && ' · Paused'}
                </p>
              </div>
              <p
                className={`figure shrink-0 text-sm font-medium ${
                  rule.type === 'income' ? 'text-positive' : 'text-negative'
                }`}
              >
                {formatSignedAmount(rule.amountCents, rule.type, state.settings.locale, state.settings.currency)}
              </p>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => toggleRecurringRulePaused(rule.id)}
                  aria-label={rule.isPaused ? `Resume ${rule.description}` : `Pause ${rule.description}`}
                  className="rounded p-1.5 text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
                >
                  {rule.isPaused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button
                  onClick={() => {
                    deleteRecurringRule(rule.id);
                    showToast({ text: 'Recurring rule deleted. Past transactions it created are kept.', tone: 'default' });
                  }}
                  aria-label={`Delete ${rule.description}`}
                  className="rounded p-1.5 text-text-faint transition-colors hover:bg-negative-soft hover:text-negative"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
