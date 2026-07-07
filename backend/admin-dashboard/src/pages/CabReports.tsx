import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import AdminAPI from '../services/api';
import { formatCurrency } from '../components/cab/StatCard';

const CabReports: React.FC = () => {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await AdminAPI.getCabReports(period);
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period]);

  const rideChartData = (data?.rideTrend || []).map((d: any) => ({ date: d._id, revenue: d.revenue, rides: d.rides }));
  const subChartData = (data?.subscriptionTrend || []).map((d: any) => ({ date: d._id, revenue: d.revenue, count: d.count }));
  const statusData = (data?.rideStatusBreakdown || []).map((d: any) => ({ status: d._id, count: d.count }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cab Reports & Analytics</h2>
          <p className="text-sm text-gray-500">Revenue, ride, subscription, and driver performance reports</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="rounded-md border-gray-300 shadow-sm">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last year</option>
          </select>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {loading ? <div className="text-center py-12">Loading reports...</div> : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Ride Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={rideChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} />
                  <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Subscription Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={subChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Ride Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Top Drivers</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(data?.topDrivers || []).length === 0 ? <p className="text-sm text-gray-500">No data yet</p>
                  : data.topDrivers.map((d: any, i: number) => (
                    <div key={d._id || i} className="flex justify-between border-b py-2 text-sm">
                      <span>{d.driver ? `${d.driver.firstName} ${d.driver.lastName}` : 'Unknown'}</span>
                      <span className="text-gray-500">{d.rides} rides · {formatCurrency(d.revenue)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CabReports;
