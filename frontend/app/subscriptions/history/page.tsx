'use client';

import Link from 'next/link';
import { useSubscriptionHistory } from '@/features/subscriptions/hooks';
import { HistoryList } from '@/features/subscriptions/components/HistoryList';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { extractErrorMessage } from '@/lib/client';

export default function SubscriptionHistoryPage() {
  const { data, isLoading, isError, error, refetch } = useSubscriptionHistory();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/subscriptions" className="text-sm text-[#667085] hover:underline">
        ← Back
      </Link>
      <h1 className="mb-6 mt-2 text-lg font-semibold text-[#101828]">Subscription history</h1>

      {isLoading && <Spinner label="Loading history…" />}
      {isError && (
        <ErrorState message={extractErrorMessage(error, 'Could not load history')} onRetry={refetch} />
      )}
      {data && data.history.length === 0 && (
        <EmptyState title="No history yet" description="Purchases and renewals will show up here." />
      )}
      {data && data.history.length > 0 && <HistoryList entries={data.history} />}
    </div>
  );
}
