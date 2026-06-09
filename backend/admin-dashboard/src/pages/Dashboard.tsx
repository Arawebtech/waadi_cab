import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import AdminAPI from '../services/api';
import { DashboardStats } from '../types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check online/offline status
    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
      // If coming back online, try to reload data
      if (navigator.onLine && error) {
        loadDashboardStats();
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Load initial data
    loadDashboardStats();

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const loadDashboardStats = async () => {
    if (!navigator.onLine) {
      setIsOffline(true);
      setError('No internet connection. Please check your network and try again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setRetryCount(prev => prev + 1);
      
      const data = await AdminAPI.getDashboardStats();
      setStats(data);
      setIsOffline(false);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      
      // Check if it's a network error
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setIsOffline(true);
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Failed to load dashboard statistics. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 px-3 md:px-6 py-4 md:py-6">
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium text-sm md:text-base">You're currently offline</span>
            </div>
            <p className="text-xs md:text-sm text-yellow-600 mt-1">
              Dashboard data cannot be loaded without internet connection.
            </p>
          </div>
        )}
        
        <div className="animate-pulse space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-3 md:p-6 rounded-lg shadow h-24 md:h-32"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
            <div className="bg-white p-3 md:p-6 rounded-lg shadow h-64 md:h-80"></div>
            <div className="bg-white p-3 md:p-6 rounded-lg shadow h-64 md:h-80"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 md:space-y-6 px-3 md:px-6 py-4 md:py-6">
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium text-sm md:text-base">No Internet Connection</span>
            </div>
            <p className="text-xs md:text-sm text-yellow-600 mt-1">
              Unable to load dashboard data. Please check your connection and try again.
            </p>
          </div>
        )}

        {/* Error Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800 text-sm md:text-base">{error}</span>
          </div>
          
          <div className="mt-3 md:mt-4 flex flex-col sm:flex-row gap-2 md:gap-3">
            <button
              onClick={loadDashboardStats}
              disabled={isOffline || retryCount > 3}
              className="w-full sm:w-auto bg-red-600 text-white px-3 md:px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {retryCount > 3 ? 'Too Many Attempts' : 'Retry'}
            </button>
            
            {isOffline && (
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto bg-blue-600 text-white px-3 md:px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </button>
            )}
          </div>
          
          {retryCount > 3 && (
            <p className="text-xs md:text-sm text-red-600 mt-2">
              Multiple retry attempts failed. Please check your connection or contact support.
            </p>
          )}
        </div>

        {/* Offline Instructions */}
        {isOffline && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
            <h3 className="text-base md:text-lg font-medium text-blue-900 mb-2">What you can do:</h3>
            <ul className="text-xs md:text-sm text-blue-800 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Try refreshing the page when back online</li>
              <li>• You can still navigate to other sections</li>
              <li>• Sign out is available even when offline</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (!stats) return null;

  // Prepare chart data
  const monthlyRevenueData = stats.monthlyRevenue.map(item => ({
    month: `${item._id.month}/${item._id.year}`,
    revenue: item.revenue,
    bookings: item.bookings
  }));

  const taxModeData = stats.taxModeStats.map(item => ({
    name: item._id,
    value: item.count,
    revenue: item.revenue
  }));

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: string;
    color: string;
  }> = ({ title, value, icon: Icon, trend, color }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-3 md:p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 md:h-6 md:w-6 ${color}`} />
          </div>
          <div className="ml-3 md:ml-5 w-0 flex-1 min-w-0">
            <dl>
              <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-sm md:text-lg font-medium text-gray-900 truncate">{value}</dd>
            </dl>
          </div>
        </div>
        {trend && (
          <div className="mt-2 md:mt-3">
            <div className="flex items-center text-xs md:text-sm">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500 mr-1" />
              <span className="text-green-600 truncate">{trend}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 px-3 md:px-6 py-4 md:py-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between space-y-3 md:space-y-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold leading-7 text-gray-900 sm:truncate">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to your admin dashboard. Here's what's happening with your platform.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <button
            onClick={loadDashboardStats}
            disabled={isOffline}
            className="w-full sm:w-auto bg-blue-600 text-white px-3 md:px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          {isOffline && (
            <div className="flex items-center justify-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <WifiOff className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 font-medium">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Total Users"
          value={stats.summary.totalUsers.toLocaleString()}
          icon={Users}
          trend={`+${stats.summary.recentBookings} this month`}
          color="text-blue-600"
        />
        <StatCard
          title="Total Bookings"
          value={stats.summary.totalBookings.toLocaleString()}
          icon={Calendar}
          trend={`${stats.summary.weeklyBookings} this week`}
          color="text-green-600"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${stats.summary.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={`Avg: ₹${Math.round(stats.summary.averageBookingValue)}`}
          color="text-yellow-600"
        />
        <StatCard
          title="Active States"
          value={stats.summary.totalStates}
          icon={MapPin}
          color="text-purple-600"
        />
      </div>

      {/* Booking Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <StatCard
          title="Paid Bookings"
          value={stats.bookingStats.paid.toLocaleString()}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatCard
          title="Pending Bookings"
          value={stats.bookingStats.pending.toLocaleString()}
          icon={Clock}
          color="text-yellow-600"
        />
        <StatCard
          title="Cancelled Bookings"
          value={stats.bookingStats.cancelled.toLocaleString()}
          icon={XCircle}
          color="text-red-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-3 md:p-6 rounded-lg shadow overflow-hidden">
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Monthly Revenue Trend</h3>
          <div className="w-full h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value, name) => [
                  name === 'revenue' ? `₹${value}` : value,
                  name === 'revenue' ? 'Revenue' : 'Bookings'
                ]} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tax Mode Distribution */}
        <div className="bg-white p-3 md:p-6 rounded-lg shadow overflow-hidden">
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Tax Mode Distribution</h3>
          <div className="w-full h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taxModeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taxModeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top States Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-medium text-gray-900">Top Performing States</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topStates.map((state, index) => (
                <tr key={state._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                    {state.stateName}
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                    {state.bookings.toLocaleString()}
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                    ₹{state.revenue.toLocaleString()}
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                    ₹{state.bookings > 0 ? Math.round(state.revenue / state.bookings) : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 