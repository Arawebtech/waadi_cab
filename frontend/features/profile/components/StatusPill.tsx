'use client';

import { cn } from '@/lib/utils';

type StatusTone = 'active' | 'danger' | 'neutral' | 'warning' | 'approved' | 'rejected';

const toneStyles: Record<StatusTone, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  warning: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  approved: 'bg-green-50 text-green-700 ring-green-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
};

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

export function StatusPill({ label, tone = 'neutral', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        toneStyles[tone],
        className
      )}
    >
      {label}
    </span>
  );
}

export function subscriptionTone(status?: string | null): StatusTone {
  if (status === 'active') return 'active';
  if (status === 'scheduled') return 'neutral';
  if (status === 'expired' || status === 'suspended' || status === 'cancelled') return 'danger';
  return 'neutral';
}
