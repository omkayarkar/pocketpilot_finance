import type { FinanceState, Transaction, Metrics, HealthBreakdown, RecurringPayment } from '@/types';

export function sum<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + fn(item), 0);
}

function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((a, x) => a + fn(x), 0);
}

/**
 * Available cash = starting funds + received income − paid expenses − savings allocated
 * Only transactions on days <= currentDay count as "paid"
 */
export function getAvailableCash(state: FinanceState): number {
  const realizedTxns = state.transactions.filter(t => t.day <= state.currentDay);
  const income = sumBy(realizedTxns, t => t.type === 'income' ? t.amount : 0);
  const expenses = sumBy(realizedTxns, t => t.type === 'expense' ? t.amount : 0);
  // savings allocated = total saved across goals (contributions are stored in goal.saved, which is funded from cash)
  const savingsAllocated = sumBy(state.goals, g => g.saved);
  return state.startingFunds + income - expenses - savingsAllocated;
}

/**
 * Total spent (expenses only, realized)
 */
export function getTotalSpent(state: FinanceState): number {
  return sumBy(state.transactions.filter(t => t.day <= state.currentDay && t.type === 'expense'), t => t.amount);
}

export function getTotalIncome(state: FinanceState): number {
  return sumBy(state.transactions.filter(t => t.day <= state.currentDay && t.type === 'income'), t => t.amount);
}

/**
 * Upcoming commitments: recurring payments not yet processed, due after currentDay
 * Also includes savings goals still needing funds, scheduled future expenses, and future income
 */
export function getUpcomingCommitments(state: FinanceState): { name: string; amount: number; day: number }[] {
  const commitments: { name: string; amount: number; day: number }[] = [];

  for (const r of state.recurring) {
    if (r.paused) continue;
    if (r.dueDay > state.currentDay && !r.processedDays.includes(r.dueDay)) {
      commitments.push({ name: r.name, amount: r.amount, day: r.dueDay });
    }
  }

  // Active savings goals with remaining amount needed
  for (const g of state.goals) {
    if (g.paused) continue;
    const remaining = Math.max(0, g.target - g.saved);
    if (remaining > 0 && g.dueDay > state.currentDay) {
      commitments.push({ name: `${g.name} (goal)`, amount: remaining, day: g.dueDay });
    }
  }

  // Future scheduled expense transactions
  for (const t of state.transactions) {
    if (t.type === 'expense' && t.day > state.currentDay && !t.recurringId) {
      commitments.push({ name: t.description, amount: t.amount, day: t.day });
    }
  }

  // Future income transactions
  for (const t of state.transactions) {
    if (t.type === 'income' && t.day > state.currentDay) {
      commitments.push({ name: t.description, amount: -t.amount, day: t.day });
    }
  }

  return commitments.sort((a, b) => a.day - b.day);
}

/**
 * Projected Day-30 balance:
 * Start from current available cash, then add future income, subtract future recurring payments and goal allocations
 */
export function getProjectedDay30(state: FinanceState): number {
  let balance = getAvailableCash(state);

  // Future income
  for (const t of state.transactions) {
    if (t.type === 'income' && t.day > state.currentDay && t.day <= state.totalDays) {
      balance += t.amount;
    }
  }

  // Future recurring payments
  for (const r of state.recurring) {
    if (r.paused) continue;
    if (r.dueDay > state.currentDay && r.dueDay <= state.totalDays && !r.processedDays.includes(r.dueDay)) {
      balance -= r.amount;
    }
  }

  // Future expense transactions
  for (const t of state.transactions) {
    if (t.type === 'expense' && t.day > state.currentDay && t.day <= state.totalDays) {
      balance -= t.amount;
    }
  }

  // Future savings goal allocations (remaining to be saved)
  for (const g of state.goals) {
    if (g.paused) continue;
    const remaining = g.target - g.saved;
    if (remaining > 0 && g.dueDay > state.currentDay && g.dueDay <= state.totalDays) {
      balance -= remaining;
    }
  }

  return balance;
}

/**
 * Daily safe-to-spend:
 * Available discretionary funds divided by remaining planning days.
 * Discretionary funds = Available cash + future income - upcoming commitments (reserved exactly once) - emergency buffer.
 */
export function getDailySafeToSpend(state: FinanceState): number {
  const cash = getAvailableCash(state);

  // Upcoming commitments total (only positive amounts = expenses/obligations)
  const upcoming = getUpcomingCommitments(state);
  const upcomingExpenses = upcoming.filter(c => c.amount > 0).reduce((a, c) => a + c.amount, 0);

  // Future income to look forward to
  const futureIncome = sumBy(
    state.transactions.filter(t => t.type === 'income' && t.day > state.currentDay && t.day <= state.totalDays),
    t => t.amount
  );

  // Account for emergency buffer if defined on state (defaults to 0 in current data model)
  const emergencyBuffer = (state as { emergencyBuffer?: number }).emergencyBuffer ?? 0;

  // Genuinely available discretionary funds:
  // Cash + future income - upcoming expenses (recurring bills, goals, scheduled expenses reserved exactly once) - emergency buffer
  const discretionaryFunds = cash + futureIncome - upcomingExpenses - emergencyBuffer;

  // Remaining planning days: from current day through totalDays inclusive, using a sensible minimum of 1 day
  const remainingDays = Math.max(1, state.totalDays - state.currentDay + 1);

  // Do not introduce negative allowances
  return Math.max(0, Math.floor(discretionaryFunds / remainingDays));
}

