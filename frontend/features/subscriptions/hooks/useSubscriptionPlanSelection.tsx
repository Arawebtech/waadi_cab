'use client';

import { useCallback, useState } from 'react';
import { useConfirm } from '@/components/confirm';
import type { SubscriptionOverview, SubscriptionPlan, SubscriptionPurchaseIntent } from '@/types/subscription';
import { PlanDetailsBlock } from '../components/PlanDetailsBlock';
import { resolvePlanIntent } from '../utils/planIntent';

interface PendingPurchase {
  plan: SubscriptionPlan;
  intent: SubscriptionPurchaseIntent;
}

export function useSubscriptionPlanSelection(overview: SubscriptionOverview | undefined) {
  const { confirm } = useConfirm();
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);

  const requestPlanSelection = useCallback(
    async (plan: SubscriptionPlan) => {
      const active = overview?.active ?? null;
      const intent = resolvePlanIntent(active, plan);

      if (intent === 'renew') {
        const ok = await confirm({
          title: 'Renew Subscription',
          description: 'Your current plan will be extended after expiry.',
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          variant: 'success',
          content: active ? (
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>
                Current expiry:{' '}
                <span className="font-medium text-slate-900">
                  {active.expiryDate ? new Date(active.expiryDate).toLocaleDateString('en-IN') : '—'}
                </span>
              </p>
              <PlanDetailsBlock plan={plan} />
            </div>
          ) : (
            <PlanDetailsBlock plan={plan} />
          ),
        });
        if (!ok) return;
        setPendingPurchase({ plan, intent: 'renew' });
        return;
      }

      if (intent === 'replace') {
        const ok = await confirm({
          title: 'Active Subscription Found',
          description:
            'You already have an active subscription. Starting a new one will replace the current plan after it expires.',
          confirmLabel: 'Replace Subscription',
          cancelLabel: 'Cancel',
          variant: 'warning',
          content: (
            <div className="mt-3 space-y-3">
              {overview?.scheduled && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  An existing scheduled plan will be replaced by this selection.
                </p>
              )}
              <PlanDetailsBlock plan={plan} />
            </div>
          ),
        });
        if (!ok) return;
        setPendingPurchase({ plan, intent: 'replace' });
        return;
      }

      const ok = await confirm({
        title: 'Confirm Subscription',
        description: 'Are you sure you want to activate this subscription plan?',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        variant: 'success',
        content: <PlanDetailsBlock plan={plan} />,
      });
      if (!ok) return;
      setPendingPurchase({ plan, intent: 'purchase' });
    },
    [confirm, overview?.active, overview?.scheduled]
  );

  const clearPendingPurchase = useCallback(() => setPendingPurchase(null), []);

  return {
    pendingPurchase,
    requestPlanSelection,
    clearPendingPurchase,
  };
}
