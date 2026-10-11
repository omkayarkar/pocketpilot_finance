import { type ReactNode } from 'react';
import { LayoutDashboard, ShoppingCart, ArrowLeftRight, Target, Repeat, HeartPulse, Wallet } from 'lucide-react';

export type ViewId = 'overview' | 'simulator' | 'transactions' | 'savings' | 'recurring' | 'health';

interface NavItem {
  id: ViewId;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'simulator', label: 'Spend Simulator', icon: <ShoppingCart size={18} /> },
  { id: 'transactions', label: 'Transactions', icon: <ArrowLeftRight size={18} /> },
  { id: 'savings', label: 'Savings Goals', icon: <Target size={18} /> },
  { id: 'recurring', label: 'Recurring Payments', icon: <Repeat size={18} /> },
  { id: 'health', label: 'Financial Health', icon: <HeartPulse size={18} /> },
];

interface LayoutProps {
  current: ViewId;
  onNavigate: (view: ViewId) => void;
  children: ReactNode;
  currentDay: number;
  totalDays: number;
}

export function Layout({ current, onNavigate, children, currentDay, totalDays }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-lime-400" />
          <span className="font-bold text-lg">PocketPilot</span>
        </div>
        <span className="text-xs text-slate-400">Day {currentDay}/{totalDays}</span>
      </div>

      {/* Sidebar / Nav */}
      <nav className="md:w-60 md:min-h-screen border-r border-slate-800 bg-slate-950/30 md:flex md:flex-col">
        <div className="hidden md:flex items-center gap-2 px-5 py-5 border-b border-slate-800">
          <Wallet size={22} className="text-lime-400" />
          <div>
            <div className="font-bold text-lg leading-tight">PocketPilot</div>
            <div className="text-[10px] text-slate-500">Know the impact before you spend</div>
          </div>
        </div>
        <div className="flex md:flex-col gap-1 p-2 md:p-3 overflow-x-auto md:overflow-x-visible">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 ${
                current === item.id
                  ? 'bg-lime-400/10 text-lime-300 border border-lime-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="hidden md:block mt-auto p-3">
          <div className="text-xs text-slate-500 px-3 py-2">Day {currentDay} of {totalDays}</div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 md:overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
