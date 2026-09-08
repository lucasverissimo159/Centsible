import type { AppState, Budget, Category, RecurringRule, Transaction } from '@/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTransaction(value: unknown, categoryIds: Set<string>): value is Transaction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    (value.type === 'income' || value.type === 'expense') &&
    typeof value.amountCents === 'number' &&
    Number.isSafeInteger(value.amountCents) &&
    value.amountCents > 0 &&
    typeof value.categoryId === 'string' &&
    categoryIds.has(value.categoryId) &&
    typeof value.description === 'string' &&
    isIsoDate(value.date) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isCategory(value: unknown): value is Category {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.color === 'string' &&
    typeof value.icon === 'string' &&
    (value.kind === 'income' || value.kind === 'expense' || value.kind === 'both')
  );
}

function isRecurringRule(value: unknown, categoryIds: Set<string>): value is RecurringRule {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    (value.type === 'income' || value.type === 'expense') &&
    typeof value.amountCents === 'number' &&
    Number.isSafeInteger(value.amountCents) &&
    value.amountCents > 0 &&
    typeof value.categoryId === 'string' &&
    categoryIds.has(value.categoryId) &&
    typeof value.description === 'string' &&
    (value.frequency === 'daily' || value.frequency === 'weekly' ||
      value.frequency === 'monthly' || value.frequency === 'yearly') &&
    typeof value.interval === 'number' &&
    Number.isSafeInteger(value.interval) &&
    value.interval > 0 &&
    isIsoDate(value.startDate) &&
    (value.endDate === undefined || isIsoDate(value.endDate)) &&
    (value.lastMaterializedDate === undefined || isIsoDate(value.lastMaterializedDate)) &&
    (value.isPaused === undefined || typeof value.isPaused === 'boolean')
  );
}

function isBudget(value: unknown, categoryIds: Set<string>): value is Budget {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.categoryId === 'string' &&
    categoryIds.has(value.categoryId) &&
    typeof value.monthlyLimitCents === 'number' &&
    Number.isSafeInteger(value.monthlyLimitCents) &&
    value.monthlyLimitCents > 0
  );
}

export function validateAppState(value: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['Backup must contain an object.'] };

  const categories = Array.isArray(value.categories) ? value.categories : null;
  const transactions = Array.isArray(value.transactions) ? value.transactions : null;
  const recurringRules = Array.isArray(value.recurringRules) ? value.recurringRules : null;
  const budgets = Array.isArray(value.budgets) ? value.budgets : null;
  const settings = value.settings;

  if (!categories) errors.push('categories must be an array.');
  if (!transactions) errors.push('transactions must be an array.');
  if (!recurringRules) errors.push('recurringRules must be an array.');
  if (!budgets) errors.push('budgets must be an array.');
  if (!isRecord(settings)) errors.push('settings must be an object.');
  if (errors.length > 0) return { valid: false, errors };

  const categoryList = categories as unknown[];
  const transactionList = transactions as unknown[];
  const recurringRuleList = recurringRules as unknown[];
  const budgetList = budgets as unknown[];
  const settingsRecord = settings as Record<string, unknown>;

  const categoryIds = new Set<string>();
  for (const category of categoryList) {
    if (!isCategory(category)) errors.push('A category has invalid fields.');
    else if (categoryIds.has(category.id)) errors.push(`Duplicate category id: ${category.id}.`);
    else categoryIds.add(category.id);
  }

  const transactionIds = new Set<string>();
  for (const transaction of transactionList) {
    if (!isTransaction(transaction, categoryIds)) errors.push('A transaction has invalid fields.');
    else if (transactionIds.has(transaction.id)) errors.push(`Duplicate transaction id: ${transaction.id}.`);
    else transactionIds.add(transaction.id);
  }

  const recurringRuleIds = new Set<string>();
  for (const rule of recurringRuleList) {
    if (!isRecurringRule(rule, categoryIds)) errors.push('A recurring rule has invalid fields.');
    else if (recurringRuleIds.has(rule.id)) errors.push(`Duplicate recurring rule id: ${rule.id}.`);
    else recurringRuleIds.add(rule.id);
  }

  const budgetIds = new Set<string>();
  const budgetCategoryIds = new Set<string>();
  for (const budget of budgetList) {
    if (!isBudget(budget, categoryIds)) errors.push('A budget has invalid fields.');
    else if (budgetIds.has(budget.id) || budgetCategoryIds.has(budget.categoryId)) {
      errors.push(`Duplicate budget for category: ${budget.categoryId}.`);
    } else {
      budgetIds.add(budget.id);
      budgetCategoryIds.add(budget.categoryId);
    }
  }

    if (typeof settingsRecord.currency !== 'string' || typeof settingsRecord.locale !== 'string' ||
      (settingsRecord.theme !== 'light' && settingsRecord.theme !== 'dark')) {
    errors.push('settings has invalid fields.');
  }

  return { valid: errors.length === 0, errors };
}

export function isValidAppState(value: unknown): value is AppState {
  return validateAppState(value).valid;
}
