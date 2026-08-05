import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FieldWrapper, Input, Select } from '@/components/ui/Field';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { centsToDecimalString, parseAmountToCents } from '@/domain/money';
import type { Budget } from '@/types';

interface BudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  budget?: Budget;
}

export function BudgetForm({ isOpen, onClose, budget }: BudgetFormProps) {
  const { state, setBudget } = useApp();
  const { showToast } = useToast();
  const isEditing = Boolean(budget);

  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState('');

  const budgetedCategoryIds = new Set(state.budgets.map((b) => b.categoryId));
  const availableCategories = state.categories.filter(
    (c) =>
      (c.kind === 'expense' || c.kind === 'both') &&
      (c.id === budget?.categoryId || !budgetedCategoryIds.has(c.id))
  );

  useEffect(() => {
    if (!isOpen) return;
    if (budget) {
      setCategoryId(budget.categoryId);
      setLimit(centsToDecimalString(budget.monthlyLimitCents));
    } else {
      setCategoryId('');
      setLimit('');
    }
    setError('');
  }, [isOpen, budget]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cents = parseAmountToCents(limit);
    if (cents === null || cents <= 0) {
      setError('Enter a limit greater than zero.');
      return;
    }
    if (!categoryId) {
      setError('Pick a category.');
      return;
    }
    setBudget(categoryId, cents);
    showToast({ text: isEditing ? 'Budget updated.' : 'Budget set.', tone: 'success' });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit budget' : 'Set a budget'}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="budget-form">
            {isEditing ? 'Save' : 'Set budget'}
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldWrapper label="Category" htmlFor="budget-category">
          <Select
            id="budget-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isEditing}
          >
            <option value="">Select a category…</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <FieldWrapper label="Monthly limit" htmlFor="budget-limit" error={error}>
          <Input
            id="budget-limit"
            inputMode="decimal"
            placeholder="0.00"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="figure"
            error={Boolean(error)}
          />
        </FieldWrapper>
      </form>
    </Modal>
  );
}
