'use client';

import { useState } from 'react';
import type { SubscriptionPlan } from '@/types/subscription';
import { PlanCard } from '@/features/subscriptions/components/PlanCard';
import { PurchaseSheet } from '@/features/subscriptions/components/PurchaseSheet';
import { usePlans, useMySubscription } from '@/features/subscriptions/hooks';
import { useSubscriptionPlanSelection } from '@/features/subscriptions/hooks/useSubscriptionPlanSelection';
import { isSamePlan } from '@/features/subscriptions/utils/planIntent';
import { ErrorState, Spinner } from '@/components/ui/states';
import { extractErrorMessage } from '@/lib/client';

interface SubscriptionPlansSectionProps {
  title?: string;
  onSuccess?: () => void;
}

export function SubscriptionPlansSection({
  title = 'Available plans',
  onSuccess,
}: SubscriptionPlansSectionProps) {
  const plansQuery = usePlans();
  const mySubQuery = useMySubscription();
  const { pendingPurchase, requestPlanSelection, clearPendingPurchase } = useSubscriptionPlanSelection(
    mySubQuery.data
  );
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const active = mySubQuery.data?.active ?? null;
  const hasActive = Boolean(active);

  const getActionLabel = (plan: SubscriptionPlan) => {
    if (!active) return 'Choose plan';
    return isSamePlan(active, plan) ? 'Renew plan' : 'Switch plan';
  };

  const handleSuccess = () => {
    clearPendingPurchase();
    setProcessingPlanId(null);
    mySubQuery.refetch();
    onSuccess?.();
  };

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>

      {plansQuery.isLoading && <Spinner label="Loading plans…" />}
      {plansQuery.isError && (
        <ErrorState
          message={extractErrorMessage(plansQuery.error, 'Could not load plans')}
          onRetry={plansQuery.refetch}
        />
      )}

      {plansQuery.data && (
        <div className="grid gap-4 sm:grid-cols-2">
          {plansQuery.data.plans.map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              onSelect={() => {
                setProcessingPlanId(plan._id);
                void requestPlanSelection(plan).finally(() => setProcessingPlanId(null));
              }}
              isProcessing={processingPlanId === plan._id}
              actionLabel={getActionLabel(plan)}
            />
          ))}
        </div>
      )}

      {hasActive && (
        <p className="mt-3 text-xs text-slate-500">
          Renewing extends your current plan. Switching schedules the new plan after your active plan expires.
        </p>
      )}

      <PurchaseSheet
        plan={pendingPurchase?.plan ?? null}
        intent={pendingPurchase?.intent ?? 'purchase'}
        onClose={clearPendingPurchase}
        onWalletSuccess={handleSuccess}
        onGatewayInitiated={() => {
          clearPendingPurchase();
        }}
      />
    </section>
  );
}
