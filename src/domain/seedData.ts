import type { AppState, Category, RecurringRule, Budget, Transaction, Settings } from '@/types';
import { generateId } from './id';
import { toISODate } from './recurrence';

/**
 * Demo data so the app is populated and legible the moment someone clones
 * the repo and runs `npm run dev` — the whole point of this file existing
 * is that a reviewer's first impression shouldn't be an empty dashboard.
 *
 * Recurring items (salary, rent, a subscription, ...) are NOT pre-baked as
 * plain transactions here. Only the RecurringRules are seeded; the actual
 * transaction rows are produced by running the real recurrence engine
 * (`materializeDueTransactions`) against them on first load, in
 * `store/AppContext.tsx`. That means the demo data exercises the same
 * code path a real user's recurring bills would.
 */

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-salary', name: 'Salary', color: '#1F6F5C', icon: 'briefcase', kind: 'income', isDefault: true },
  { id: 'cat-freelance', name: 'Freelance', color: '#4F8A6B', icon: 'laptop', kind: 'income', isDefault: true },
  { id: 'cat-groceries', name: 'Groceries', color: '#C77B3B', icon: 'shopping-cart', kind: 'expense', isDefault: true },
  { id: 'cat-rent', name: 'Rent', color: '#2E4057', icon: 'house', kind: 'expense', isDefault: true },
  { id: 'cat-utilities', name: 'Utilities', color: '#3B7A94', icon: 'zap', kind: 'expense', isDefault: true },
  { id: 'cat-transportation', name: 'Transportation', color: '#6B7FA3', icon: 'car', kind: 'expense', isDefault: true },
  { id: 'cat-dining', name: 'Dining Out', color: '#B5482A', icon: 'utensils', kind: 'expense', isDefault: true },
  { id: 'cat-entertainment', name: 'Entertainment', color: '#7A5C8E', icon: 'film', kind: 'expense', isDefault: true },
  { id: 'cat-shopping', name: 'Shopping', color: '#A34E6E', icon: 'shirt', kind: 'expense', isDefault: true },
  { id: 'cat-healthcare', name: 'Healthcare', color: '#4A7C59', icon: 'heart-pulse', kind: 'expense', isDefault: true },
  { id: 'cat-subscriptions', name: 'Subscriptions', color: '#6B5B95', icon: 'repeat', kind: 'expense', isDefault: true },
  { id: 'cat-travel', name: 'Travel', color: '#C2954A', icon: 'plane', kind: 'expense', isDefault: true },
  { id: 'cat-other', name: 'Other', color: '#7C878E', icon: 'tag', kind: 'both', isDefault: true },
];

export const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  locale: 'en-US',
  theme: 'light',
};

function monthsAgo(today: Date, months: number, day: number): Date {
  return new Date(today.getFullYear(), today.getMonth() - months, day);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  const item = items[randomInt(0, items.length - 1)];
  if (item === undefined) throw new Error('pick() called on an empty array');
  return item;
}

function makeRecurringRules(today: Date): RecurringRule[] {
  return [
    {
      id: 'rule-salary',
      type: 'income',
      amountCents: 520_000,
      categoryId: 'cat-salary',
      description: 'Monthly salary',
      frequency: 'monthly',
      interval: 1,
      startDate: toISODate(monthsAgo(today, 6, 1)),
    },
    {
      id: 'rule-freelance',
      type: 'income',
      amountCents: 60_000,
      categoryId: 'cat-freelance',
      description: 'Freelance retainer',
      frequency: 'weekly',
      interval: 2,
      startDate: toISODate(monthsAgo(today, 6, 3)),
    },
    {
      id: 'rule-rent',
      type: 'expense',
      amountCents: 185_000,
      categoryId: 'cat-rent',
      description: 'Rent',
      frequency: 'monthly',
      interval: 1,
      startDate: toISODate(monthsAgo(today, 6, 1)),
    },
    {
      id: 'rule-streaming',
      type: 'expense',
      amountCents: 1_599,
      categoryId: 'cat-subscriptions',
      description: 'Streaming subscription',
      frequency: 'monthly',
      interval: 1,
      startDate: toISODate(monthsAgo(today, 6, 15)),
    },
    {
      id: 'rule-car-insurance',
      type: 'expense',
      amountCents: 68_000,
      categoryId: 'cat-transportation',
      description: 'Car insurance (annual)',
      frequency: 'yearly',
      interval: 1,
      startDate: toISODate(monthsAgo(today, 14, 20)),
    },
  ];
}

