export type TxnType = 'income' | 'expense';

export type Category =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'subscription'
  | 'recharge'
  | 'education'
  | 'health'
  | 'social'
  | 'emergency'
  | 'other';

export interface Transaction {
  id: string;
  type: TxnType;
  amount: number;
  category: Category;
  description: string;
  day: number;
  source?: string;
  recurringId?: string;
  goalId?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  dueDay: number;
  paused?: boolean;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  category: Category;
  dueDay: number;
  paused: boolean;
  // track which days have been processed
  processedDays: number[];
}

export interface FinanceState {
  startingFunds: number;
  currentDay: number;
  totalDays: number;
  transactions: Transaction[];
  goals: SavingsGoal[];
  recurring: RecurringPayment[];
}

export interface HealthBreakdown {
  budgetSustainability: number;
  emergencyResilience: number;
  savingsFeasibility: number;
  commitmentCoverage: number;
  total: number;
  band: 'Healthy' | 'Caution' | 'Critical';
}

export interface Metrics {
  availableCash: number;
  totalSpent: number;
  totalIncome: number;
  totalSaved: number;
  dailySafeToSpend: number;
  projectedDay30: number;
  upcomingCommitments: { name: string; amount: number; day: number }[];
  savingsProgress: { goalId: string; name: string; saved: number; target: number; pct: number }[];
  health: HealthBreakdown;
  recentTransactions: Transaction[];
}
