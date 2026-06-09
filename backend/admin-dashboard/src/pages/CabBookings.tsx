import React, { useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import AdminAPI from '../services/api';
import { CabBooking } from '../types';
import { format } from 'date-fns';

const CabBookings: React.FC = () => {
  const [items, setItems] = useState<CabBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('unassigned');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ from_location: string; to_location: string; start_date: string; trip_type: 'one_way' | 'round_trip'; return_date?: string; notes?: string }>({
    from_location: '',
    to_location: '',
    start_date: new Date().toISOString().slice(0,10),
    trip_type: 'one_way',
    return_date: ''
  });
  const [leadsOpen, setLeadsOpen] = useState(false);
  const [leadDrivers, setLeadDrivers] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { cabBookings, pagination: pageInfo } = await AdminAPI.getCabBookings({ page: pagination.page, limit: pagination.limit, status, search });
      setItems(cabBookings as any);
      setPagination(pageInfo);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, status, pagination.page, pagination.limit]);

  const update = async (id: string, data: any) => {
    await AdminAPI.updateCabBooking(id, data);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cab Bookings</h2>
          <p className="text-sm text-gray-500">Manage unassigned/assigned cab booking requests</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setCreateOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Create Booking</button>
          <button onClick={load} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by from/to" className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            <option value="">All</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assign</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No cab bookings found</td></tr>
              ) : (
                items.map((b) => (
                  <tr key={b._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{b.from_location} → {b.to_location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(b.start_date), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.trip_type === 'one_way' ? 'One Way' : 'Round Trip'}{b.return_date ? ` · Return: ${format(new Date(b.return_date), 'dd MMM yyyy')}` : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <select value={b.status} onChange={(e) => update(b._id, { status: e.target.value })} className="rounded border-gray-300 text-sm">
                        <option value="unassigned">Unassigned</option>
                        <option value="assigned">Assigned</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => {
                          const drivers = ((b as any).interests || []).map((i: any) => ({
                            first_name: i.first_name,
                            last_name: i.last_name,
                            phone_number: i.phone_number,
                            createdAt: i.createdAt
                          }));
                          setLeadDrivers(drivers);
                          setLeadsOpen(true);
                        }}
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        title="View interested drivers"
                      >
                        {((b as any).interests || []).length} interested
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <input placeholder="Driver phone" defaultValue={b.assigned_driver_phone || ''} onBlur={(e) => update(b._id, { assigned_driver_phone: e.target.value })} className="rounded border-gray-300 text-sm px-2 py-1" />
                        <button onClick={() => update(b._id, { status: 'assigned' })} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">Assign</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Cab Booking</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input value={form.from_location} onChange={(e)=>setForm(p=>({ ...p, from_location: e.target.value }))} className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500" placeholder="Pickup city" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input value={form.to_location} onChange={(e)=>setForm(p=>({ ...p, to_location: e.target.value }))} className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500" placeholder="Drop city" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={form.start_date} onChange={(e)=>setForm(p=>({ ...p, start_date: e.target.value }))} className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
                <select value={form.trip_type} onChange={(e)=>setForm(p=>({ ...p, trip_type: e.target.value as any }))} className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <option value="one_way">One Way</option>
                  <option value="round_trip">Round Trip</option>
                </select>
              </div>
              {form.trip_type === 'round_trip' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                  <input type="date" value={form.return_date || ''} onChange={(e)=>setForm(p=>({ ...p, return_date: e.target.value }))} className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes || ''} onChange={(e)=>setForm(p=>({ ...p, notes: e.target.value }))} className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500" rows={3} placeholder="Any details" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={()=>setCreateOpen(false)} className="px-4 py-2 rounded-md text-sm bg-gray-100">Cancel</button>
              <button disabled={creating || !form.from_location || !form.to_location || !form.start_date} onClick={async ()=>{
                setCreating(true);
                try { await AdminAPI.createCabBooking(form as any); setCreateOpen(false); await load(); } finally { setCreating(false); }
              }} className="px-4 py-2 rounded-md text-sm bg-blue-600 text-white disabled:opacity-50">{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Modal */}
      {leadsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interested Drivers</h3>
            {leadDrivers.length === 0 ? (
              <div className="text-sm text-gray-600">No interests yet for this booking.</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-auto">
                {leadDrivers.map((driver, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">
                        {driver.first_name} {driver.last_name}
                      </div>
                      <a href={`tel:${driver.phone_number}`} className="text-blue-600 text-xs px-2 py-1 bg-blue-50 rounded">Call</a>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Phone: {driver.phone_number}</div>
                      <div>Interested: {new Date(driver.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={()=>setLeadsOpen(false)} className="px-4 py-2 rounded-md text-sm bg-gray-100">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CabBookings;


