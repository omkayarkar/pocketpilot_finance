import type { FinanceState } from '@/types';
import { uid } from './format';

export function createDefaultState(): FinanceState {
  const goalId = uid();
  const musicId = uid();
  const rechargeId = uid();

  return {
    startingFunds: 10000,
    currentDay: 1,
    totalDays: 30,
    transactions: [
      { id: uid(), type: 'expense', amount: 120, category: 'food', description: 'College canteen lunch', day: 1 },
      { id: uid(), type: 'expense', amount: 50, category: 'transport', description: 'Bus pass top-up', day: 1 },
      { id: uid(), type: 'income', amount: 5000, category: 'other', description: 'Part-time freelance', day: 10, source: 'income' },
    ],
    goals: [
      { id: goalId, name: 'Headphones', target: 3000, saved: 500, dueDay: 25 },
    ],
    recurring: [
      { id: musicId, name: 'Music Subscription', amount: 299, category: 'subscription', dueDay: 5, paused: false, processedDays: [] },
      { id: rechargeId, name: 'Mobile Recharge', amount: 499, category: 'recharge', dueDay: 15, paused: false, processedDays: [] },
    ],
  };
}

export const PRESETS = [
  { label: 'Headphones', amount: 2000, category: 'shopping' as const, description: 'Wireless headphones' },
  { label: 'Food', amount: 350, category: 'food' as const, description: 'Dining out' },
  { label: 'Cab', amount: 500, category: 'transport' as const, description: 'Cab ride' },
  { label: 'Social outing', amount: 800, category: 'social' as const, description: 'Friends outing' },
  { label: 'Emergency expense', amount: 1500, category: 'emergency' as const, description: 'Unexpected expense' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  transport: 'Transport',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  subscription: 'Subscription',
  recharge: 'Recharge',
  education: 'Education',
  health: 'Health',
  social: 'Social',
  emergency: 'Emergency',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<string, string> = {
  food: 'Utensils',
  transport: 'Bus',
  shopping: 'ShoppingBag',
  entertainment: 'Music',
  subscription: 'Repeat',
  recharge: 'Smartphone',
  education: 'GraduationCap',
  health: 'HeartPulse',
  social: 'Users',
  emergency: 'Siren',
  other: 'Circle',
};
