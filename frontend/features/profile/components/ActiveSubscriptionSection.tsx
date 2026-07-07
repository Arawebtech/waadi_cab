'use client';

import Link from 'next/link';
import { CreditCard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useMySubscription } from '@/features/subscriptions/hooks';
import { formatDate } from '@/lib/format';
import type { Subscription } from '@/types/subscription';

interface ActiveSubscriptionSectionProps {
  fallbackSubscription?: Subscription | null;
}

export function ActiveSubscriptionSection({
  fallbackSubscription,
}: ActiveSubscriptionSectionProps) {
  const { data, isLoading, isError } = useMySubscription();

  const activeSub =
    data?.active ??
    (fallbackSubscription?.status === 'active'
      ? fallbackSubscription
      : null);

  const scheduled =
    data?.scheduled ??
    (fallbackSubscription?.status === 'scheduled'
      ? fallbackSubscription
      : null);

  const hasSubscription = Boolean(activeSub || scheduled) && !isError;

  const cardSub = activeSub ?? scheduled;

  if (isLoading) {
    return (
      <Card className="mobile-card overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <CreditCard className="h-5 w-5 mr-2" />
            Active Subscription
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mobile-card overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <CreditCard className="h-5 w-5 mr-2" />
          Active Subscription
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

{!hasSubscription || !cardSub ? (
  <p className="py-2 text-sm text-gray-600">
    No active subscription found
  </p>
) : (
  <>
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium">
          {cardSub.planName || 'Subscription Plan'}
        </p>
        <p className="text-sm text-gray-600">
          {cardSub.durationDays} Days Plan
        </p>
      </div>

      <Badge className="bg-blue-600 text-white">
        {cardSub.status}
      </Badge>
    </div>


    <div className="space-y-3 border-t pt-3">

      <div className="flex justify-between">
        <span className="text-sm text-gray-600">
          Amount
        </span>
        <span className="font-medium">
          ₹{cardSub.amount}
        </span>
      </div>


      <div className="flex justify-between">
        <span className="text-sm text-gray-600">
          Start Date
        </span>
        <span className="font-medium text-sm">
          {formatDate(cardSub.startDate)}
        </span>
      </div>


      <div className="flex justify-between">
        <span className="text-sm text-gray-600">
          Expiry Date
        </span>
        <span className="font-medium text-sm">
          {formatDate(cardSub.expiryDate)}
        </span>
      </div>


      {/* <div className="flex justify-between">
        <span className="text-sm text-gray-600">
          Payment
        </span>
        <Badge className="bg-blue-600 text-white">
          {cardSub.paymentStatus}
        </Badge>
      </div> */}


      {/* <div className="flex justify-between">
        <span className="text-sm text-gray-600">
          Gateway
        </span>
        <span className="font-medium capitalize">
          {cardSub.gateway}
        </span>
      </div> */}


      {/* <div className="flex justify-between">
        <span className="text-sm text-gray-600">
          Auto Renew
        </span>

        <Badge
          variant={cardSub.autoRenew ? "default" : "secondary"}
        >
          {cardSub.autoRenew ? "Enabled" : "Disabled"}
        </Badge>
      </div> */}


      {/* <div className="flex justify-between">
        <span className="text-sm text-gray-600">
          Trial Plan
        </span>

        <Badge
          variant={cardSub.isTrial ? "default" : "secondary"}
        >
          {cardSub.isTrial ? "Yes" : "No"}
        </Badge>
      </div> */}


      {/* <div className="flex justify-between">
        <span className="text-sm text-gray-600">
          Renewal Count
        </span>

        <span className="font-medium">
          {cardSub.renewalCount}
        </span>
      </div> */}


      {cardSub.transactionId && (
        <div className="flex justify-between gap-3">
          <span className="text-sm text-gray-600">
            Transaction ID
          </span>

          <span className="text-xs font-medium truncate max-w-[180px]">
            {cardSub.transactionId}
          </span>
        </div>
      )}

    </div>


    {scheduled && activeSub && (
      <div className="rounded-lg bg-amber-50 p-3">
        <p className="font-medium text-sm">
          Next Plan
        </p>
        <p className="text-sm text-gray-600">
          {scheduled.planName} starts on{' '}
          {formatDate(scheduled.startDate)}
        </p>
      </div>
    )}

  </>
)}


<Button
  asChild
  variant="outline"
  className="w-full h-10 normal-case"
>
  <Link href="/subscriptions">
    Manage Subscription
  </Link>
</Button>

</CardContent>
    </Card>
  );
}