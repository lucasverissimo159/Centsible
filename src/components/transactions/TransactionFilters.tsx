import { Search } from 'lucide-react';
import type { Category } from '@/types';
import type {
  SortDirection,
  TransactionFilters as Filters,
  TransactionSortField,
} from '@/store/selectors';
import { Input, Select } from '@/components/ui/Field';

interface TransactionFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  categories: Category[];
  sortField: TransactionSortField;
  sortDirection: SortDirection;
  onSortChange: (field: TransactionSortField, direction: SortDirection) => void;
}

export function TransactionFiltersBar({
  filters,
  onFiltersChange,
  categories,
  sortField,
  sortDirection,
  onSortChange,
}: TransactionFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
        <Input
          value={filters.searchText ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
          placeholder="Search transactions…"
          className="pl-9"
          aria-label="Search transactions"
        />
      </div>

      <Select
        value={filters.type ?? 'all'}
        onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as Filters['type'] })}
        className="sm:w-36"
        aria-label="Filter by type"
      >
        <option value="all">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </Select>

      <Select
        value={filters.categoryId ?? 'all'}
        onChange={(e) => onFiltersChange({ ...filters, categoryId: e.target.value })}
        className="sm:w-44"
        aria-label="Filter by category"
      >
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Select
        value={`${sortField}:${sortDirection}`}
        onChange={(e) => {
          const [field, direction] = e.target.value.split(':') as [TransactionSortField, SortDirection];
          onSortChange(field, direction);
        }}
        className="sm:w-44"
        aria-label="Sort transactions"
      >
        <option value="date:desc">Newest first</option>
        <option value="date:asc">Oldest first</option>
        <option value="amount:desc">Amount: high to low</option>
        <option value="amount:asc">Amount: low to high</option>
        <option value="description:asc">Description: A–Z</option>
      </Select>
    </div>
  );
}
