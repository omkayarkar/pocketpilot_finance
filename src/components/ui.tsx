import { useId, useEffect, type ReactNode, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-lime-400 text-slate-900 hover:bg-lime-300 font-semibold',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
  ghost: 'text-slate-300 hover:text-white hover:bg-slate-800',
  danger: 'bg-red-500 text-white hover:bg-red-600 font-semibold',
  warning: 'bg-amber-500 text-slate-900 hover:bg-amber-400 font-semibold',
  outline: 'border border-slate-600 text-slate-200 hover:border-slate-400 hover:text-white',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({ variant = 'secondary', size = 'md', children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-slate-600 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

type BadgeVariant = 'lime' | 'amber' | 'red' | 'slate' | 'blue';

export function Badge({ children, variant = 'slate' }: { children: ReactNode; variant?: BadgeVariant }) {
  const colors: Record<BadgeVariant, string> = {
    lime: 'bg-lime-400/15 text-lime-300 border-lime-400/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    slate: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${colors[variant]}`}>
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 id={titleId} className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 rounded">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Input({ label, error, id, ...props }: { label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const inputId = id || (label ? generatedId : undefined);
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-slate-400">{label}</label>}
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={`bg-slate-900/60 border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus:border-lime-400 transition-colors ${error ? 'border-red-500/50' : 'border-slate-700'}`}
        {...props}
      />
      {error && <span id={errorId} className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

export function Select({ label, id, children, ...props }: { label?: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const selectId = id || (label ? generatedId : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={selectId} className="text-xs font-medium text-slate-400">{label}</label>}
      <select
        id={selectId}
        className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus:border-lime-400 transition-colors"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function ProgressBar({ value, label, className = '' }: { value: number; label?: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
      className={`h-2 bg-slate-700/50 rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full bg-lime-400 rounded-full transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-slate-400 text-sm">{message}</div>
  );
}
