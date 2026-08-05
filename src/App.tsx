import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppProvider } from '@/store/AppContext';
import { ToastProvider } from '@/hooks/useToast';
import { Layout } from '@/components/layout/Layout';

const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const TransactionsPage = lazy(() =>
  import('@/pages/TransactionsPage').then((m) => ({ default: m.TransactionsPage }))
);
const BudgetsPage = lazy(() => import('@/pages/BudgetsPage').then((m) => ({ default: m.BudgetsPage })));
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div
        role="status"
        aria-label="Loading"
        className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent"
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route
                index
                element={
                  <Suspense fallback={<PageFallback />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="transactions"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <TransactionsPage />
                  </Suspense>
                }
              />
              <Route
                path="budgets"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <BudgetsPage />
                  </Suspense>
                }
              />
              <Route
                path="categories"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <CategoriesPage />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
