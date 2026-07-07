import type { SubscriptionPlan } from '@/types/subscription';
import { formatCurrency } from '@/lib/format';

export function PlanDetailsBlock({ plan }: { plan: SubscriptionPlan }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-slate-900 dark:text-white">{plan.name}</span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {formatCurrency(plan.amount, plan.currency)}
        </span>
      </div>
      <p className="mt-1 text-slate-500">{plan.durationDays} days</p>
    </div>
  );
}
