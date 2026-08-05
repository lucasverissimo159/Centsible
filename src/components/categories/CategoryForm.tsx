import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FieldWrapper, Input, Select } from '@/components/ui/Field';
import { CATEGORY_ICON_NAMES, Icon, isIconName, type IconName } from '@/components/ui/Icon';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import type { Category, CategoryKind } from '@/types';

const COLOR_SWATCHES = [
  '#1F6F5C',
  '#4F8A6B',
  '#C77B3B',
  '#2E4057',
  '#3B7A94',
  '#6B7FA3',
  '#B5482A',
  '#7A5C8E',
  '#A34E6E',
  '#4A7C59',
  '#6B5B95',
  '#C2954A',
  '#7C878E',
  '#9A3B46',
  '#B8892F',
  '#3B6E91',
];

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category;
}

export function CategoryForm({ isOpen, onClose, category }: CategoryFormProps) {
  const { addCategory, updateCategory } = useApp();
  const { showToast } = useToast();
  const isEditing = Boolean(category);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [color, setColor] = useState<string>(COLOR_SWATCHES[0] ?? '#7C878E');
  const [icon, setIcon] = useState<IconName>('tag');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (category) {
      setName(category.name);
      setKind(category.kind);
      setColor(category.color);
      setIcon(isIconName(category.icon) ? category.icon : 'tag');
    } else {
      setName('');
      setKind('expense');
      setColor(COLOR_SWATCHES[0] ?? '#7C878E');
      setIcon('tag');
    }
    setError('');
  }, [isOpen, category]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Give the category a name.');
      return;
    }
    if (isEditing && category) {
      updateCategory({ ...category, name: name.trim(), kind, color, icon });
      showToast({ text: 'Category updated.', tone: 'success' });
    } else {
      addCategory({ name: name.trim(), kind, color, icon });
      showToast({ text: 'Category added.', tone: 'success' });
    }
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit category' : 'New category'}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="category-form">
            {isEditing ? 'Save' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldWrapper label="Name" htmlFor="cat-name" error={error}>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pet Care"
            error={Boolean(error)}
          />
        </FieldWrapper>

        <FieldWrapper label="Type" htmlFor="cat-kind">
          <Select id="cat-kind" value={kind} onChange={(e) => setKind(e.target.value as CategoryKind)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="both">Both</option>
          </Select>
        </FieldWrapper>

        <div>
          <p className="mb-2 text-sm font-medium text-text">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setColor(swatch)}
                aria-label={`Color ${swatch}`}
                aria-pressed={color === swatch}
                className="h-7 w-7 rounded-full transition-transform"
                style={{
                  backgroundColor: swatch,
                  boxShadow: color === swatch ? `0 0 0 2px var(--color-surface), 0 0 0 4px ${swatch}` : 'none',
                  transform: color === swatch ? 'scale(1.08)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text">Icon</p>
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-9">
            {CATEGORY_ICON_NAMES.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                aria-label={iconName}
                aria-pressed={icon === iconName}
                className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                  icon === iconName
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-text-muted hover:bg-surface-raised'
                }`}
              >
                <Icon name={iconName} size={16} />
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
