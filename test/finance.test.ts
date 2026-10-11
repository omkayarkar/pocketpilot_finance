import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAvailableCash,
  getTotalSpent,
  getTotalIncome,
  getUpcomingCommitments,
  getProjectedDay30,
  getDailySafeToSpend,
  getSavingsProgress,
  getHealthBreakdown,
  getCashFlowSeries,
  simulateExpense,
  canAfford,
  explainImpact,
  advanceDays,
  computeMetrics,
} from '../src/lib/finance.ts';
import { formatINR } from '../src/lib/format.ts';
import type { FinanceState } from '../src/types.ts';

function createMockState(): FinanceState {
  return {
    startingFunds: 10000,
    currentDay: 1,
    totalDays: 30,
    transactions: [
      { id: 't1', type: 'expense', amount: 120, category: 'food', description: 'Canteen lunch', day: 1 },
      { id: 't2', type: 'expense', amount: 50, category: 'transport', description: 'Bus pass', day: 1 },
      { id: 't3', type: 'income', amount: 5000, category: 'other', description: 'Freelance payment', day: 10 },
    ],
    goals: [
      { id: 'g1', name: 'Headphones', target: 3000, saved: 500, dueDay: 25 },
    ],
    recurring: [
      { id: 'r1', name: 'Music Subscription', amount: 299, category: 'subscription', dueDay: 5, paused: false, processedDays: [] },
      { id: 'r2', name: 'Mobile Recharge', amount: 499, category: 'recharge', dueDay: 15, paused: false, processedDays: [] },
    ],
  };
}

test('getAvailableCash calculates initial Day 1 liquid balance correctly', () => {
  const state = createMockState();
  // 10000 starting - 170 realized expenses - 500 saved in goals = 9330
  assert.equal(getAvailableCash(state), 9330);
});

test('realized expenses and income only count up to currentDay', () => {
  const state = createMockState();
  assert.equal(getTotalSpent(state), 170);
  assert.equal(getTotalIncome(state), 0); // Freelance income on Day 10 is unrealized on Day 1

  // Advance state to Day 10
  const advanced = advanceDays(state, 9);
  assert.equal(advanced.currentDay, 10);
  assert.equal(getTotalIncome(advanced), 5000);
});

test('getUpcomingCommitments includes recurring, goals, future expenses, and future income', () => {
  const state = createMockState();
  const commitments = getUpcomingCommitments(state);

  // Should have music (299), recharge (499), headphones goal (2500 remaining), freelance income (-5000)
  assert.equal(commitments.length, 4);
  const music = commitments.find(c => c.name === 'Music Subscription');
  const recharge = commitments.find(c => c.name === 'Mobile Recharge');
  const goal = commitments.find(c => c.name === 'Headphones (goal)');
  const income = commitments.find(c => c.name === 'Freelance payment');

  assert.ok(music);
  assert.equal(music.amount, 299);
  assert.ok(recharge);
  assert.equal(recharge.amount, 499);
  assert.ok(goal);
  assert.equal(goal.amount, 2500); // 3000 - 500 = 2500
  assert.ok(income);
  assert.equal(income.amount, -5000);
});

test('getProjectedDay30 accurately projects month-end balance', () => {
  const state = createMockState();
  // 9330 (available) + 5000 (future income) - 299 (music) - 499 (recharge) - 2500 (goal remaining) = 11032
  assert.equal(getProjectedDay30(state), 11032);
});

test('getDailySafeToSpend calculates discretionary funds spread across remaining days', () => {
  const state = createMockState();
  // Discretionary = 9330 + 5000 - 3298 = 11032. Remaining days = 30. Math.floor(11032 / 30) = 367
  assert.equal(getDailySafeToSpend(state), 367);
});

test('getCashFlowSeries matches Available Cash on Day 1 and Projected Day 30', () => {
  const state = createMockState();
  const series = getCashFlowSeries(state);

  assert.equal(series.length, 30);
  // Day 1 in series should equal available cash (9330)
  assert.equal(series[0].day, 1);
  assert.equal(series[0].balance, 9330);

  // Day 30 in series should equal projectedDay30 (11032)
  assert.equal(series[29].day, 30);
  assert.equal(series[29].balance, 11032);
});

