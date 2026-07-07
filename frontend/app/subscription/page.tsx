'use client';

import Link from 'next/link';
import { EmptyState, Spinner } from '@/components/ui/states';
import { MySubscriptionPanel } from '@/features/subscriptions/components/MySubscriptionPanel';
import { ScheduledSubscriptionBanner } from '@/features/subscriptions/components/ScheduledSubscriptionBanner';
import { SubscriptionPlansSection } from '@/features/subscriptions/components/SubscriptionPlansSection';
import { useMySubscription } from '@/features/subscriptions/hooks';

export default function SubscriptionPage() {
  const mySubQuery = useMySubscription();
  const active = mySubQuery.data?.active ?? null;
  const scheduled = mySubQuery.data?.scheduled ?? null;
  const hasNoSubscription = !mySubQuery.isLoading && !mySubQuery.isError && !active && !scheduled;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold text-[#101828]">Subscription</h1>
      <p className="mb-6 text-sm text-[#667085]">Manage your plan and see when it&apos;s time to renew.</p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-[#101828]">Current plan</h2>
        {mySubQuery.isLoading && <Spinner label="Loading your subscription…" />}
        {active && <MySubscriptionPanel subscription={active} />}
        {scheduled && (
          <div className={active ? 'mt-3' : undefined}>
            <ScheduledSubscriptionBanner subscription={scheduled} />
          </div>
        )}
        {hasNoSubscription && (
          <EmptyState title="No active subscription" description="Choose a plan below to get started." />
        )}
        {mySubQuery.isError && !active && !scheduled && (
          <EmptyState title="No active subscription" description="Choose a plan below to get started." />
        )}
        <Link
          href="/subscriptions/history"
          className="mt-3 inline-block text-sm font-medium text-[#0B5FFF] hover:underline"
        >
          View history →
        </Link>
      </section>

      <SubscriptionPlansSection
        title={active ? 'Renew or switch plan' : 'Available plans'}
        onSuccess={() => mySubQuery.refetch()}
      />
    </div>
  );
}
