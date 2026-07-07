import { formatCurrency, formatDate } from '@/lib/format';
import type { SubscriptionHistoryEntry } from '@/types/subscription';
// import { formatCurrency, formatDate } from '../../../lib/format';

const ACTION_LABELS: Record<SubscriptionHistoryEntry['action'], string> = {
  purchase: 'Purchased',
  renew: 'Renewed',
  expire: 'Expired',
  cancel: 'Cancelled',
  refund: 'Refunded',
  payment_failed: 'Payment failed',
  suspend: 'Suspended',
  reactivate: 'Reactivated',
  admin_update: 'Updated by admin',
};

export function HistoryList({ entries }: { entries: SubscriptionHistoryEntry[] }) {
  return (
    <ul className="divide-y divide-[#E4E7EC] rounded-xl border border-[#E4E7EC]">
      {entries.map((entry) => (
        <li key={entry._id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#101828]">
              {ACTION_LABELS[entry.action]} · {entry.planName}
            </p>
            <p className="mt-0.5 text-xs text-[#667085]">{formatDate(entry.createdAt)}</p>
            {entry.remarks && <p className="mt-0.5 text-xs text-[#667085]">{entry.remarks}</p>}
          </div>
          <p className="whitespace-nowrap text-sm font-medium text-[#101828]">
            {formatCurrency(entry.amount, entry.currency)}
          </p>
        </li>
      ))}
    </ul>
  );
}
