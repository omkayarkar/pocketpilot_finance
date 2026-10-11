import { useState } from 'react';
import { FinanceProvider, useFinance } from '@/context/FinanceContext';
import { Layout, type ViewId } from '@/components/Layout';
import { Overview } from '@/views/Overview';
import { SpendSimulator } from '@/views/SpendSimulator';
import { Transactions } from '@/views/Transactions';
import { SavingsGoals } from '@/views/SavingsGoals';
import { RecurringPayments } from '@/views/RecurringPayments';
import { FinancialHealth } from '@/views/FinancialHealth';

function AppContent() {
  const [view, setView] = useState<ViewId>('overview');
  const { state } = useFinance();

  return (
    <Layout current={view} onNavigate={setView} currentDay={state.currentDay} totalDays={state.totalDays}>
      {view === 'overview' && <Overview onNavigate={setView} />}
      {view === 'simulator' && <SpendSimulator />}
      {view === 'transactions' && <Transactions />}
      {view === 'savings' && <SavingsGoals />}
      {view === 'recurring' && <RecurringPayments />}
      {view === 'health' && <FinancialHealth />}
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
