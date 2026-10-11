import { useState } from 'react';
import { ShieldCheck, AlertTriangle, HeartPulse, RotateCcw } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { formatINR } from '@/lib/format';
import { Card, Badge, Button, ProgressBar, Modal } from '@/components/ui';

export function FinancialHealth() {
  const { metrics, resetAll } = useFinance();
  const [showReset, setShowReset] = useState(false);

  const h = metrics.health;
  const bandColor = h.band === 'Healthy' ? 'lime' : h.band === 'Caution' ? 'amber' : 'red';
  const bandIcon = h.band === 'Healthy' ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />;

  const factors = [
    { name: 'Budget Sustainability', weight: '35%', score: h.budgetSustainability, desc: 'How well your spending tracks against your total available budget. Lower spend relative to budget means a higher score.' },
    { name: 'Emergency Resilience', weight: '25%', score: h.emergencyResilience, desc: 'Your projected Day-30 balance as a proportion of your starting funds. A positive projection means you can absorb unexpected costs.' },
    { name: 'Savings Feasibility', weight: '20%', score: h.savingsFeasibility, desc: 'Average progress toward all active savings goals. Fully funded goals score 100.' },
    { name: 'Commitment Coverage', weight: '20%', score: h.commitmentCoverage, desc: 'Whether your current cash can cover all upcoming commitments. Full coverage scores 100.' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Financial Health</h1>
          <p className="text-sm text-slate-400">A budgeting indicator, not a credit score</p>
        </div>
        <Button variant="outline" onClick={() => setShowReset(true)}>
          <RotateCcw size={16} /> Reset All Data
        </Button>
      </div>

      {/* Score card */}
      <Card className="text-center py-6">
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-2">
          <HeartPulse size={16} /> Health Score
        </div>
        <div className="flex items-end justify-center gap-2 mb-3">
          <span className={`text-6xl font-bold ${h.band === 'Healthy' ? 'text-lime-300' : h.band === 'Caution' ? 'text-amber-400' : 'text-red-400'}`}>
            {h.total}
          </span>
          <span className="text-xl text-slate-500 mb-2">/100</span>
        </div>
        <div className="flex justify-center mb-4">
          <Badge variant={bandColor as 'lime' | 'amber' | 'red'}>{bandIcon} {h.band}</Badge>
        </div>
        <div className="max-w-md mx-auto">
          <ProgressBar
            value={h.total}
            className={h.band === 'Healthy' ? '[&>div]:bg-lime-400' : h.band === 'Caution' ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>Critical (0-44)</span>
            <span>Caution (45-74)</span>
            <span>Healthy (75-100)</span>
          </div>
        </div>
      </Card>

      {/* Factor breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {factors.map(f => (
          <Card key={f.name}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-white">{f.name}</div>
                <div className="text-xs text-slate-500">Weight: {f.weight}</div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-200">{f.score}</span>
                <span className="text-sm text-slate-500">/100</span>
              </div>
            </div>
            <ProgressBar
              value={f.score}
              className={`mb-2 ${f.score >= 75 ? '[&>div]:bg-lime-400' : f.score >= 45 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
            />
            <p className="text-xs text-slate-400">{f.desc}</p>
          </Card>
        ))}
      </div>

      {/* Risk bands explanation */}
      <Card>
        <div className="text-sm font-medium text-slate-300 mb-3">Risk Bands</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="lime"><ShieldCheck size={12} /> Healthy</Badge>
            <span className="text-sm text-slate-400">75-100 — Your budget is sustainable. Keep going.</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="amber"><AlertTriangle size={12} /> Caution</Badge>
            <span className="text-sm text-slate-400">45-74 — Watch your spending. Some commitments may be tight.</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="red"><AlertTriangle size={12} /> Critical</Badge>
            <span className="text-sm text-slate-400">0-44 — Your budget is at risk. Cut spending or increase income.</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-700/40">
          <p className="text-xs text-slate-500">
            This score is a budgeting indicator based on your simulated financial state. It is not a credit score and should not be used for financial decisions beyond this app.
          </p>
        </div>
      </Card>

      {/* Reset modal */}
      <Modal open={showReset} onClose={() => setShowReset(false)} title="Reset All Data?">
        <p className="text-sm text-slate-300 mb-4">
          This will restore the demo data: {formatINR(10000)} starting budget, Day 1, headphones goal, and default recurring payments. All your changes will be lost.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => { resetAll(); setShowReset(false); }}>
            <RotateCcw size={16} /> Reset Everything
          </Button>
          <Button variant="ghost" onClick={() => setShowReset(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
