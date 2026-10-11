import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, clearState } from '../src/lib/storage.ts';

import type { FinanceState } from '../src/types.ts';

// Mock localStorage for Node test runner
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  length: 0,
  key: () => null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

test('loadState returns null when storage is empty', () => {
  storageMap.clear();
  assert.equal(loadState(), null);
});

test('loadState gracefully sanitizes corrupted or missing properties', () => {
  storageMap.clear();
  storageMap.set('pocketpilot_state_v1', JSON.stringify({
    startingFunds: 'corrupted', // not a number
    currentDay: -5,
    totalDays: 'invalid',
    transactions: 'not an array',
    goals: null,
    recurring: [{ id: 'r1', name: 'Bill', amount: 100, dueDay: 5 }], // missing processedDays
  }));

  const loaded = loadState();
  assert.ok(loaded);
  assert.equal(loaded.startingFunds, 10000); // defaulted
  assert.equal(loaded.totalDays, 30); // defaulted
  assert.equal(loaded.currentDay, 1); // defaulted
  assert.deepEqual(loaded.transactions, []); // defaulted
  assert.deepEqual(loaded.goals, []); // defaulted
  assert.equal(loaded.recurring.length, 1);
  assert.deepEqual(loaded.recurring[0].processedDays, []); // defaulted to array
  assert.equal(loaded.recurring[0].paused, false);
});

test('loadState correctly loads well-formed state', () => {
  storageMap.clear();
  const validState = {
    startingFunds: 10000,
    currentDay: 2,
    totalDays: 30,
    transactions: [{ id: 'tx1', type: 'expense', amount: 50, category: 'food', description: 'Tea', day: 1 }],
    goals: [{ id: 'g1', name: 'Trip', target: 5000, saved: 1000, dueDay: 20 }],
    recurring: [{ id: 'r1', name: 'Gym', amount: 800, category: 'health', dueDay: 10, paused: false, processedDays: [] }],
  };
  saveState(validState as unknown as FinanceState);

  const loaded = loadState();
  assert.ok(loaded);
  assert.equal(loaded.startingFunds, 10000);
  assert.equal(loaded.currentDay, 2);
  assert.equal(loaded.transactions.length, 1);
  assert.equal(loaded.goals.length, 1);
  assert.equal(loaded.recurring.length, 1);

  clearState();
  assert.equal(loadState(), null);
});
