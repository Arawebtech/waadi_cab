import type { Subscription, SubscriptionPlan, SubscriptionPurchaseIntent } from '@/types/subscription';

export function planIdOf(value: string | SubscriptionPlan | undefined | null): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value._id ?? null;
}

export function isSamePlan(active: Subscription | null | undefined, plan: SubscriptionPlan): boolean {
  if (!active) return false;
  return planIdOf(active.planId) === plan._id;
}

export function resolvePlanIntent(
  active: Subscription | null | undefined,
  plan: SubscriptionPlan
): SubscriptionPurchaseIntent {
  if (!active || active.status !== 'active') return 'purchase';
  return isSamePlan(active, plan) ? 'renew' : 'replace';
}
