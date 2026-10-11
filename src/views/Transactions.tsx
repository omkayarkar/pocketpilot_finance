import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useFinance } from '@/context/useFinance';
import { formatINR, formatDay } from '@/lib/format';
import { CATEGORY_LABELS } from '@/lib/defaultData';
import { Card, Button, Badge, Input, Select, Modal, EmptyState } from '@/components/ui';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import type { Transaction, Category, TxnType } from '@/types';

export function Transactions() {
  const { state, updateTransaction, deleteTransaction } = useFinance();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCat, setFilterCat] = useState<'all' | Category>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return [...state.transactions]
      .sort((a, b) => b.day - a.day)
      .filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterCat !== 'all' && t.category !== filterCat) return false;
        if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
  }, [state.transactions, search, filterType, filterCat]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-slate-400">{state.transactions.length} total transactions</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search transactions"
            placeholder="Search transactions..."
            className="w-full bg-slate-900/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
          />
        </div>
        <Select aria-label="Filter by transaction type" value={filterType} onChange={e => setFilterType(e.target.value as 'all' | 'income' | 'expense')}>
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </Select>
        <Select aria-label="Filter by category" value={filterCat} onChange={e => setFilterCat(e.target.value as 'all' | Category)}>
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      {/* List */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState message="No transactions match your filters" />
        ) : (
          <div className="divide-y divide-slate-700/40">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {t.type === 'income' ? (
                    <div className="w-8 h-8 rounded-lg bg-lime-400/15 flex items-center justify-center shrink-0">
                      <TrendingUp size={16} className="text-lime-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
                      <TrendingDown size={16} className="text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{t.description}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Badge variant="slate">{CATEGORY_LABELS[t.category]}</Badge>
                      <span>{formatDay(t.day)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-lime-400' : 'text-slate-200'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatINR(t.amount)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(t)}
                      aria-label={`Edit ${t.description}`}
                      className="p-1.5 text-slate-400 hover:text-lime-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(t.id)}
                      aria-label={`Delete ${t.description}`}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit modal */}
      {editing && (
        <EditTransactionModal
          txn={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => { updateTransaction(editing.id, patch); setEditing(null); }}
        />
      )}

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Transaction?">
        <p className="text-sm text-slate-300 mb-4">This action cannot be undone. The transaction will be permanently removed.</p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => { if (deleteId) deleteTransaction(deleteId); setDeleteId(null); }}>
            <Trash2 size={16} /> Delete
          </Button>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
        </div>
      </Modal>

      <AddTransactionModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function EditTransactionModal({ txn, onClose, onSave }: {
  txn: Transaction;
  onClose: () => void;
  onSave: (patch: Partial<Omit<Transaction, 'id'>>) => void;
}) {
  const { state } = useFinance();
  const [type, setType] = useState<TxnType>(txn.type);
  const [amount, setAmount] = useState(String(txn.amount));
  const [description, setDescription] = useState(txn.description);
  const [category, setCategory] = useState<Category>(txn.category);
  const [day, setDay] = useState(String(txn.day));
  const [error, setError] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return; }
    const dayNum = parseInt(day);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > state.totalDays) { setError(`Day must be 1-${state.totalDays}`); return; }
    onSave({ type, amount: amt, description: description.trim(), category, day: dayNum });
  };

  return (
    <Modal open={true} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSave} className="space-y-3">
        <div className="flex gap-2" role="group" aria-label="Transaction type">
          <button type="button" aria-pressed={type === 'expense'} onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'expense' ? 'bg-slate-700 text-white' : 'bg-slate-900/40 text-slate-400'}`}>Expense</button>
          <button type="button" aria-pressed={type === 'income'} onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'income' ? 'bg-lime-400/15 text-lime-300 border border-lime-400/30' : 'bg-slate-900/40 text-slate-400'}`}>Income</button>
        </div>
        <Input label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} error={error || undefined} />
        <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <Select label="Category" value={category} onChange={e => setCategory(e.target.value as Category)}>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select>
        <Input label="Day" type="number" value={day} onChange={e => setDay(e.target.value)} min="1" max={state.totalDays} />
        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="primary" className="flex-1">Save Changes</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
