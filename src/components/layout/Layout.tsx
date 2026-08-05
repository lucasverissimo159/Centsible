import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useApp } from '@/store/AppContext';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const { undo, redo } = useApp();

  useKeyboardShortcut('z', undo, { mod: true });
  useKeyboardShortcut('z', redo, { mod: true, shift: true });

  return (
    <div className="flex h-dvh bg-bg">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setIsSidebarOpen(true)} onAddTransaction={() => setIsAddTransactionOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <TransactionForm isOpen={isAddTransactionOpen} onClose={() => setIsAddTransactionOpen(false)} />
      <ToastContainer />
    </div>
  );
}
