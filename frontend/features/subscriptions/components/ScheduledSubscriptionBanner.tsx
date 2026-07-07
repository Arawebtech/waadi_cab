'use client';

import { formatDate } from '@/lib/format';
import type { Subscription } from '@/types/subscription';
import { StatusPill } from '@/features/profile/components/StatusPill';

export function ScheduledSubscriptionBanner({ subscription }: { subscription: Subscription }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusPill label="Scheduled" tone="neutral" className="bg-amber-100 text-amber-800 ring-amber-200" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{subscription.planName}</p>
      <p className="mt-1 text-sm text-slate-600">
        Activates on <span className="font-medium">{formatDate(subscription.startDate)}</span>
        {subscription.expiryDate && (
          <>
            {' '}
            · expires {formatDate(subscription.expiryDate)}
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-amber-800">
        Your current plan stays active until then. No manual action needed.
      </p>
    </div>
  );
}
