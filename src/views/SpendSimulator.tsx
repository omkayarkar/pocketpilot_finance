import { useState, useMemo, useRef } from 'react';
import { ShoppingCart, Check, X, RotateCcw, AlertTriangle, TrendingUp, Wallet, Calendar, HeartPulse } from 'lucide-react';
import { useFinance } from '@/context/useFinance';
import { formatINR, formatDay, uid } from '@/lib/format';
import { simulateExpense, computeMetrics, canAfford, explainImpact } from '@/lib/finance';
import { PRESETS, CATEGORY_LABELS } from '@/lib/defaultData';
import { Card, Button, Badge, Input, Select } from '@/components/ui';
import type { Category } from '@/types';

export function SpendSimulator() {
  const { state, metrics, addTransaction } = useFinance();

  const [amount, setAmount] = useState('2000');
  const [description, setDescription] = useState('Wireless headphones');
  const [category, setCategory] = useState<Category>('shopping');
  const [day, setDay] = useState(String(state.currentDay));
  const [applied, setApplied] = useState(false);
  const [scenarioId, setScenarioId] = useState(() => uid());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const isApplyingRef = useRef(false);

  const dayNum = parseInt(day) || state.currentDay;
  const amtNum = parseFloat(amount) || 0;

  // Track if this scenario has already been applied to actual finances
  const isAlreadyApplied = applied || state.transactions.some(t => t.id === scenarioId);

  // Build hypothetical state
  const hypotheticalState = useMemo(() => {
    if (amtNum <= 0) return state;
    return simulateExpense(state, { amount: amtNum, category, description, day: dayNum });
  }, [state, amtNum, category, description, dayNum]);

  const hypoMetrics = useMemo(() => computeMetrics(hypotheticalState), [hypotheticalState]);

  const affordability = useMemo(() => canAfford(state, amtNum, dayNum), [state, amtNum, dayNum]);

  const explanation = useMemo(() => {
    if (amtNum <= 0) return 'Enter an amount to see impact.';
    return explainImpact(metrics, hypoMetrics, amtNum, affordability.affordable, affordability.reason);
  }, [amtNum, metrics, hypoMetrics, affordability]);

  const handleConfigChange = () => {
    setScenarioId(uid());
    setApplied(false);
    isApplyingRef.current = false;
    setFeedback(null);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setAmount(String(preset.amount));
    setDescription(preset.description);
    setCategory(preset.category);
    handleConfigChange();
  };

  const handleApply = () => {
    if (isAlreadyApplied || isApplyingRef.current) {
      setFeedback({ type: 'error', msg: 'This scenario has already been applied' });
      return;
    }
    setFeedback(null);
    if (amtNum <= 0) {
      setFeedback({ type: 'error', msg: 'Enter a valid amount' });
      return;
    }
    if (!affordability.affordable) {
      setFeedback({ type: 'error', msg: affordability.reason || 'This purchase is unaffordable' });
      return;
    }

    isApplyingRef.current = true;
    const result = addTransaction({
      id: scenarioId,
      type: 'expense',
      amount: amtNum,
      description: description.trim() || 'Expense',
      category,
      day: dayNum,
    });

    if (result.ok) {
      setApplied(true);
      setFeedback({ type: 'success', msg: `Recorded ${formatINR(amtNum)} expense on ${formatDay(dayNum)}` });
    } else {
      isApplyingRef.current = false;
      setFeedback({ type: 'error', msg: result.error || 'Failed to apply' });
    }
  };

  const handleCancel = () => {
    if (isAlreadyApplied) {
      setFeedback({ type: 'error', msg: 'Purchase already applied. Cancel only discards unapplied previews.' });
      return;
    }
    handleReset();
    setFeedback({ type: 'success', msg: 'Scenario discarded. No changes to your finances.' });
  };

  const handleReset = () => {
    setAmount('2000');
    setDescription('Wireless headphones');
    setCategory('shopping');
    setDay(String(state.currentDay));
    handleConfigChange();
  };

  // Comparison rows
  const comparisons = [
    { label: 'Available Cash', before: metrics.availableCash, after: hypoMetrics.availableCash, icon: <Wallet size={14} /> },
    { label: 'Daily Safe-to-Spend', before: metrics.dailySafeToSpend, after: hypoMetrics.dailySafeToSpend, icon: <TrendingUp size={14} /> },
    { label: 'Projected Day-30', before: metrics.projectedDay30, after: hypoMetrics.projectedDay30, icon: <Calendar size={14} /> },
    { label: 'Health Score', before: metrics.health.total, after: hypoMetrics.health.total, icon: <HeartPulse size={14} />, isScore: true },
  ];

  const savingsFeasible = hypoMetrics.projectedDay30 >= 0;
  const hypoUpcomingExpenses = hypoMetrics.upcomingCommitments
    .filter(c => c.amount > 0)
    .reduce((total, c) => total + c.amount, 0);
  const commitmentCovered = hypoUpcomingExpenses === 0 || hypoMetrics.availableCash >= hypoUpcomingExpenses;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Spend Simulator</h1>
        <p className="text-sm text-slate-400">Preview the impact of a purchase before you commit</p>
      </div>

      {/* Presets */}
      <div>
        <div className="text-xs font-medium text-slate-400 mb-2">Quick Presets</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-300 hover:border-lime-400/40 hover:text-lime-300 transition-colors"
            >
              {p.label} — {formatINR(p.amount)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Config panel */}
        <Card>
          <div className="text-sm font-medium text-slate-300 mb-3">Scenario Details</div>
          <div className="space-y-3">
            <Input
              label="Amount (\u20B9)"
              type="number"
              value={amount}
              onChange={e => { setAmount(e.target.value); handleConfigChange(); }}
              min="1"
            />
            <Input
              label="Description"
              value={description}
              onChange={e => { setDescription(e.target.value); handleConfigChange(); }}
            />
            <Select label="Category" value={category} onChange={e => { setCategory(e.target.value as Category); handleConfigChange(); }}>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            <Input
              label={`Day (1-${state.totalDays})`}
              type="number"
              value={day}
              onChange={e => { setDay(e.target.value); handleConfigChange(); }}
              min="1"
              max={state.totalDays}
            />
          </div>

          {/* Affordability status */}
          <div className="mt-4">
            {affordability.affordable ? (
              <Badge variant="lime"><Check size={12} /> Affordable</Badge>
            ) : (
              <Badge variant="red"><AlertTriangle size={12} /> Unaffordable</Badge>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`mt-3 text-xs rounded-lg px-3 py-2 ${feedback.type === 'success' ? 'bg-lime-400/10 text-lime-300' : 'bg-red-500/10 text-red-400'}`}>
              {feedback.msg}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="primary" onClick={handleApply} disabled={isAlreadyApplied || !affordability.affordable}>
              <Check size={16} /> {isAlreadyApplied ? 'Applied' : 'Apply Decision'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isAlreadyApplied}>
              <X size={16} /> Cancel
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw size={16} /> Reset Scenario
            </Button>
          </div>
        </Card>

        {/* Impact comparison panel */}
        <Card>
          <div className="text-sm font-medium text-slate-300 mb-3">Impact Comparison</div>
          <div className="space-y-3">
            {comparisons.map(c => {
              const delta = c.after - c.before;
              const isNegative = delta < 0;
              const isNeutral = delta === 0;
              const formatVal = (v: number) => c.isScore ? `${v}/100` : formatINR(v);
              return (
                <div key={c.label} className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    {c.icon} {c.label}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">{formatVal(c.before)}</span>
                    <span className="text-slate-600">→</span>
                    <span className={`font-semibold ${isNegative ? 'text-amber-400' : isNeutral ? 'text-slate-300' : 'text-lime-300'}`}>
                      {formatVal(c.after)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feasibility flags */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Savings Goal Feasibility</span>
              {savingsFeasible ? (
                <Badge variant="lime"><Check size={12} /> On Track</Badge>
              ) : (
                <Badge variant="red"><AlertTriangle size={12} /> At Risk</Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Commitment Coverage</span>
              {commitmentCovered ? (
                <Badge variant="lime"><Check size={12} /> Covered</Badge>
              ) : (
                <Badge variant="amber"><AlertTriangle size={12} /> Shortfall</Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Risk Level</span>
              <Badge variant={hypoMetrics.health.band === 'Healthy' ? 'lime' : hypoMetrics.health.band === 'Caution' ? 'amber' : 'red'}>
                {hypoMetrics.health.band}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Explanation */}
      <Card className="bg-slate-800/40">
        <div className="flex items-start gap-3">
          <div className="text-lime-400 mt-0.5"><ShoppingCart size={18} /></div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">What this means</div>
            <p className="text-sm text-slate-200">{explanation}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
