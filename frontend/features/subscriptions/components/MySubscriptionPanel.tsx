'use client';

import { clsx } from 'clsx';
import type { Subscription } from '@/types/subscription';
import { daysRemaining, formatCurrency, formatDate } from '../../../lib/format';
import { Button } from '@/components/ui/cab-button';
import { useCancelSubscription } from '../hooks';
import { extractErrorMessage } from '@/lib/api/client';
import { useConfirm } from '@/components/confirm';

const statusStyles: Record<Subscription['status'], string> = {
  active: 'bg-[#ECFDF3] text-[#027A48]',
  pending: 'bg-[#FFF4E5] text-[#B54708]',
  scheduled: 'bg-[#FFF4E5] text-[#B54708]',
  expired: 'bg-[#F2F4F7] text-[#344054]',
  cancelled: 'bg-[#FEF3F2] text-[#B42318]',
  suspended: 'bg-[#FEF3F2] text-[#B42318]',
};

export function MySubscriptionPanel({ subscription }: { subscription: Subscription }) {
  const cancel = useCancelSubscription();
  const { confirmAction } = useConfirm();
  const remaining = daysRemaining(subscription.expiryDate);

  const handleCancel = async () => {
    await confirmAction({
      title: 'Cancel subscription?',
      description: 'Your plan benefits will end according to your billing cycle.',
      confirmLabel: 'Cancel subscription',
      cancelLabel: 'Keep plan',
      variant: 'danger',
      action: async () => {
        await cancel.mutateAsync(undefined);
      },
    });
  };

  return (
    <div className="rounded-xl border border-[#E4E7EC] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#101828]">{subscription.planName}</p>
        <span
          className={clsx(
            'rounded-full px-2.5 py-1 text-xs font-medium capitalize',
            statusStyles[subscription.status]
          )}
        >
          {subscription.status}
        </span>
      </div>

      {/* <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[#667085]">Amount paid</dt>
          <dd className="text-[#101828]">{formatCurrency(subscription.amount)}</dd>
        </div>
        <div>
          <dt className="text-[#667085]">
            {subscription.status === 'scheduled' ? 'Activates on' : 'Expires on'}
          </dt>
          <dd className="text-[#101828]">
            {formatDate(subscription.status === 'scheduled' ? subscription.startDate : subscription.expiryDate)}
          </dd>
        </div>
        {subscription.status === 'active' && remaining !== null && (
          <div className="col-span-2">
            <dt className="text-[#667085]">Days remaining</dt>
            <dd className={clsx('font-medium', remaining <= 3 ? 'text-[#B54708]' : 'text-[#101828]')}>
              {Math.max(remaining, 0)} day{remaining === 1 ? '' : 's'}
            </dd>
          </div>
        )}
      </dl> */}
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">

<div>
  <dt className="text-[#667085]">Amount paid</dt>
  <dd className="text-[#101828]">
    {formatCurrency(subscription.amount)}
  </dd>
</div>


<div>
  <dt className="text-[#667085]">Duration</dt>
  <dd className="text-[#101828]">
    {subscription.durationDays} Days
  </dd>
</div>


<div>
  <dt className="text-[#667085]">Start Date</dt>
  <dd className="text-[#101828]">
    {formatDate(subscription.startDate)}
  </dd>
</div>


<div>
  <dt className="text-[#667085]">
    {subscription.status === 'scheduled'
      ? 'Activates on'
      : 'Expires on'}
  </dt>

  <dd className="text-[#101828]">
    {formatDate(
      subscription.status === 'scheduled'
        ? subscription.startDate
        : subscription.expiryDate
    )}
  </dd>
</div>


<div>
  <dt className="text-[#667085]">
    Payment Status
  </dt>
  <dd className="capitalize text-[#101828]">
    {subscription.paymentStatus || 'N/A'}
  </dd>
</div>


<div>
  <dt className="text-[#667085]">
    Gateway
  </dt>
  <dd className="capitalize text-[#101828]">
    {subscription.gateway || 'N/A'}
  </dd>
</div>


<div>
  <dt className="text-[#667085]">
    Auto Renew
  </dt>
  <dd className="text-[#101828]">
    {subscription.autoRenew ? 'Enabled' : 'Disabled'}
  </dd>
</div>


<div>
  <dt className="text-[#667085]">
    Trial Plan
  </dt>
  <dd className="text-[#101828]">
    {subscription.isTrial ? 'Yes' : 'No'}
  </dd>
</div>


<div>
  <dt className="text-[#667085]">
    Renewal Count
  </dt>
  <dd className="text-[#101828]">
    {subscription.renewalCount ?? 0}
  </dd>
</div>


<div>
  <dt className="text-[#667085]">
    Wallet Used
  </dt>
  <dd className="text-[#101828]">
    {subscription.walletUsed
      ? `₹${subscription.walletAmount}`
      : 'No'}
  </dd>
</div>


{subscription.transactionId && (
  <div className="col-span-2">
    <dt className="text-[#667085]">
      Transaction ID
    </dt>

    <dd className="break-all text-xs text-[#101828]">
      {subscription.transactionId}
    </dd>
  </div>
)}


{subscription.status === 'active' &&
  remaining !== null && (
    <div className="col-span-2">
      <dt className="text-[#667085]">
        Days remaining
      </dt>

      <dd
        className={clsx(
          'font-medium',
          remaining <= 3
            ? 'text-[#B54708]'
            : 'text-[#101828]'
        )}
      >
        {Math.max(remaining, 0)} day
        {remaining === 1 ? '' : 's'}
      </dd>
    </div>
  )}

</dl>

      {cancel.isError && (
        <p className="mt-3 text-xs text-[#B42318]">
          {extractErrorMessage(cancel.error, 'Could not cancel subscription')}
        </p>
      )}

      {(subscription.status === 'active' || subscription.status === 'pending') && (
        <Button
          variant="danger"
          className="mt-4"
          onClick={handleCancel}
          isLoading={cancel.isPending}
        >
          Cancel subscription
        </Button>
      )}
    </div>
  );
}
