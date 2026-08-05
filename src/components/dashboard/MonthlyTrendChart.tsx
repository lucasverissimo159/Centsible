import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatMoney, getCurrencySymbol } from '@/domain/money';
import { monthLabel } from '@/store/selectors';
import type { MonthlyTotal, Settings } from '@/types';

function abbreviate(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value.toFixed(0)}`;
}

interface MonthlyTrendChartProps {
  data: MonthlyTotal[];
  settings: Settings;
}

export function MonthlyTrendChart({ data, settings }: MonthlyTrendChartProps) {
  const currencySymbol = getCurrencySymbol(settings.locale, settings.currency);
  const chartData = data.map((d) => ({
    label: monthLabel(d.month, settings.locale),
    income: d.incomeCents / 100,
    expense: d.expenseCents / 100,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs. expenses</CardTitle>
      </CardHeader>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="var(--color-text-faint)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => `${currencySymbol}${abbreviate(value)}`}
            />
            <Tooltip
              formatter={(value) => formatMoney(Math.round(Number(value ?? 0) * 100), settings.locale, settings.currency)}
              contentStyle={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 13,
              }}
              cursor={{ fill: 'var(--color-accent-soft)' }}
            />
            <Bar dataKey="income" name="Income" fill="var(--color-positive)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expense" name="Expense" fill="var(--color-negative)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
