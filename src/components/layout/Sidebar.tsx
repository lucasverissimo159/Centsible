import { NavLink } from 'react-router';
import { LayoutDashboard, List, Settings, Tag, Wallet, X } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: List, end: false },
  { to: '/budgets', label: 'Budgets', icon: Wallet, end: false },
  { to: '/categories', label: 'Categories', icon: Tag, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-6">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        <span className="font-display text-lg font-semibold tracking-tight text-text">Centsible</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: ItemIcon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-raised hover:text-text'
              }`
            }
          >
            <ItemIcon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="text-xs text-text-faint">Your data stays on this device.</p>
      </div>
    </div>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop: persistent column */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:block">
        <SidebarContent />
      </aside>

      {/* Mobile: slide-in drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink-950/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
          <div className="relative z-10 h-full w-64 bg-surface shadow-2xl animate-rise" style={{ animationDuration: '0.3s' }}>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="absolute right-3 top-6 rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
