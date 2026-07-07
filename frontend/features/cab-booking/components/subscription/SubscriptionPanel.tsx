'use client';

import { format } from 'date-fns';
import { Calendar, CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Subscription, SubscriptionPlan } from '@/types/subscription';

interface Props {
  subscription: Subscription | null | undefined;
  plans: SubscriptionPlan[] | undefined;
  loading?: boolean;
  onPurchase: () => void;
  purchasing?: boolean;
}

export function SubscriptionPanel({ subscription, plans, loading, onPurchase, purchasing }: Props) {
  const daysLeft = subscription?.expiryDate
    ? Math.max(0, Math.ceil((new Date(subscription.expiryDate).getTime() - Date.now()) / 86400000))
    : 0;
  const expiringSoon = daysLeft > 0 && daysLeft <= 7;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subscription ? (
        <Card className={`overflow-hidden border-0 shadow-lg ${expiringSoon ? 'ring-2 ring-amber-400' : ''}`}>
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
            <p className="text-sm opacity-80">Active Plan</p>
            <h2 className="text-2xl font-bold">{subscription.planName}</h2>
            <p className="mt-1 text-sm">₹{subscription.amount} · {subscription.durationDays} days</p>
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Expires {subscription.expiryDate ? format(new Date(subscription.expiryDate), 'dd MMM yyyy') : '—'}
            </div>
            <div className={`rounded-xl p-3 text-center ${expiringSoon ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className="text-3xl font-bold">{daysLeft}</p>
              <p className="text-xs uppercase tracking-wide">Days Remaining</p>
            </div>
            {expiringSoon && (
              <p className="text-sm text-amber-700 text-center">Renew now to avoid going offline</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">No active subscription</p>
            <p className="text-sm text-muted-foreground">Purchase a plan to go online</p>
          </CardContent>
        </Card>
      )}

      <h3 className="font-semibold flex items-center gap-2">
        <RefreshCw className="h-4 w-4" /> Available Plans
      </h3>
      <div className="space-y-3">
        {plans?.map((plan) => (
          <Card key={plan._id}>
            <CardContent className="p-4">
              <p className="font-semibold">{plan.name}</p>
              <p className="text-sm text-muted-foreground">₹{plan.amount} · {plan.durationDays} days</p>
              {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Button className="w-full" disabled={purchasing} onClick={onPurchase}>
        {subscription ? 'Renew or switch plan' : 'Choose a plan'}
      </Button>
    </div>
  );
}
