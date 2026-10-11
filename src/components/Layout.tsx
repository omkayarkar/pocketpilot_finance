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
      {/* Skip to main content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-lime-400 focus:text-slate-900 focus:font-semibold focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-lime-400" />
          <span className="font-bold text-lg">PocketPilot</span>
        </div>
        <span className="text-xs text-slate-400">Day {currentDay}/{totalDays}</span>
      </div>

      {/* Sidebar / Nav */}
      <nav aria-label="Main navigation" className="md:w-60 md:min-h-screen border-r border-slate-800 bg-slate-950/30 md:flex md:flex-col">
        <div className="hidden md:flex items-center gap-2 px-5 py-5 border-b border-slate-800">
          <Wallet size={22} className="text-lime-400" />
          <div>
            <div className="font-bold text-lg leading-tight">PocketPilot</div>
            <div className="text-[10px] text-slate-400">Know the impact before you spend</div>
          </div>
        </div>
        <div className="flex md:flex-col gap-1 p-2 md:p-3 overflow-x-auto md:overflow-x-visible">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={current === item.id ? 'page' : undefined}
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
          <div className="text-xs text-slate-400 px-3 py-2">Day {currentDay} of {totalDays}</div>
        </div>
      </nav>

      {/* Main content */}
      <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6 md:overflow-y-auto focus:outline-none">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
