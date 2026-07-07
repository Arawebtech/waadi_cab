import React, { useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import AdminAPI from '../services/api';
import { CabCustomer } from '../types';
import { format } from 'date-fns';

const CabCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<CabCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { customers: items } = await AdminAPI.getCabCustomers({ search, limit: 50 });
      setCustomers(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  const viewDetails = async (id: string) => {
    const details = await AdminAPI.getCabCustomerDetails(id);
    setSelected(details);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cab Customers</h2>
          <p className="text-sm text-gray-500">Customer accounts, ride history, and wallet</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone" className="pl-10 w-full rounded-md border-gray-300 shadow-sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? <tr><td colSpan={4} className="px-6 py-8 text-center">Loading...</td></tr>
                : customers.map(c => (
                  <tr key={c._id}>
                    <td className="px-4 py-3 text-sm">{c.fullName || '—'}</td>
                    <td className="px-4 py-3 text-sm">{c.email}</td>
                    <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs ${c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{c.status}</span></td>
                    <td className="px-4 py-3 text-sm"><button onClick={() => viewDetails(c._id)} className="text-blue-600 hover:underline text-xs">View</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="bg-white shadow rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Customer Details</h3>
            <p className="text-sm"><strong>Name:</strong> {selected.customer.fullName}</p>
            <p className="text-sm"><strong>Email:</strong> {selected.customer.email}</p>
            <p className="text-sm"><strong>Phone:</strong> {selected.customer.phone || '—'}</p>
            <p className="text-sm"><strong>Wallet Balance:</strong> ₹{selected.wallet?.balance || 0}</p>
            <div>
              <h4 className="text-sm font-medium mb-2">Recent Rides ({selected.rides?.length || 0})</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {(selected.rides || []).slice(0, 10).map((r: any) => (
                  <div key={r._id} className="text-xs border-b py-1">{r.rideNumber} · {r.status} · {format(new Date(r.createdAt), 'dd MMM')}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CabCustomers;
