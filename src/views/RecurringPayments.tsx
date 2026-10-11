import { useState } from 'react';
import { Repeat, Plus, Pause, Play, Pencil, Trash2, FastForward, AlertTriangle, Check } from 'lucide-react';
import { useFinance } from '@/context/useFinance';
import { formatINR, formatDay } from '@/lib/format';
import { CATEGORY_LABELS } from '@/lib/defaultData';
import { Card, Button, Badge, Input, Select, Modal, EmptyState } from '@/components/ui';
import type { Category, RecurringPayment } from '@/types';

export function RecurringPayments() {
  const { state, addRecurring, updateRecurring, deleteRecurring, toggleRecurringPause, advanceSim } = useFinance();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<RecurringPayment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [advanceModal, setAdvanceModal] = useState(false);
  const [advanceDays, setAdvanceDays] = useState('1');
  const [feedback, setFeedback] = useState('');

  // New recurring form
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('subscription');
  const [dueDay, setDueDay] = useState('');
  const [error, setError] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!name.trim()) { setError('Name is required'); return; }
    if (isNaN(amt) || amt <= 0) { setError('Amount must be positive'); return; }
    const dd = parseInt(dueDay);
    if (isNaN(dd) || dd < 1 || dd > state.totalDays) { setError(`Due day must be 1-${state.totalDays}`); return; }
    addRecurring({ name: name.trim(), amount: amt, category, dueDay: dd, paused: false });
    setName(''); setAmount(''); setDueDay('');
    setShowAdd(false);
  };

  const handleAdvance = () => {
    const d = parseInt(advanceDays);
    if (isNaN(d) || d <= 0) return;
    advanceSim(d);
    setFeedback(`Advanced ${d} day${d > 1 ? 's' : ''}. Recurring payments processed.`);
    setAdvanceModal(false);
    setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recurring Payments</h1>
          <p className="text-sm text-slate-400">{formatDay(state.currentDay)} — manage subscriptions and recurring bills</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAdvanceModal(true)}>
            <FastForward size={16} /> Advance Days
          </Button>
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Recurring
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="text-xs text-lime-300 bg-lime-400/10 rounded-lg px-3 py-2">{feedback}</div>
      )}

      {state.recurring.length === 0 ? (
        <Card><EmptyState message="No recurring payments set up." /></Card>
      ) : (
        <div className="space-y-2">
          {state.recurring.map(r => {
            const isPast = r.dueDay <= state.currentDay;
            const isProcessed = r.processedDays.includes(r.dueDay);
            const isUpcoming = r.dueDay > state.currentDay && !r.paused;

            return (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.paused ? 'bg-slate-700/50' : 'bg-lime-400/15'}`}>
                      <Repeat size={20} className={r.paused ? 'text-slate-500' : 'text-lime-400'} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{r.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Badge variant="slate">{CATEGORY_LABELS[r.category]}</Badge>
                        <span>{formatINR(r.amount)}</span>
                        <span>— Due {formatDay(r.dueDay)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {r.paused ? (
                      <Badge variant="slate"><Pause size={12} /> Paused</Badge>
                    ) : isProcessed ? (
                      <Badge variant="lime"><Check size={12} /> Paid</Badge>
                    ) : isPast ? (
                      <Badge variant="red"><AlertTriangle size={12} /> Overdue</Badge>
                    ) : isUpcoming ? (
                      <Badge variant="amber">Upcoming</Badge>
                    ) : null}

                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleRecurringPause(r.id)}
                        aria-label={r.paused ? `Resume ${r.name}` : `Pause ${r.name}`}
                        className="p-1.5 text-slate-400 hover:text-lime-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                        title={r.paused ? 'Resume' : 'Pause'}
                      >
                        {r.paused ? <Play size={14} /> : <Pause size={14} />}
                      </button>
                      <button
                        onClick={() => setEditing(r)}
                        aria-label={`Edit ${r.name}`}
                        className="p-1.5 text-slate-400 hover:text-lime-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(r.id)}
                        aria-label={`Delete ${r.name}`}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Recurring Payment">
        <form onSubmit={handleAdd} className="space-y-3">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Netflix" error={error || undefined} />
          <Input label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="299" min="1" />
          <Select label="Category" value={category} onChange={e => setCategory(e.target.value as Category)}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
          <Input label={`Due Day (1-${state.totalDays})`} type="number" value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="5" min="1" max={state.totalDays} />
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" className="flex-1">Add</Button>
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      {editing && (
        <EditRecurringModal rp={editing} onClose={() => setEditing(null)}
          onSave={(patch) => { updateRecurring(editing.id, patch); setEditing(null); }} />
      )}

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Recurring Payment?">
        <p className="text-sm text-slate-300 mb-4">This will remove the recurring payment. Past transactions from it will remain.</p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => { if (deleteId) deleteRecurring(deleteId); setDeleteId(null); }}>
            <Trash2 size={16} /> Delete
          </Button>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Advance days modal */}
      <Modal open={advanceModal} onClose={() => setAdvanceModal(false)} title="Advance Simulation">
        <p className="text-sm text-slate-400 mb-3">Move forward in the simulation. Due recurring payments will be processed automatically.</p>
        <Input label="Days to advance" type="number" value={advanceDays} onChange={e => setAdvanceDays(e.target.value)} min="1" max={state.totalDays - state.currentDay} />
        <div className="flex gap-2 mt-3">
          <Button variant="primary" className="flex-1" onClick={handleAdvance}>
            <FastForward size={16} /> Advance
          </Button>
          <Button variant="ghost" onClick={() => setAdvanceModal(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}

function EditRecurringModal({ rp, onClose, onSave }: {
  rp: RecurringPayment;
  onClose: () => void;
  onSave: (patch: Partial<Omit<RecurringPayment, 'id' | 'processedDays'>>) => void;
}) {
  const { state } = useFinance();
  const [name, setName] = useState(rp.name);
  const [amount, setAmount] = useState(String(rp.amount));
  const [category, setCategory] = useState<Category>(rp.category);
  const [dueDay, setDueDay] = useState(String(rp.dueDay));
  const [error, setError] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim()) { setError('Name is required'); return; }
    if (isNaN(amt) || amt <= 0) { setError('Amount must be positive'); return; }
    const dd = parseInt(dueDay);
    if (isNaN(dd) || dd < 1 || dd > state.totalDays) { setError(`Day must be 1-${state.totalDays}`); return; }
    onSave({ name: name.trim(), amount: amt, category, dueDay: dd });
  };

  return (
    <Modal open={true} onClose={onClose} title="Edit Recurring Payment">
      <form onSubmit={handleSave} className="space-y-3">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} error={error || undefined} />
        <Input label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" />
        <Select label="Category" value={category} onChange={e => setCategory(e.target.value as Category)}>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select>
        <Input label="Due Day" type="number" value={dueDay} onChange={e => setDueDay(e.target.value)} min="1" max={state.totalDays} />
        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="primary" className="flex-1">Save</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