test('getCashFlowSeries handles multiple savings goals independently without zeroing out deductions', () => {
  const state = createMockState();
  state.goals.push({
    id: 'g2',
    name: 'Emergency Fund Goal',
    target: 1000,
    saved: 0,
    dueDay: 28,
  });

  const series = getCashFlowSeries(state);
  // Both goals must be deducted on their respective due days
  assert.equal(series[29].balance, 11032 - 1000);
});

test('canAfford and simulateExpense evaluate feasibility without modifying state', () => {
  const state = createMockState();

  // Affordable purchase within budget
  const aff1 = canAfford(state, 2000, 1);
  assert.equal(aff1.affordable, true);

  // Unaffordable purchase exceeding available cash
  const aff2 = canAfford(state, 15000, 1);
  assert.equal(aff2.affordable, false);
  assert.match(aff2.reason ?? '', /Insufficient cash/);

  // Purchase that breaches Day 30 projected solvency
  const aff3 = canAfford(state, 12000, 15);
  assert.equal(aff3.affordable, false);
  assert.match(aff3.reason ?? '', /negative/);

  // Zero or negative amounts
  assert.equal(canAfford(state, 0, 1).affordable, false);
  assert.equal(canAfford(state, -100, 1).affordable, false);

  // simulateExpense does not mutate original state
  const simulated = simulateExpense(state, { amount: 2000, category: 'shopping', description: 'Headphones', day: 1 });
  assert.equal(state.transactions.length, 3);
  assert.equal(simulated.transactions.length, 4);

  // computeMetrics & explainImpact
  const currentMetrics = computeMetrics(state);
  const simulatedMetrics = computeMetrics(simulated);
  const explanation = explainImpact(currentMetrics, simulatedMetrics, 2000, true);
  assert.ok(explanation.length > 0);

  // getSavingsProgress
  const progress = getSavingsProgress(state);
  assert.equal(progress.length, 1);
  assert.equal(progress[0].pct, 17); // 500 / 3000 * 100 = 17%
});

test('advanceDays processes due recurring payments and prevents double-processing', () => {
  const state = createMockState();
  // Advance by 6 days (covers Music subscription on Day 5)
  const advanced = advanceDays(state, 6);
  assert.equal(advanced.currentDay, 7);

  const processed = advanced.transactions.find(t => t.description === 'Music Subscription');
  assert.ok(processed);
  assert.equal(processed.amount, 299);
  assert.equal(processed.day, 5);

  // Advancing again does not re-process the same day
  const advancedAgain = advanceDays(advanced, 2);
  const subs = advancedAgain.transactions.filter(t => t.description === 'Music Subscription');
  assert.equal(subs.length, 1);
});

test('getHealthBreakdown returns clamped 0-100 values even in deficit states', () => {
  const state = createMockState();
  // Artificially create negative cash state
  state.transactions.push({
    id: 'huge',
    type: 'expense',
    amount: 50000,
    category: 'other',
    description: 'Huge debt',
    day: 1,
  });

  const health = getHealthBreakdown(state);
  assert.ok(health.total >= 0 && health.total <= 100);
  assert.ok(health.commitmentCoverage >= 0 && health.commitmentCoverage <= 100);
  assert.ok(health.budgetSustainability >= 0 && health.budgetSustainability <= 100);
  assert.ok(health.emergencyResilience >= 0 && health.emergencyResilience <= 100);
  assert.ok(health.savingsFeasibility >= 0 && health.savingsFeasibility <= 100);
  assert.equal(health.band, 'Critical');
});

test('formatINR formats currency properly with symbol and negative signs', () => {
  assert.equal(formatINR(10000), '\u20B910,000');
  assert.equal(formatINR(0), '\u20B90');
  assert.equal(formatINR(-500), '-\u20B9500');
});

