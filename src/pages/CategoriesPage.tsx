import { useMemo, useState } from 'react';
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryForm } from '@/components/categories/CategoryForm';
import type { Category } from '@/types';

export function CategoriesPage() {
  const { state, deleteCategory } = useApp();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

  const usageCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of state.transactions) {
      counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [state.transactions]);

  function openAdd() {
    setEditingCategory(undefined);
    setIsFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setIsFormOpen(true);
  }

  function handleDelete(category: Category) {
    const count = usageCount.get(category.id) ?? 0;
    deleteCategory(category.id);
    showToast({
      text: count > 0 ? `Deleted "${category.name}". ${count} transaction${count === 1 ? '' : 's'} moved to Other.` : `Deleted "${category.name}".`,
      tone: 'default',
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{state.categories.length} categories</p>
        <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={openAdd}>
          New category
        </Button>
      </div>

      {state.categories.length === 0 ? (
        <EmptyState icon={<Tag size={28} />} title="No categories yet" description="Add a category to start organizing transactions." />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {state.categories.map((category) => (
              <li key={category.id} className="flex items-center gap-3 px-4 py-3">
                <CategoryIcon icon={category.icon} color={category.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{category.name}</p>
                  <p className="text-xs text-text-faint">
                    {usageCount.get(category.id) ?? 0} transaction{(usageCount.get(category.id) ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
                <Badge tone="neutral">{category.kind}</Badge>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => openEdit(category)}
                    aria-label={`Edit ${category.name}`}
                    className="rounded p-1.5 text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    disabled={category.isDefault}
                    aria-label={`Delete ${category.name}`}
                    title={category.isDefault ? "Default categories can't be deleted" : undefined}
                    className="rounded p-1.5 text-text-faint transition-colors hover:bg-negative-soft hover:text-negative disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <CategoryForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} category={editingCategory} />
    </div>
  );
}
