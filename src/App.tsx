import { useState, lazy, Suspense } from 'react';
import { FinanceProvider } from '@/context/FinanceContext';
import { useFinance } from '@/context/useFinance';
import { Layout, type ViewId } from '@/components/Layout';
import { Overview } from '@/views/Overview';

const SpendSimulator = lazy(() => import('@/views/SpendSimulator').then(m => ({ default: m.SpendSimulator })));
const Transactions = lazy(() => import('@/views/Transactions').then(m => ({ default: m.Transactions })));
const SavingsGoals = lazy(() => import('@/views/SavingsGoals').then(m => ({ default: m.SavingsGoals })));
const RecurringPayments = lazy(() => import('@/views/RecurringPayments').then(m => ({ default: m.RecurringPayments })));
const FinancialHealth = lazy(() => import('@/views/FinancialHealth').then(m => ({ default: m.FinancialHealth })));

function ViewFallback() {
  return (
    <div
      role="status"
      aria-label="Loading view content"
      className="p-6 text-slate-400 text-sm animate-pulse rounded-xl bg-slate-800/30 border border-slate-800"
    >
      Loading view...
    </div>
  );
}

function AppContent() {
  const [view, setView] = useState<ViewId>('overview');
  const { state } = useFinance();

  return (
    <Layout current={view} onNavigate={setView} currentDay={state.currentDay} totalDays={state.totalDays}>
      <Suspense fallback={<ViewFallback />}>
        {view === 'overview' && <Overview onNavigate={setView} />}
        {view === 'simulator' && <SpendSimulator />}
        {view === 'transactions' && <Transactions />}
        {view === 'savings' && <SavingsGoals />}
        {view === 'recurring' && <RecurringPayments />}
        {view === 'health' && <FinancialHealth />}
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}

export default App;
