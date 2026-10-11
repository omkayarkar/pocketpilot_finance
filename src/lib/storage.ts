import type { FinanceState } from '@/types';

const KEY = 'pocketpilot_state_v1';

export function loadState(): FinanceState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const startingFunds = typeof parsed.startingFunds === 'number' && !isNaN(parsed.startingFunds)
      ? parsed.startingFunds
      : 10000;
    const totalDays = typeof parsed.totalDays === 'number' && parsed.totalDays > 0
      ? parsed.totalDays
      : 30;
    const currentDay = typeof parsed.currentDay === 'number' && parsed.currentDay >= 1 && parsed.currentDay <= totalDays
      ? parsed.currentDay
      : 1;

    const transactions = Array.isArray(parsed.transactions)
      ? parsed.transactions
          .filter((t: unknown): t is FinanceState['transactions'][number] => {
            return Boolean(
              t &&
              typeof t === 'object' &&
              typeof (t as { id?: unknown }).id === 'string' &&
              ((t as { type?: unknown }).type === 'income' || (t as { type?: unknown }).type === 'expense') &&
              typeof (t as { amount?: unknown }).amount === 'number' &&
              Number.isFinite((t as { amount: number }).amount) &&
              typeof (t as { day?: unknown }).day === 'number' &&
              Number.isFinite((t as { day: number }).day)
            );
          })
          .map((t: FinanceState['transactions'][number]) => ({
            ...t,
            description: typeof t.description === 'string' && t.description.trim() ? t.description.trim() : 'Transaction',
          }))
      : [];

    const goals = Array.isArray(parsed.goals)
      ? parsed.goals
          .filter((g: unknown): g is FinanceState['goals'][number] => {
            return Boolean(
              g &&
              typeof g === 'object' &&
              typeof (g as { id?: unknown }).id === 'string' &&
              typeof (g as { name?: unknown }).name === 'string' &&
              typeof (g as { target?: unknown }).target === 'number' &&
              Number.isFinite((g as { target: number }).target) &&
              typeof (g as { saved?: unknown }).saved === 'number' &&
              Number.isFinite((g as { saved: number }).saved) &&
              typeof (g as { dueDay?: unknown }).dueDay === 'number' &&
              Number.isFinite((g as { dueDay: number }).dueDay)
            );
          })
          .map((g: FinanceState['goals'][number]) => ({
            ...g,
            name: g.name.trim() || 'Goal',
            target: Math.max(0, g.target),
            saved: Math.max(0, g.saved),
            paused: Boolean(g.paused),
          }))
      : [];

    const recurring = Array.isArray(parsed.recurring)
      ? parsed.recurring
          .filter((r: unknown): r is FinanceState['recurring'][number] => {
            return Boolean(
              r &&
              typeof r === 'object' &&
              typeof (r as { id?: unknown }).id === 'string' &&
              typeof (r as { name?: unknown }).name === 'string' &&
              typeof (r as { amount?: unknown }).amount === 'number' &&
              Number.isFinite((r as { amount: number }).amount) &&
              typeof (r as { dueDay?: unknown }).dueDay === 'number' &&
              Number.isFinite((r as { dueDay: number }).dueDay)
            );
          })
          .map((r: FinanceState['recurring'][number]) => ({
            ...r,
            name: r.name.trim() || 'Recurring Bill',
            amount: Math.max(0, r.amount),
            processedDays: Array.isArray(r.processedDays) ? r.processedDays.filter(d => typeof d === 'number') : [],
            paused: Boolean(r.paused),
          }))
      : [];

    return {
      startingFunds,
      currentDay,
      totalDays,
      transactions,
      goals,
      recurring,
    };
  } catch {
    return null;
  }
}

export function saveState(state: FinanceState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
