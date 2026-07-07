'use client';

import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { WalletTransaction } from '@/types/cab-booking';

interface Props {
  balance: number;
  currency?: string;
  transactions?: WalletTransaction[];
  loading?: boolean;
}

export function WalletPanel({ balance, currency = 'INR', transactions = [], loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="flex items-center gap-2 text-sm opacity-80">
          <Wallet className="h-4 w-4" /> Wallet Balance
        </div>
        <p className="text-4xl font-bold mt-2">₹{balance.toFixed(2)}</p>
        <p className="text-xs opacity-70 mt-1">{currency}</p>
      </div>

      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Recent Transactions</h3>
      {transactions.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No transactions yet</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div key={tx._id} className="flex items-center gap-3 rounded-xl border p-3">
              <div className={`rounded-full p-2 ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {tx.type === 'credit' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{tx.remark || tx.purpose || tx.type}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), 'dd MMM yyyy HH:mm')}</p>
              </div>
              <p className={`font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
