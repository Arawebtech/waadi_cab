import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  expired: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  TRIP_COMPLETED: 'bg-emerald-100 text-emerald-800',
  TRIP_STARTED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  offline: 'bg-slate-100 text-slate-600',
  online: 'bg-blue-100 text-blue-800',
  available: 'bg-emerald-100 text-emerald-800',
  on_trip: 'bg-purple-100 text-purple-800',
};

const StatusBadge: React.FC<{ status: string; label?: string }> = ({ status, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
    {(label || status).replace(/_/g, ' ')}
  </span>
);

export default StatusBadge;