/**
 * Savings progress for all goals
 */
export function getSavingsProgress(state: FinanceState) {
  return state.goals.map(g => ({
    goalId: g.id,
    name: g.name,
    saved: g.saved,
    target: g.target,
    pct: g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0,
  }));
}

/**
 * Financial health score (0-100)
 * - Budget sustainability (35%): how well expenses track against available budget
 * - Emergency resilience (25%): projected end balance as buffer
 * - Savings feasibility (20%): progress toward savings goals
 * - Commitment coverage (20%): can we cover upcoming commitments?
 */
export function getHealthBreakdown(state: FinanceState): HealthBreakdown {
  const cash = getAvailableCash(state);
  const totalSpent = getTotalSpent(state);
  const projected = getProjectedDay30(state);
  const upcoming = getUpcomingCommitments(state);
  const upcomingExpenses = upcoming.filter(c => c.amount > 0).reduce((a, c) => a + c.amount, 0);

  // Budget sustainability: lower spend ratio = healthier
  const totalBudget = state.startingFunds + getTotalIncome(state);
  const spendRatio = totalBudget > 0 ? totalSpent / totalBudget : 1;
  const budgetSustainability = Math.max(0, Math.min(100, Math.round((1 - spendRatio) * 100)));

  // Emergency resilience: based on projected Day-30 balance relative to starting funds
  const emergencyRatio = state.startingFunds > 0 ? projected / state.startingFunds : 0;
  const emergencyResilience = Math.max(0, Math.min(100, Math.round(emergencyRatio * 100)));

  // Savings feasibility: average progress across goals
  const goalsProgress = state.goals.length > 0
    ? state.goals.map(g => g.target > 0 ? Math.min(1, g.saved / g.target) : 1)
    : [1];
  const savingsFeasibility = Math.round((goalsProgress.reduce((a, b) => a + b, 0) / goalsProgress.length) * 100);

  // Commitment coverage: can cash cover upcoming expenses?
  const coverageRatio = upcomingExpenses > 0 ? Math.min(1, cash / upcomingExpenses) : 1;
  const commitmentCoverage = Math.max(0, Math.min(100, Math.round(coverageRatio * 100)));

  const total = Math.max(0, Math.min(100, Math.round(
    budgetSustainability * 0.35 +
    emergencyResilience * 0.25 +
    savingsFeasibility * 0.20 +
    commitmentCoverage * 0.20
  )));

  const band: 'Healthy' | 'Caution' | 'Critical' = total >= 75 ? 'Healthy' : total >= 45 ? 'Caution' : 'Critical';

  return { budgetSustainability, emergencyResilience, savingsFeasibility, commitmentCoverage, total, band };
}

/**
 * Compute all metrics from state
 */
export function computeMetrics(state: FinanceState): Metrics {
  return {
    availableCash: getAvailableCash(state),
    totalSpent: getTotalSpent(state),
    totalIncome: getTotalIncome(state),
    totalSaved: sumBy(state.goals, g => g.saved),
    dailySafeToSpend: getDailySafeToSpend(state),
    projectedDay30: getProjectedDay30(state),
    upcomingCommitments: getUpcomingCommitments(state),
    savingsProgress: getSavingsProgress(state),
    health: getHealthBreakdown(state),
    recentTransactions: [...state.transactions]
      .sort((a, b) => b.day - a.day)
      .slice(0, 5),
  };
}

/**
 * 30-day cash flow series for chart
 */
export function getCashFlowSeries(state: FinanceState): { day: number; balance: number }[] {
  const series: { day: number; balance: number }[] = [];
  // Initial liquid balance on day 1 equals starting funds minus already-saved goal funds
  let balance = state.startingFunds - sumBy(state.goals, g => g.saved);

  for (let day = 1; day <= state.totalDays; day++) {
    // Process income on this day
    for (const t of state.transactions) {
      if (t.type === 'income' && t.day === day) {
        balance += t.amount;
      }
    }
    // Process expenses on this day
    for (const t of state.transactions) {
      if (t.type === 'expense' && t.day === day) {
        balance -= t.amount;
      }
    }
    // Process recurring payments due on this day (if not already processed prior)
    for (const r of state.recurring) {
      if (!r.paused && r.dueDay === day && !r.processedDays.includes(day)) {
        balance -= r.amount;
      }
    }
    // Process remaining savings allocations at due day for each goal (future goals only)
    for (const g of state.goals) {
      if (!g.paused && g.dueDay > state.currentDay && g.dueDay === day) {
        const remaining = Math.max(0, g.target - g.saved);
        if (remaining > 0) {
          balance -= remaining;
        }
      }
    }
    series.push({ day, balance });
  }

  return series;
}

