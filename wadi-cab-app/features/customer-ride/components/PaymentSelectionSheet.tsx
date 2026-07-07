'use client';

import { useState } from 'react';
import { CreditCard, Loader2, Smartphone, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Wallet as WalletType } from '../types';

type PaymentMethod = 'cash' | 'upi' | 'wallet';

interface Props {
  fareTotal: number;
  wallet?: WalletType | null;
  loading?: boolean;
  onConfirm: (method: PaymentMethod) => void | Promise<void>;
}

export function PaymentSelectionSheet({ fareTotal, wallet, loading, onConfirm }: Props) {
  const [selected, setSelected] = useState<PaymentMethod>('cash');
  const walletOk = (wallet?.balance ?? 0) >= fareTotal;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-lg">
      <h3 className="text-lg font-bold text-slate-900">Pay for your ride</h3>
      <p className="mt-1 text-sm text-slate-500">Total fare · ₹{fareTotal}</p>
      <div className="mt-4 space-y-2">
        <PaymentOption icon={Smartphone} label="Cash" description="Pay driver directly" selected={selected === 'cash'} onClick={() => setSelected('cash')} badge="Default" />
        <PaymentOption icon={CreditCard} label="Online Payment" description="UPI / Card via PayU or Cashfree" selected={selected === 'upi'} onClick={() => setSelected('upi')} />
        <PaymentOption
          icon={Wallet}
          label="Wallet"
          description={wallet ? `Balance ₹${wallet.balance}${walletOk ? '' : ' · insufficient'}` : 'Loading wallet…'}
          selected={selected === 'wallet'}
          onClick={() => setSelected('wallet')}
          disabled={!walletOk}
        />
      </div>
      <button
        type="button"
        disabled={loading || (selected === 'wallet' && !walletOk)}
        onClick={() => onConfirm(selected)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-4 font-semibold text-white disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirm payment
      </button>
    </motion.div>
  );
}

function PaymentOption({
  icon: Icon,
  label,
  description,
  selected,
  onClick,
  badge,
  disabled,
}: {
  icon: typeof Smartphone;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${selected ? 'border-black bg-slate-50' : 'border-slate-200'} ${disabled ? 'opacity-40' : ''}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{label}</p>
          {badge && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{badge}</span>}
        </div>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <span className={`h-4 w-4 rounded-full border-2 ${selected ? 'border-black bg-black' : 'border-slate-300'}`} />
    </button>
  );
}