function makeBudgets(): Budget[] {
  return [
    { id: generateId(), categoryId: 'cat-groceries', monthlyLimitCents: 50_000 },
    { id: generateId(), categoryId: 'cat-dining', monthlyLimitCents: 25_000 },
    { id: generateId(), categoryId: 'cat-entertainment', monthlyLimitCents: 12_000 },
    { id: generateId(), categoryId: 'cat-shopping', monthlyLimitCents: 20_000 },
  ];
}

interface SpendCategoryProfile {
  categoryId: string;
  perMonth: [min: number, max: number];
  amountRangeCents: [min: number, max: number];
  descriptions: string[];
}

const SPEND_PROFILES: SpendCategoryProfile[] = [
  {
    categoryId: 'cat-groceries',
    perMonth: [7, 10],
    amountRangeCents: [1500, 9000],
    descriptions: ["Whole Foods Market", "Trader Joe's", 'Local farmers market', 'Corner grocery', 'Costco run'],
  },
  {
    categoryId: 'cat-dining',
    perMonth: [5, 9],
    amountRangeCents: [1200, 6500],
    descriptions: ['Sushi Kaido', 'Pizza night', 'Weekend brunch', 'Thai takeout', 'Coffee & pastry', 'Taco Tuesday'],
  },
  {
    categoryId: 'cat-entertainment',
    perMonth: [2, 4],
    amountRangeCents: [1000, 6000],
    descriptions: ['Movie tickets', 'Concert tickets', 'Streaming rental', 'Bowling night', 'Museum admission'],
  },
  {
    categoryId: 'cat-shopping',
    perMonth: [2, 4],
    amountRangeCents: [2000, 15000],
    descriptions: ['New running shoes', 'Home goods', 'Book haul', 'Winter jacket', 'Desk accessories'],
  },
  {
    categoryId: 'cat-transportation',
    perMonth: [3, 6],
    amountRangeCents: [800, 4500],
    descriptions: ['Gas fill-up', 'Rideshare', 'Monthly transit pass', 'Parking garage', 'Bike tune-up'],
  },
  {
    categoryId: 'cat-utilities',
    perMonth: [2, 3],
    amountRangeCents: [4000, 12000],
    descriptions: ['Electric bill', 'Internet bill', 'Water bill'],
  },
  {
    categoryId: 'cat-healthcare',
    perMonth: [0, 2],
    amountRangeCents: [2000, 12000],
    descriptions: ['Pharmacy pickup', 'Dental cleaning copay', 'Annual checkup copay'],
  },
];

/** One-off big travel expenses, sprinkled into just one or two of the recent months. */
const TRAVEL_DESCRIPTIONS = ['Flight to Denver', 'Weekend hotel stay', 'Car rental'];

function generateOneOffTransactions(today: Date): Transaction[] {
  const transactions: Transaction[] = [];
  const MONTHS_BACK = 5;

  for (let m = MONTHS_BACK; m >= 0; m -= 1) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const isCurrentMonth = m === 0;
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    // For the current (partial) month, only scatter transactions up through today.
    const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;

    for (const profile of SPEND_PROFILES) {
      const count = randomInt(...profile.perMonth);
      for (let i = 0; i < count; i += 1) {
        const day = randomInt(1, Math.max(1, maxDay));
        const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        const amountCents = randomInt(...profile.amountRangeCents);
        const isoDate = toISODate(date);
        transactions.push({
          id: generateId(),
          type: 'expense',
          amountCents,
          categoryId: profile.categoryId,
          description: pick(profile.descriptions),
          date: isoDate,
          createdAt: `${isoDate}T12:00:00.000Z`,
          updatedAt: `${isoDate}T12:00:00.000Z`,
        });
      }
    }

    // Sprinkle one travel expense into a single past month for variety.
    if (m === 2) {
      const day = randomInt(1, daysInMonth);
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const isoDate = toISODate(date);
      transactions.push({
        id: generateId(),
        type: 'expense',
        amountCents: randomInt(20000, 60000),
        categoryId: 'cat-travel',
        description: pick(TRAVEL_DESCRIPTIONS),
        date: isoDate,
        createdAt: `${isoDate}T12:00:00.000Z`,
        updatedAt: `${isoDate}T12:00:00.000Z`,
      });
    }
  }

  return transactions;
}

export function createSeedState(today: Date = new Date()): AppState {
  return {
    transactions: generateOneOffTransactions(today),
    categories: DEFAULT_CATEGORIES,
    recurringRules: makeRecurringRules(today),
    budgets: makeBudgets(),
    settings: DEFAULT_SETTINGS,
  };
}

export function createEmptyState(): AppState {
  return {
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    recurringRules: [],
    budgets: [],
    settings: DEFAULT_SETTINGS,
  };
}
