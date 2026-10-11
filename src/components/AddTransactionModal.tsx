import { useState } from 'react';
import { useFinance } from '@/context/useFinance';
import { Modal, Button, Input, Select } from '@/components/ui';
import { CATEGORY_LABELS } from '@/lib/defaultData';
import type { Category, TxnType } from '@/types';

export function AddTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addTransaction } = useFinance();
  const [type, setType] = useState<TxnType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [day, setDay] = useState(String(state.currentDay));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid positive amount');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    const dayNum = parseInt(day);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > state.totalDays) {
      setError(`Day must be between 1 and ${state.totalDays}`);
      return;
    }

    const result = addTransaction({
      type,
      amount: amt,
      description: description.trim(),
      category,
      day: dayNum,
      source: type === 'income' ? 'income' : undefined,
    });

    if (result.ok) {
      setSuccess(`${type === 'income' ? 'Income' : 'Expense'} of \u20B9${amt.toLocaleString('en-IN')} added`);
      setAmount('');
      setDescription('');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1200);
    } else {
      setError(result.error || 'Failed to add transaction');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Transaction">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === 'expense' ? 'bg-slate-700 text-white' : 'bg-slate-900/40 text-slate-400'}`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === 'income' ? 'bg-lime-400/15 text-lime-300 border border-lime-400/30' : 'bg-slate-900/40 text-slate-400'}`}
          >
            Income
          </button>
        </div>
        <Input
          label="Amount (\u20B9)"
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          min="1"
          error={error || undefined}
        />
        <Input
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Lunch at canteen"
        />
        <Select label="Category" value={category} onChange={e => setCategory(e.target.value as Category)}>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
        <Input
          label={`Day (1-${state.totalDays})`}
          type="number"
          value={day}
          onChange={e => setDay(e.target.value)}
          min="1"
          max={state.totalDays}
        />
        {success && <div className="text-xs text-lime-400 bg-lime-400/10 rounded px-3 py-2">{success}</div>}
        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="primary" className="flex-1">Add {type === 'income' ? 'Income' : 'Expense'}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
