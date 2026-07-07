import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import AdminAPI from '../services/api';
import { CabWallet, CabWalletTransaction } from '../types';
import { formatCurrency } from '../components/cab/StatCard';
import { format } from 'date-fns';

const CabWallets: React.FC = () => {
  const [tab, setTab] = useState<'wallets' | 'transactions'>('wallets');
  const [wallets, setWallets] = useState<CabWallet[]>([]);
  const [transactions, setTransactions] = useState<CabWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerType, setOwnerType] = useState('');
  const [txType, setTxType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'wallets') {
        const { wallets: items } = await AdminAPI.getCabWallets({ ownerType, limit: 50 });
        setWallets(items);
      } else {
        const { transactions: items } = await AdminAPI.getCabWalletTransactions({ ownerType, type: txType, limit: 50 });
        setTransactions(items);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, ownerType, txType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Wallet Management</h2>
          <p className="text-sm text-gray-500">Driver & customer wallets, credits, debits, and refunds</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('wallets')} className={`px-4 py-2 text-sm font-medium ${tab === 'wallets' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Wallets</button>
        <button onClick={() => setTab('transactions')} className={`px-4 py-2 text-sm font-medium ${tab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Transactions</button>
      </div>

      <div className="flex gap-4">
        <select value={ownerType} onChange={e => setOwnerType(e.target.value)} className="rounded-md border-gray-300 shadow-sm">
          <option value="">All owner types</option>
          <option value="Driver">Driver</option>
          <option value="Customer">Customer</option>
        </select>
        {tab === 'transactions' && (
          <select value={txType} onChange={e => setTxType(e.target.value)} className="rounded-md border-gray-300 shadow-sm">
            <option value="">All types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
        )}
      </div>

      {tab === 'wallets' ? (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? <tr><td colSpan={5} className="px-6 py-8 text-center">Loading...</td></tr>
                : wallets.map(w => (
                  <tr key={w._id}>
                    <td className="px-4 py-3 text-sm">{w.ownerType}</td>
                    <td className="px-4 py-3 text-sm font-mono text-xs">{w.ownerId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(w.balance)}</td>
                    <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs ${w.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{w.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-sm">{format(new Date(w.updatedAt), 'dd MMM yyyy')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance After</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map(tx => (
                <tr key={tx._id}>
                  <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs ${tx.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{tx.type}</span></td>
                  <td className="px-4 py-3 text-sm">{tx.purpose}</td>
                  <td className="px-4 py-3 text-sm">{tx.ownerType}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(tx.amount)}</td>
                  <td className="px-4 py-3 text-sm">{tx.balanceAfter != null ? formatCurrency(tx.balanceAfter) : '—'}</td>
                  <td className="px-4 py-3 text-sm">{format(new Date(tx.createdAt), 'dd MMM yyyy HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CabWallets;
