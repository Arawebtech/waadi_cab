'use client';

import { useState } from 'react';
import type { SubscriptionPlan, SubscriptionPurchaseIntent } from '@/types/subscription';
import { formatCurrency } from '@/lib/format';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/cab-button';
import { useInitiateGatewayPurchase, usePurchaseByWallet } from '../hooks';
import { extractErrorMessage } from '@/lib/api/client';

interface PurchaseSheetProps {
  plan: SubscriptionPlan | null;
  intent?: SubscriptionPurchaseIntent;
  onClose: () => void;
  onWalletSuccess: () => void;
  onGatewayInitiated: (payment: Record<string, unknown>, subscriptionId: string) => void;
}

const intentTitles: Record<SubscriptionPurchaseIntent, string> = {
  purchase: 'Complete purchase',
  renew: 'Complete renewal',
  replace: 'Schedule plan switch',
};

export function PurchaseSheet({
  plan,
  intent = 'purchase',
  onClose,
  onWalletSuccess,
  onGatewayInitiated,
}: PurchaseSheetProps) {
  const purchaseByWallet = usePurchaseByWallet();
  const initiateGateway = useInitiateGatewayPurchase();
  const [error, setError] = useState<string | null>(null);

  if (!plan) return null;

  const busy = purchaseByWallet.isPending || initiateGateway.isPending;

  const handleWallet = async () => {
    setError(null);
    try {
      await purchaseByWallet.mutateAsync({ planId: plan._id, intent });
      onWalletSuccess();
    } catch (err) {
      setError(extractErrorMessage(err, 'Wallet purchase failed'));
    }
  };

  const handleGateway = async () => {
    setError(null);
    try {
      const result = await initiateGateway.mutateAsync({ planId: plan._id, intent });
      onGatewayInitiated(result.payment, result.subscriptionId);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not start payment'));
    }
  };

  return (
    <Modal open={Boolean(plan)} onClose={busy ? () => undefined : onClose} title={intentTitles[intent]}>
      <p className="mb-1 text-sm font-medium text-slate-900">{plan.name}</p>
      <p className="mb-4 text-sm text-slate-500">
        {formatCurrency(plan.amount, plan.currency)} · {plan.durationDays} days
      </p>

      {intent === 'replace' && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Payment confirms your new plan. It will activate automatically after your current subscription expires.
        </p>
      )}

      {intent === 'renew' && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Your active plan stays unchanged. The duration will be added after the current expiry date.
        </p>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        <Button className="w-full" onClick={handleWallet} isLoading={purchaseByWallet.isPending} disabled={busy}>
          Pay from wallet
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleGateway}
          isLoading={initiateGateway.isPending}
          disabled={busy}
        >
          Pay with card / UPI
        </Button>
      </div>
    </Modal>
  );
}
