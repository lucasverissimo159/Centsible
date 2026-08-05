import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FieldWrapper, Input, Select, Textarea } from '@/components/ui/Field';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { centsToDecimalString, parseAmountToCents } from '@/domain/money';
import { toISODate } from '@/domain/recurrence';
import type { RecurrenceFrequency, Transaction, TransactionType } from '@/types';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction;
}

function todayISO(): string {
  return toISODate(new Date());
}

export function TransactionForm({ isOpen, onClose, transaction }: TransactionFormProps) {
  const { state, addTransaction, updateTransaction, addRecurringRule } = useApp();
  const { showToast } = useToast();
  const isEditing = Boolean(transaction);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [interval, setIntervalValue] = useState('1');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // (Re)populate the form each time it opens, whether fresh or editing.
  useEffect(() => {
    if (!isOpen) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(centsToDecimalString(transaction.amountCents));
      setCategoryId(transaction.categoryId);
      setDescription(transaction.description);
      setDate(transaction.date);
      setNotes(transaction.notes ?? '');
    } else {
      setType('expense');
      setAmount('');
      setCategoryId('');
      setDescription('');
      setDate(todayISO());
      setNotes('');
    }
    setIsRecurring(false);
    setFrequency('monthly');
    setIntervalValue('1');
    setHasEndDate(false);
    setEndDate('');
    setErrors({});
  }, [isOpen, transaction]);

  const availableCategories = state.categories.filter((c) => c.kind === 'both' || c.kind === type);

  // Selecting a type that the current category doesn't support clears it, rather than submitting a mismatch.
  useEffect(() => {
    setCategoryId((current) => (availableCategories.some((c) => c.id === current) ? current : ''));
    // availableCategories is derived from `type` + state.categories; re-running per `type` change is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) nextErrors.amount = 'Enter an amount greater than zero.';
    if (!categoryId) nextErrors.categoryId = 'Pick a category.';
    if (!description.trim()) nextErrors.description = 'Add a short description.';
    if (!date) nextErrors.date = 'Pick a date.';
    if (isRecurring) {
      const intervalNum = Number(interval);
      if (!Number.isInteger(intervalNum) || intervalNum < 1) {
        nextErrors.interval = 'Whole number, 1 or more.';
      }
      if (hasEndDate && endDate && endDate < date) {
        nextErrors.endDate = 'Must be after the start date.';
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    const cents = parseAmountToCents(amount);
    if (cents === null) return; // validated above; guards TypeScript's control-flow narrowing

    if (isEditing && transaction) {
      updateTransaction({
        ...transaction,
        type,
        amountCents: cents,
        categoryId,
        description: description.trim(),
        date,
        notes: notes.trim() || undefined,
      });
      showToast({ text: 'Transaction updated.', tone: 'success' });
    } else if (isRecurring) {
      addRecurringRule({
        type,
        amountCents: cents,
        categoryId,
        description: description.trim(),
        frequency,
        interval: Number(interval),
        startDate: date,
        endDate: hasEndDate && endDate ? endDate : undefined,
      });
      showToast({ text: 'Recurring transaction created.', tone: 'success' });
    } else {
      addTransaction({
        type,
        amountCents: cents,
        categoryId,
        description: description.trim(),
        date,
        notes: notes.trim() || undefined,
      });
      showToast({ text: 'Transaction added.', tone: 'success' });
    }
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit transaction' : 'Add transaction'}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="transaction-form">
            {isEditing ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-raised p-1">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`rounded py-2 text-sm font-medium transition-colors ${
              type === 'expense' ? 'bg-surface text-negative shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`rounded py-2 text-sm font-medium transition-colors ${
              type === 'income' ? 'bg-surface text-positive shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            Income
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FieldWrapper label="Amount" htmlFor="tx-amount" error={errors.amount}>
            <Input
              id="tx-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="figure"
              error={Boolean(errors.amount)}
            />
          </FieldWrapper>
          <FieldWrapper label="Date" htmlFor="tx-date" error={errors.date}>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={Boolean(errors.date)}
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Category" htmlFor="tx-category" error={errors.categoryId}>
          <Select id="tx-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select a category…</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FieldWrapper>

        <FieldWrapper label="Description" htmlFor="tx-description" error={errors.description}>
          <Input
            id="tx-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Whole Foods Market"
            error={Boolean(errors.description)}
          />
        </FieldWrapper>

        <FieldWrapper label="Notes (optional)" htmlFor="tx-notes">
          <Textarea id="tx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FieldWrapper>

        {!isEditing && (
          <div className="rounded-md border border-border p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong accent-accent"
              />
              Make this recurring
            </label>

            {isRecurring && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <FieldWrapper label="Repeats" htmlFor="tx-frequency">
                  <Select
                    id="tx-frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </FieldWrapper>
                <FieldWrapper label="Every" htmlFor="tx-interval" error={errors.interval}>
                  <Input
                    id="tx-interval"
                    type="number"
                    min={1}
                    value={interval}
                    onChange={(e) => setIntervalValue(e.target.value)}
                    error={Boolean(errors.interval)}
                  />
                </FieldWrapper>
                <div className="col-span-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
                    <input
                      type="checkbox"
                      checked={hasEndDate}
                      onChange={(e) => setHasEndDate(e.target.checked)}
                      className="h-4 w-4 rounded border-border-strong accent-accent"
                    />
                    Ends on a specific date
                  </label>
                  {hasEndDate && (
                    <div className="mt-2">
                      <Input
                        type="date"
                        aria-label="End date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        error={Boolean(errors.endDate)}
                      />
                      {errors.endDate && <p className="mt-1 text-xs text-negative">{errors.endDate}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
