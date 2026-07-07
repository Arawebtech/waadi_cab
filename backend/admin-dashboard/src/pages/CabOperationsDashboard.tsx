import React, { useEffect, useState } from 'react';
import {
  Users, Car, DollarSign, CreditCard, ShieldCheck, Wifi, MapPin,
  CheckCircle, XCircle, Wallet, TrendingUp, RefreshCw, AlertCircle
} from 'lucide-react';
import AdminAPI from '../services/api';
import { CabDashboardStats } from '../types';
import StatCard, { formatCurrency, formatNumber } from '../components/cab/StatCard';

const CabOperationsDashboard: React.FC = () => {
  const [stats, setStats] = useState<CabDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminAPI.getCabDashboardStats();
      setStats(data);
    } catch {
      setError('Failed to load cab dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">{error}</p>
        <button onClick={load} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cab Operations Dashboard</h2>
          <p className="text-sm text-gray-500">Real-time cab booking platform metrics</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={formatNumber(stats.totalCustomers)} icon={Users} color="blue" />
        <StatCard title="Total Drivers" value={formatNumber(stats.totalDrivers)} icon={Car} color="indigo" />
        <StatCard title="Total Cab Rides" value={formatNumber(stats.totalCabRides)} icon={MapPin} color="purple" />
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} color="green" />
        <StatCard title="Subscription Revenue" value={formatCurrency(stats.totalSubscriptionRevenue)} icon={CreditCard} color="green" />
        <StatCard title="Active Subscriptions" value={formatNumber(stats.activeSubscriptions)} icon={CheckCircle} color="blue" />
        <StatCard title="Expired Subscriptions" value={formatNumber(stats.expiredSubscriptions)} icon={XCircle} color="amber" />
        <StatCard title="Pending Verifications" value={formatNumber(stats.pendingVerifications)} icon={ShieldCheck} color="red" subtitle={`${stats.pendingProfileVerifications} profiles · ${stats.pendingDriverDocuments} docs · ${stats.pendingVehicles} vehicles`} />
        <StatCard title="Online Drivers" value={formatNumber(stats.onlineDrivers)} icon={Wifi} color="green" />
        <StatCard title="Active Trips" value={formatNumber(stats.activeTrips)} icon={Car} color="indigo" />
        <StatCard title="Completed Trips" value={formatNumber(stats.completedTrips)} icon={CheckCircle} color="green" />
        <StatCard title="Cancelled Trips" value={formatNumber(stats.cancelledTrips)} icon={XCircle} color="red" />
        <StatCard title="Wallet Balance" value={formatCurrency(stats.walletBalance)} icon={Wallet} color="purple" />
        <StatCard title="Wallet Transactions" value={formatNumber(stats.totalWalletTransactions)} icon={Wallet} color="blue" />
        <StatCard title="Daily Revenue" value={formatCurrency(stats.dailyRevenue)} icon={TrendingUp} color="green" />
        <StatCard title="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} icon={TrendingUp} color="green" />
        <StatCard title="Yearly Revenue" value={formatCurrency(stats.yearlyRevenue)} icon={TrendingUp} color="green" />
      </div>
    </div>
  );
};

export default CabOperationsDashboard;
