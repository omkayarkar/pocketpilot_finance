import type { FinanceState } from '@/types';

const KEY = 'pocketpilot_state_v1';

export function loadState(): FinanceState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FinanceState;
    if (!parsed || typeof parsed.startingFunds !== 'number' || !Array.isArray(parsed.transactions)) {
      return null;
    }
    return parsed;
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
