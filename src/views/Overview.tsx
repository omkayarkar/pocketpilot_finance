import { useState, useMemo } from 'react';
import { ShoppingCart, Plus, TrendingUp, TrendingDown, Wallet, ShieldCheck, AlertTriangle, Calendar } from 'lucide-react';
import { useFinance } from '@/context/useFinance';
import { formatINR, formatDay } from '@/lib/format';
import { getCashFlowSeries } from '@/lib/finance';
import { CATEGORY_LABELS } from '@/lib/defaultData';
import { Card, Button, Badge, ProgressBar } from '@/components/ui';
import { CashFlowChart } from '@/components/CashFlowChart';
import type { ViewId } from '@/components/Layout';
import { AddTransactionModal } from '@/components/AddTransactionModal';

export function Overview({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const { state, metrics } = useFinance();
  const [showAddTxn, setShowAddTxn] = useState(false);
  const cashFlow = useMemo(() => getCashFlowSeries(state), [state]);

  const healthColor = metrics.health.band === 'Healthy' ? 'lime' : metrics.health.band === 'Caution' ? 'amber' : 'red';
  const healthIcon = metrics.health.band === 'Healthy' ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-slate-400">{formatDay(state.currentDay)} of {state.totalDays} — your money at a glance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="md" onClick={() => onNavigate('simulator')}>
            <ShoppingCart size={16} /> Simulate a Purchase
          </Button>
          <Button variant="outline" size="md" onClick={() => setShowAddTxn(true)}>
            <Plus size={16} /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Wallet size={14} /> Available Balance
          </div>
          <div className="text-2xl font-bold text-white">{formatINR(metrics.availableCash)}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <TrendingDown size={14} /> Total Spent
          </div>
          <div className="text-2xl font-bold text-white">{formatINR(metrics.totalSpent)}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <TrendingUp size={14} /> Daily Safe-to-Spend
          </div>
          <div className="text-2xl font-bold text-lime-300">{formatINR(metrics.dailySafeToSpend)}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Calendar size={14} /> Projected Day-30
          </div>
          <div className={`text-2xl font-bold ${metrics.projectedDay30 < 0 ? 'text-red-400' : 'text-white'}`}>
            {formatINR(metrics.projectedDay30)}
          </div>
        </Card>
      </div>

      {/* Health + Cash flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">Financial Health</span>
            <Badge variant={healthColor as 'lime' | 'amber' | 'red'}>{healthIcon} {metrics.health.band}</Badge>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold">{metrics.health.total}</span>
            <span className="text-sm text-slate-500 mb-1">/100</span>
          </div>
          <ProgressBar value={metrics.health.total} className={healthColor === 'lime' ? '[&>div]:bg-lime-400' : healthColor === 'amber' ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'} />
          <div className="mt-3 space-y-1 text-xs text-slate-400">
            <div className="flex justify-between"><span>Budget sustainability</span><span className="text-slate-300">{metrics.health.budgetSustainability}/100</span></div>
            <div className="flex justify-between"><span>Emergency resilience</span><span className="text-slate-300">{metrics.health.emergencyResilience}/100</span></div>
            <div className="flex justify-between"><span>Savings feasibility</span><span className="text-slate-300">{metrics.health.savingsFeasibility}/100</span></div>
            <div className="flex justify-between"><span>Commitment coverage</span><span className="text-slate-300">{metrics.health.commitmentCoverage}/100</span></div>
          </div>
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => onNavigate('health')}>
            View Details
          </Button>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">30-Day Cash Flow</span>
            <span className="text-xs text-slate-400">Forecast</span>
          </div>
          <CashFlowChart data={cashFlow} currentDay={state.currentDay} />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Day 1</span>
            <span>Day {state.totalDays}</span>
          </div>
        </Card>
      </div>

      {/* Upcoming + Savings + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Upcoming commitments */}
        <Card>
          <div className="text-sm font-medium text-slate-300 mb-3">Upcoming Commitments</div>
          {metrics.upcomingCommitments.length === 0 ? (
            <p className="text-xs text-slate-400">No upcoming commitments</p>
          ) : (
            <div className="space-y-2">
              {metrics.upcomingCommitments.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-slate-200">{c.name}</div>
                    <div className="text-xs text-slate-400">{formatDay(c.day)}</div>
                  </div>
                  <span className={c.amount < 0 ? 'text-lime-400' : 'text-slate-300'}>
                    {c.amount < 0 ? `+${formatINR(Math.abs(c.amount))}` : formatINR(c.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Savings progress */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">Savings Goals</span>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('savings')}>Manage</Button>
          </div>
          {metrics.savingsProgress.length === 0 ? (
            <p className="text-xs text-slate-400">No goals set</p>
          ) : (
            <div className="space-y-3">
              {metrics.savingsProgress.map(s => (
                <div key={s.goalId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-200">{s.name}</span>
                    <span className="text-slate-400 text-xs">{formatINR(s.saved)} / {formatINR(s.target)}</span>
                  </div>
                  <ProgressBar value={s.pct} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent transactions */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">Recent Transactions</span>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('transactions')}>View All</Button>
          </div>
          {metrics.recentTransactions.length === 0 ? (
            <p className="text-xs text-slate-400">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {metrics.recentTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.type === 'income' ? (
                      <TrendingUp size={14} className="text-lime-400 shrink-0" />
                    ) : (
                      <TrendingDown size={14} className="text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-slate-200 truncate">{t.description}</div>
                      <div className="text-xs text-slate-400">{CATEGORY_LABELS[t.category] || t.category} — {formatDay(t.day)}</div>
                    </div>
                  </div>
                  <span className={t.type === 'income' ? 'text-lime-400' : 'text-slate-300'}>{formatINR(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AddTransactionModal open={showAddTxn} onClose={() => setShowAddTxn(false)} />
    </div>
  );
}