/**
 * Simulate applying a hypothetical expense to state WITHOUT modifying actual state.
 * Returns a hypothetical state for metric comparison.
 */
export function simulateExpense(
  state: FinanceState,
  expense: { amount: number; category: Transaction['category']; description: string; day: number }
): FinanceState {
  const hypotheticalTxn: Transaction = {
    id: 'hypothetical',
    type: 'expense',
    amount: expense.amount,
    category: expense.category,
    description: expense.description,
    day: expense.day,
  };
  return {
    ...state,
    transactions: [...state.transactions, hypotheticalTxn],
  };
}

/**
 * Check if an expense is affordable
 */
export function canAfford(state: FinanceState, amount: number, day: number): { affordable: boolean; reason?: string } {
  if (amount <= 0) return { affordable: false, reason: 'Amount must be positive' };

  // If the expense is on a past or current day, check available cash
  if (day <= state.currentDay) {
    const cash = getAvailableCash(state);
    if (amount > cash) {
      return { affordable: false, reason: `Insufficient cash. Available: \u20B9${cash.toLocaleString('en-IN')}, needed: \u20B9${amount.toLocaleString('en-IN')}` };
    }
  }

  // Check whether applying this expense makes Day-30 projection negative
  const hypothetical = simulateExpense(state, {
    amount,
    category: 'other',
    description: 'check',
    day,
  });
  const projectedAfter = getProjectedDay30(hypothetical);
  if (projectedAfter < 0) {
    return {
      affordable: false,
      reason: `This would make projected Day-30 balance negative (\u20B9${projectedAfter.toLocaleString('en-IN')})`,
    };
  }

  // Also verify that cash flow never dips into deficit at or after the expense day
  const hypoSeries = getCashFlowSeries(hypothetical);
  const firstDeficit = hypoSeries.find(p => p.day >= day && p.balance < 0);
  if (firstDeficit) {
    return {
      affordable: false,
      reason: `This would cause a cash deficit of \u20B9${Math.abs(firstDeficit.balance).toLocaleString('en-IN')} on Day ${firstDeficit.day} before subsequent income arrives`,
    };
  }

  return { affordable: true };
}

/**
 * Generate a contextual explanation for a simulated expense
 */
export function explainImpact(
  current: Metrics,
  hypothetical: Metrics,
  amount: number,
  affordable: boolean,
  reason?: string
): string {
  if (!affordable) {
    return reason ? `${reason}.` : 'This purchase is unaffordable. Applying it would create a shortfall in your budget.';
  }

  const cashDelta = hypothetical.availableCash - current.availableCash;

  const projDelta = hypothetical.projectedDay30 - current.projectedDay30;
  const healthDelta = hypothetical.health.total - current.health.total;

  const parts: string[] = [];

  if (dayOrLess(cashDelta, amount)) {
    parts.push(`Deducts \u20B9${amount.toLocaleString('en-IN')} from available cash`);
  }

  if (projDelta < 0) {
    parts.push(`Projected Day-30 balance drops by \u20B9${Math.abs(projDelta).toLocaleString('en-IN')}`);
  } else if (projDelta === 0) {
    parts.push('Projected Day-30 balance unchanged');
  }

  if (hypothetical.health.band !== current.health.band) {
    parts.push(`Health score shifts from ${current.health.band} to ${hypothetical.health.band}`);
  } else if (healthDelta < 0) {
    parts.push(`Health score drops ${Math.abs(healthDelta)} points`);
  }

  // Savings feasibility check
  const savingsStillFeasible = hypothetical.savingsProgress.every(s => s.pct >= 100) ||
    hypothetical.projectedDay30 >= 0;
  if (!savingsStillFeasible) {
    parts.push('May jeopardize your savings goal');
  }

  if (parts.length === 0) {
    parts.push('Manageable impact on your budget');
  }

  return parts.join('. ') + '.';
}

function dayOrLess(delta: number, amount: number): boolean {
  return Math.abs(delta + amount) < 1; // delta should be roughly -amount
}

/**
 * Advance the simulation by N days, processing recurring payments
 */
export function advanceDays(state: FinanceState, days: number): FinanceState {
  const newDay = Math.min(state.currentDay + days, state.totalDays);
  const newRecurring: RecurringPayment[] = [];
  const newTransactions: Transaction[] = [...state.transactions];

  for (const r of state.recurring) {
    const processedDays = [...r.processedDays];
    if (!r.paused) {
      // Check if any due days fall on or before newDay and haven't been processed yet
      if (r.dueDay <= newDay && !processedDays.includes(r.dueDay)) {
        // Process this payment
        newTransactions.push({
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          type: 'expense',
          amount: r.amount,
          category: r.category,
          description: r.name,
          day: r.dueDay,
          recurringId: r.id,
        });
        processedDays.push(r.dueDay);
      }
    }
    newRecurring.push({ ...r, processedDays });
  }

  return {
    ...state,
    currentDay: newDay,
    recurring: newRecurring,
    transactions: newTransactions,
  };
}