test('canAfford rejects future expense that causes intermediate cash deficit before future income', () => {
  const state = createMockState();
  // State has 9330 available cash on Day 1. Freelance income (+5000) arrives on Day 10.
  // Music (299) is due on Day 5. Balance on Day 5 before income is ~9031.
  // An expense of 10000 on Day 6 would dip intermediate cash flow into deficit (-969) before freelance income on Day 10,
  // even though Day 30 projected balance would still be positive (11032 - 10000 = +1032).
  const result = canAfford(state, 10000, 6);
  assert.equal(result.affordable, false);
  assert.match(result.reason ?? '', /deficit/);
});

test('advanceDays processes overdue payments due on day 1 or past days', () => {
  const state = createMockState();
  state.recurring.push({
    id: 'r3',
    name: 'Day 1 Bill',
    amount: 100,
    category: 'other',
    dueDay: 1,
    paused: false,
    processedDays: [],
  });

  // Advancing by 1 day should process the Day 1 bill
  const advanced = advanceDays(state, 1);
  const found = advanced.transactions.find(t => t.description === 'Day 1 Bill');
  assert.ok(found);
  assert.equal(found.amount, 100);
  assert.equal(found.day, 1);
});

test('getCashFlowSeries matches Available Cash and Projected Day 30 across simulation advancement', () => {
  const state = createMockState();
  // Advance to Day 26 (past Day 25 goal deadline and recurring payments)
  const advanced = advanceDays(state, 25);
  assert.equal(advanced.currentDay, 26);

  const series = getCashFlowSeries(advanced);
  // Chart balance at currentDay (Day 26) must match getAvailableCash exactly
  assert.equal(series[advanced.currentDay - 1].balance, getAvailableCash(advanced));
  // Chart balance at Day 30 must match getProjectedDay30 exactly
  assert.equal(series[29].balance, getProjectedDay30(advanced));
});

test('computeMetrics produces identical results to standalone functions with optimized execution', () => {
  const state = createMockState();
  const metrics = computeMetrics(state);

  assert.equal(metrics.availableCash, getAvailableCash(state));
  assert.equal(metrics.totalSpent, getTotalSpent(state));
  assert.equal(metrics.totalIncome, getTotalIncome(state));
  assert.equal(metrics.projectedDay30, getProjectedDay30(state));
  assert.equal(metrics.dailySafeToSpend, getDailySafeToSpend(state));
  assert.deepEqual(metrics.health, getHealthBreakdown(state));
  assert.deepEqual(metrics.upcomingCommitments, getUpcomingCommitments(state));
});

test('paused recurring payments and goals are excluded from upcoming commitments and projections', () => {
  const state = createMockState();
  const baselineProj = getProjectedDay30(state);

  // Pause recurring payment (music: 299)
  state.recurring[0].paused = true;
  // Balance should improve by 299 because music is no longer committed
  assert.equal(getProjectedDay30(state), baselineProj + 299);

  const commitments = getUpcomingCommitments(state);
  assert.equal(commitments.some(c => c.name === 'Music Subscription'), false);

  // Pause goal (headphones: 2500 remaining)
  state.goals[0].paused = true;
  // Balance should improve by remaining 2500
  assert.equal(getProjectedDay30(state), baselineProj + 299 + 2500);
  const commitmentsWithoutGoal = getUpcomingCommitments(state);
  assert.equal(commitmentsWithoutGoal.some(c => c.name.includes('Headphones')), false);
});

test('canAfford enforces liquid cash for immediate purchases even if future income would cover Day 30', () => {
  const state = createMockState();
  // Available cash is 9330. Part-time freelance (+5000) arrives on Day 10.
  // A Day 1 purchase of 9500 exceeds available cash (9330), even though Day 30 balance would be 11032 - 9500 = +1532.
  const result = canAfford(state, 9500, 1);
  assert.equal(result.affordable, false);
  assert.match(result.reason ?? '', /Insufficient cash/);
});

