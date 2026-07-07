import React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

export const SkeletonRows: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => (
  <div className="animate-pulse space-y-3 p-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    ))}
  </div>
);

export const EmptyState: React.FC<{ message?: string }> = ({ message = 'No records found' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
    <Inbox className="h-12 w-12 mb-3 opacity-40" />
    <p className="text-sm">{message}</p>
  </div>
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Something went wrong',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-16">
    <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    )}
  </div>
);

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-white/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg dark:border-slate-700/50 ${className}`}>
    {children}
  </div>
);
