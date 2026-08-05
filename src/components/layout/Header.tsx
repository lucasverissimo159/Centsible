import { Menu, Moon, Plus, Redo2, Sun, Undo2 } from 'lucide-react';
import { useLocation } from 'react-router';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';

const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/transactions': { title: 'Transactions', subtitle: 'Every dollar in and out, in one ledger.' },
  '/budgets': { title: 'Budgets', subtitle: 'Set a monthly ceiling per category.' },
  '/categories': { title: 'Categories', subtitle: 'How your money gets sorted.' },
  '/settings': { title: 'Settings', subtitle: 'Currency, theme, and your data.' },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface HeaderProps {
  onMenuClick: () => void;
  onAddTransaction: () => void;
}

export function Header({ onMenuClick, onAddTransaction }: HeaderProps) {
  const { canUndo, canRedo, undo, redo, state, updateSettings } = useApp();
  const location = useLocation();

  const routeInfo = ROUTE_TITLES[location.pathname];
  const title = routeInfo?.title ?? getGreeting();
  const subtitle = routeInfo?.subtitle ?? "Here's where your money stands.";

  const isDark = state.settings.theme === 'dark';

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-4 backdrop-blur sm:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text md:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-semibold text-text sm:text-xl">{title}</h1>
        <p className="hidden truncate text-sm text-text-muted sm:block">{subtitle}</p>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden items-center gap-0.5 rounded-md border border-border p-0.5 sm:flex">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text disabled:pointer-events-none disabled:opacity-30"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text disabled:pointer-events-none disabled:opacity-30"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <button
          onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={onAddTransaction}>
          <span className="hidden sm:inline">Add transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </header>
  );
}
