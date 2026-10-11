import { createContext, useMemo, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { FinanceState, Transaction, SavingsGoal, RecurringPayment } from '@/types';
import { createDefaultState } from '@/lib/defaultData';
import { loadState, saveState, clearState } from '@/lib/storage';
import { computeMetrics, advanceDays, getAvailableCash, canAfford } from '@/lib/finance';
import { uid } from '@/lib/format';

export interface FinanceContextValue {
  state: FinanceState;
  metrics: ReturnType<typeof computeMetrics>;
  addTransaction: (txn: Omit<Transaction, 'id'> & { id?: string }) => { ok: boolean; error?: string };
  updateTransaction: (id: string, txn: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  contributeGoal: (goalId: string, amount: number) => { ok: boolean; error?: string };
  withdrawGoal: (goalId: string, amount: number) => { ok: boolean; error?: string };
  addRecurring: (rp: Omit<RecurringPayment, 'id' | 'processedDays'>) => void;
  updateRecurring: (id: string, rp: Partial<Omit<RecurringPayment, 'id'>>) => void;
  deleteRecurring: (id: string) => void;
  toggleRecurringPause: (id: string) => void;
  advanceSim: (days: number) => void;
  resetAll: () => void;
}

export const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(() => {
    const loaded = loadState();
    return loaded ?? createDefaultState();
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const metrics = useMemo(() => computeMetrics(state), [state]);

  const addTransaction = useCallback((txn: Omit<Transaction, 'id'> & { id?: string }): { ok: boolean; error?: string } => {
    if (txn.amount <= 0) return { ok: false, error: 'Amount must be positive' };
    const txnId = txn.id || uid();
    if (state.transactions.some(t => t.id === txnId)) {
      return { ok: false, error: 'Transaction already applied' };
    }
    if (txn.type === 'expense') {
      const affordResult = canAfford(state, txn.amount, txn.day);
      if (!affordResult.affordable) {
        return { ok: false, error: affordResult.reason || 'This expense cannot be afforded' };
      }
    }
    setState(prev => {
      if (prev.transactions.some(t => t.id === txnId)) {
        return prev;
      }
      return {
        ...prev,
        transactions: [...prev.transactions, { ...txn, id: txnId }],
      };
    });
    return { ok: true };
  }, [state]);

  const updateTransaction = useCallback((id: string, patch: Partial<Omit<Transaction, 'id'>>) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, ...patch } : t),
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
    }));
  }, []);

  const addGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    setState(prev => ({
      ...prev,
      goals: [...prev.goals, { ...goal, id: uid() }],
    }));
  }, []);

  const contributeGoal = useCallback((goalId: string, amount: number): { ok: boolean; error?: string } => {
    if (amount <= 0) return { ok: false, error: 'Amount must be positive' };
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return { ok: false, error: 'Goal not found' };
    const remaining = Math.max(0, goal.target - goal.saved);
    if (remaining <= 0) return { ok: false, error: 'Goal is already fully funded' };
    if (amount > remaining) return { ok: false, error: `Amount exceeds remaining goal target (\u20B9${remaining.toLocaleString('en-IN')})` };
    const cash = getAvailableCash(state);
    if (amount > cash) return { ok: false, error: 'Insufficient cash to contribute' };
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id === goalId) {
          return { ...g, saved: g.saved + amount };
        }
        return g;
      }),
    }));
    return { ok: true };
  }, [state]);

  const withdrawGoal = useCallback((goalId: string, amount: number): { ok: boolean; error?: string } => {
    if (amount <= 0) return { ok: false, error: 'Amount must be positive' };
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal || amount > goal.saved) return { ok: false, error: 'Cannot withdraw more than saved' };
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id === goalId) return { ...g, saved: g.saved - amount };
        return g;
      }),
    }));
    return { ok: true };
  }, [state]);

  const addRecurring = useCallback((rp: Omit<RecurringPayment, 'id' | 'processedDays'>) => {
    setState(prev => ({
      ...prev,
      recurring: [...prev.recurring, { ...rp, id: uid(), processedDays: [] }],
    }));
  }, []);

  const updateRecurring = useCallback((id: string, patch: Partial<Omit<RecurringPayment, 'id'>>) => {
    setState(prev => ({
      ...prev,
      recurring: prev.recurring.map(r => r.id === id ? { ...r, ...patch } : r),
    }));
  }, []);

  const deleteRecurring = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      recurring: prev.recurring.filter(r => r.id !== id),
    }));
  }, []);

  const toggleRecurringPause = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      recurring: prev.recurring.map(r => r.id === id ? { ...r, paused: !r.paused } : r),
    }));
  }, []);

  const advanceSim = useCallback((days: number) => {
    setState(prev => advanceDays(prev, days));
  }, []);

  const resetAll = useCallback(() => {
    clearState();
    setState(createDefaultState());
  }, []);

  const contextValue = useMemo<FinanceContextValue>(() => ({
    state,
    metrics,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addGoal,
    contributeGoal,
    withdrawGoal,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    toggleRecurringPause,
    advanceSim,
    resetAll,
  }), [
    state,
    metrics,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addGoal,
    contributeGoal,
    withdrawGoal,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    toggleRecurringPause,
    advanceSim,
    resetAll,
  ]);

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
}


