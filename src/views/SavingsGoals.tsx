import { useState } from 'react';
import { Target, Plus, ArrowDownToLine, ArrowUpFromLine, Check } from 'lucide-react';
import { useFinance } from '@/context/useFinance';
import { formatINR, formatDay } from '@/lib/format';
import { Card, Button, Badge, ProgressBar, Input, Modal, EmptyState } from '@/components/ui';
import type { SavingsGoal } from '@/types';

export function SavingsGoals() {
  const { state, metrics, addGoal, contributeGoal, withdrawGoal } = useFinance();
  const [showAdd, setShowAdd] = useState(false);
  const [actionGoal, setActionGoal] = useState<{ goal: SavingsGoal; type: 'contribute' | 'withdraw' } | null>(null);

  // New goal form
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [error, setError] = useState('');

  // Action form
  const [actionAmount, setActionAmount] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const t = parseFloat(target);
    if (!name.trim()) { setError('Name is required'); return; }
    if (isNaN(t) || t <= 0) { setError('Target must be positive'); return; }
    const dd = parseInt(dueDay);
    if (isNaN(dd) || dd < 1 || dd > state.totalDays) { setError(`Due day must be 1-${state.totalDays}`); return; }
    addGoal({ name: name.trim(), target: t, saved: 0, dueDay: dd });
    setName(''); setTarget(''); setDueDay('');
    setShowAdd(false);
  };

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionGoal) return;
    setActionError(''); setActionSuccess('');
    const amt = parseFloat(actionAmount);
    if (isNaN(amt) || amt <= 0) { setActionError('Enter a valid amount'); return; }
    const result = actionGoal.type === 'contribute'
      ? contributeGoal(actionGoal.goal.id, amt)
      : withdrawGoal(actionGoal.goal.id, amt);
    if (result.ok) {
      setActionSuccess(`${actionGoal.type === 'contribute' ? 'Contributed' : 'Withdrawn'} ${formatINR(amt)}`);
      setActionAmount('');
      setTimeout(() => { setActionGoal(null); setActionSuccess(''); }, 1200);
    } else {
      setActionError(result.error || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-sm text-slate-400">Total saved: {formatINR(metrics.totalSaved)}</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> New Goal
        </Button>
      </div>

      {state.goals.length === 0 ? (
        <Card><EmptyState message="No savings goals yet. Create one to start tracking." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {state.goals.map(g => {
            const progress = metrics.savingsProgress.find(s => s.goalId === g.id);
            const remaining = g.target - g.saved;
            const isComplete = g.saved >= g.target;
            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-lime-400/15 flex items-center justify-center">
                      <Target size={20} className="text-lime-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{g.name}</div>
                      <div className="text-xs text-slate-500">Due {formatDay(g.dueDay)}</div>
                    </div>
                  </div>
                  {isComplete && <Badge variant="lime"><Check size={12} /> Complete</Badge>}
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold">{formatINR(g.saved)}</span>
                  <span className="text-sm text-slate-400">of {formatINR(g.target)}</span>
                </div>
                <ProgressBar value={progress?.pct ?? 0} className="mb-3" />
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>{progress?.pct ?? 0}% complete</span>
                  <span>{formatINR(remaining)} remaining</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setActionGoal({ goal: g, type: 'contribute' }); setActionAmount(''); setActionError(''); setActionSuccess(''); }} disabled={isComplete} className="flex-1">
                    <ArrowDownToLine size={14} /> Contribute
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setActionGoal({ goal: g, type: 'withdraw' }); setActionAmount(''); setActionError(''); setActionSuccess(''); }} disabled={g.saved <= 0} className="flex-1">
                    <ArrowUpFromLine size={14} /> Withdraw
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add goal modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Savings Goal">
        <form onSubmit={handleAddGoal} className="space-y-3">
          <Input label="Goal Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Phone" error={error || undefined} />
          <Input label="Target Amount" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="5000" min="1" />
          <Input label={`Due Day (1-${state.totalDays})`} type="number" value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="20" min="1" max={state.totalDays} />
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" className="flex-1">Create Goal</Button>
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Contribute/Withdraw modal */}
      <Modal
        open={!!actionGoal}
        onClose={() => setActionGoal(null)}
        title={actionGoal?.type === 'contribute' ? 'Contribute to Goal' : 'Withdraw from Goal'}
      >
        {actionGoal && (
          <form onSubmit={handleAction} className="space-y-3">
            <div className="text-sm text-slate-400">
              <span className="text-white">{actionGoal.goal.name}</span> — Saved: {formatINR(actionGoal.goal.saved)} / {formatINR(actionGoal.goal.target)}
            </div>
            <Input
              label="Amount"
              type="number"
              value={actionAmount}
              onChange={e => setActionAmount(e.target.value)}
              placeholder="0"
              min="1"
              error={actionError || undefined}
            />
            {actionSuccess && <div className="text-xs text-lime-400 bg-lime-400/10 rounded px-3 py-2">{actionSuccess}</div>}
            <div className="flex gap-2 pt-1">
              <Button type="submit" variant="primary" className="flex-1">
                {actionGoal.type === 'contribute' ? 'Contribute' : 'Withdraw'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActionGoal(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
