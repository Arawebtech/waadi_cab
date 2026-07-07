'use client';

import Link from 'next/link';
import { MobileLayout } from '@/components/mobile-layout';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { extractErrorMessage } from '@/lib/client';
import { HistoryList } from '@/features/subscriptions/components/HistoryList';
import { MySubscriptionPanel } from '@/features/subscriptions/components/MySubscriptionPanel';
import { ScheduledSubscriptionBanner } from '@/features/subscriptions/components/ScheduledSubscriptionBanner';
import { SubscriptionPlansSection } from '@/features/subscriptions/components/SubscriptionPlansSection';
import { useMySubscription, useSubscriptionHistory } from '@/features/subscriptions/hooks';

export default function SubscriptionsPage() {
  const mySubQuery = useMySubscription();
  const historyQuery = useSubscriptionHistory({ limit: 50 });

  const active = mySubQuery.data?.active ?? null;
  const scheduled = mySubQuery.data?.scheduled ?? null;
  const hasNoSubscription = !mySubQuery.isLoading && !mySubQuery.isError && !active && !scheduled;

  return (
    <MobileLayout title="Subscriptions" showBackButton backHref="/profile">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 pb-28">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Manage subscription</h1>
          <p className="mt-1 text-sm text-slate-500">View your current plan, history, and available options.</p>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Current plan</h2>
          {mySubQuery.isLoading && <Spinner label="Loading your subscription…" />}
          {mySubQuery.isError && (
            <EmptyState title="No active subscription" description="Choose a plan below to get started." />
          )}
          {active && <MySubscriptionPanel subscription={active} />}
          {scheduled && (
            <div className={active ? 'mt-3' : undefined}>
              <ScheduledSubscriptionBanner subscription={scheduled} />
            </div>
          )}
          {hasNoSubscription && (
            <EmptyState title="No active subscription" description="Choose a plan below to get started." />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">All subscriptions</h2>
          {historyQuery.isLoading && <Spinner label="Loading subscription history…" />}
          {historyQuery.isError && (
            <ErrorState
              message={extractErrorMessage(historyQuery.error, 'Could not load subscription history')}
              onRetry={historyQuery.refetch}
            />
          )}
          {historyQuery.data && historyQuery.data.history.length === 0 && (
            <EmptyState title="No subscription history" description="Purchases and renewals will appear here." />
          )}
          {historyQuery.data && historyQuery.data.history.length > 0 && (
            <HistoryList entries={historyQuery.data.history} />
          )}
        </section>

        <SubscriptionPlansSection
          title={active ? 'Renew or switch plan' : 'Available plans'}
          onSuccess={() => {
            mySubQuery.refetch();
            historyQuery.refetch();
          }}
        />

        <Link
          href="/subscriptions/history"
          className="inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          View detailed history →
        </Link>
      </div>
    </MobileLayout>
  );
}
