import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { ColorDot } from '@/components/ui/Badge';
import { formatMoney } from '@/domain/money';
import type { Category, CategoryTotal, Settings } from '@/types';

interface CategoryBreakdownChartProps {
  data: CategoryTotal[];
  categoryMap: Map<string, Category>;
  settings: Settings;
}

export function CategoryBreakdownChart({ data, categoryMap, settings }: CategoryBreakdownChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    name: categoryMap.get(d.categoryId)?.name ?? 'Other',
    color: categoryMap.get(d.categoryId)?.color ?? '#7C878E',
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
      </CardHeader>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-muted">No expenses recorded this month yet.</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="totalCents"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.categoryId} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatMoney(Number(value ?? 0), settings.locale, settings.currency)}
                  contentStyle={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-2.5">
            {chartData.slice(0, 6).map((entry) => (
              <li key={entry.categoryId} className="flex items-center gap-2 text-sm">
                <ColorDot color={entry.color} />
                <span className="min-w-0 flex-1 truncate text-text-muted">{entry.name}</span>
                <span className="figure shrink-0 font-medium text-text">
                  {formatMoney(entry.totalCents, settings.locale, settings.currency)}
                </span>
                <span className="w-9 shrink-0 text-right text-xs text-text-faint">
                  {entry.percentOfTotal.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
