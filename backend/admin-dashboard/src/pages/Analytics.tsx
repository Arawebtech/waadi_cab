import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  MapPin,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import AdminAPI from '../services/api';
import { Analytics as AnalyticsType } from '../types';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.getAnalytics(period);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  // Format data for charts
  const dailyTrendData = analytics.dailyTrend.map(item => ({
    date: format(new Date(item._id.date), 'MMM dd'),
    bookings: item.bookings,
    revenue: item.revenue
  }));

  const rushHourData = analytics.rushHourStats.map(item => ({
    hour: item.hourLabel,
    bookings: item.bookings,
    revenue: item.revenue
  }));

  // Prepare day-wise hour data for heatmap/grouped chart
  // Calculate average bookings per hour to determine busy vs normal
  const allBookings = analytics.dayWiseHourStats.flatMap(day => day.hours.map(h => h.bookings));
  const avgBookings = allBookings.reduce((sum, b) => sum + b, 0) / (allBookings.length || 1);
  const maxBookings = Math.max(...allBookings, 1);

  // Format for grouped bar chart - each day has 24 hours
  const dayWiseHourChartData = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourData: any = {
      hour: `${hour.toString().padStart(2, '0')}:00`
    };
    analytics.dayWiseHourStats.forEach(day => {
      hourData[day.dayName] = day.hours[hour].bookings;
    });
    dayWiseHourChartData.push(hourData);
  }

  const stateWiseData = analytics.stateWiseStats.slice(0, 10).map(item => ({
    name: item.stateName,
    bookings: item.bookings,
    revenue: item.revenue,
    paid: item.paidBookings,
    pending: item.pendingBookings,
    cancelled: item.cancelledBookings
  }));

  const topStatesByRevenueData = analytics.topStatesByRevenue.map(item => ({
    name: item.stateName,
    revenue: item.revenue,
    bookings: item.bookings
  }));

  const vehicleTypeData = analytics.vehicleTypeStats.map(item => ({
    name: item._id || 'Unknown',
    value: item.count,
    revenue: item.revenue
  }));

  const taxModeData = analytics.taxModeStats.map(item => ({
    name: item._id,
    value: item.count,
    revenue: item.revenue
  }));

  const revenueTrendData = analytics.revenueTrend.map(item => ({
    date: format(new Date(item._id.date), 'MMM dd'),
    revenue: item.revenue,
    bookings: item.bookings,
    average: item.averageAmount
  }));

  const completionTimeByDayData = analytics.bookingCompletionTime.completionTimeByDay.map(item => ({
    day: item.dayName,
    hours: item.averageHours,
    bookings: item.bookings
  }));

  const conversionData = [
    { name: 'Paid', value: analytics.conversionRate.paidBookings, color: '#10b981' },
    { name: 'Pending', value: analytics.conversionRate.pendingBookings, color: '#f59e0b' },
    { name: 'Cancelled', value: analytics.conversionRate.cancelledBookings, color: '#ef4444' }
  ];

  const processingData = [
    { name: 'Processed', value: analytics.processingStats.processed, color: '#10b981' },
    { name: 'Unprocessed', value: analytics.processingStats.unprocessed, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Advanced Analytics
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive business intelligence and performance metrics
          </p>
        </div>
        <div className="mt-4 flex items-center space-x-3 md:mt-0 md:ml-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
              <p className="text-2xl font-bold text-gray-900">
                ₹{analytics.revenueTrend.reduce((sum, item) => sum + item.revenue, 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.conversionRate.conversionPercentage}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Avg Completion Time</h3>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.bookingCompletionTime.averageHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.conversionRate.totalBookings.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rush Hour Analytics */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Clock className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Rush Hour Analytics</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">Bookings and revenue by hour of day</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rushHourData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="bookings" fill="#3b82f6" name="Bookings" />
            <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (₹)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Day-wise Hour Analytics - Heatmap Style */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Calendar className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Day-wise Hour Analysis</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Bookings by day of week and hour - Identify busy vs normal hours for each day
        </p>
        
        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">
                    Day / Hour
                  </th>
                  {Array.from({ length: 24 }, (_, i) => (
                    <th
                      key={i}
                      className="border border-gray-300 px-1 py-2 text-xs font-medium text-gray-700 bg-gray-50 text-center"
                    >
                      {i.toString().padStart(2, '0')}:00
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.dayWiseHourStats.map((day) => (
                  <tr key={day.day}>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50 sticky left-0 z-10">
                      {day.dayName}
                    </td>
                    {day.hours.map((hour) => {
                      const intensity = hour.bookings / maxBookings;
                      const isBusy = hour.bookings > avgBookings * 1.5;
                      const isNormal = hour.bookings > avgBookings * 0.5 && hour.bookings <= avgBookings * 1.5;
                      const isLow = hour.bookings <= avgBookings * 0.5;
                      
                      let bgColor = 'bg-gray-100';
                      if (isBusy) bgColor = 'bg-red-500';
                      else if (isNormal) bgColor = 'bg-yellow-400';
                      else if (hour.bookings > 0) bgColor = 'bg-green-300';
                      
                      return (
                        <td
                          key={hour.hour}
                          className={`border border-gray-300 px-1 py-1 text-center text-xs ${bgColor} ${
                            hour.bookings > 0 ? 'font-semibold' : ''
                          }`}
                          style={{
                            backgroundColor: hour.bookings > 0 
                              ? `rgba(59, 130, 246, ${Math.min(intensity, 1)})`
                              : '#f3f4f6'
                          }}
                          title={`${day.dayName} ${hour.hourLabel}: ${hour.bookings} bookings, ₹${hour.revenue.toLocaleString('en-IN')}`}
                        >
                          {hour.bookings > 0 ? hour.bookings : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 border border-gray-300 mr-2"></div>
            <span>Busy ({'>'} {Math.round(avgBookings * 1.5)} bookings)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-400 border border-gray-300 mr-2"></div>
            <span>Normal ({Math.round(avgBookings * 0.5)} - {Math.round(avgBookings * 1.5)} bookings)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-300 border border-gray-300 mr-2"></div>
            <span>Low ({'<'} {Math.round(avgBookings * 0.5)} bookings)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 mr-2"></div>
            <span>No bookings</span>
          </div>
        </div>
      </div>

      {/* Day-wise Hour Analytics - Grouped Bar Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <BarChart3 className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Day-wise Hour Comparison</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">Compare booking patterns across days for each hour</p>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={dayWiseHourChartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hour" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              interval={0}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Sunday" fill="#ef4444" name="Sunday" />
            <Bar dataKey="Monday" fill="#3b82f6" name="Monday" />
            <Bar dataKey="Tuesday" fill="#10b981" name="Tuesday" />
            <Bar dataKey="Wednesday" fill="#f59e0b" name="Wednesday" />
            <Bar dataKey="Thursday" fill="#8b5cf6" name="Thursday" />
            <Bar dataKey="Friday" fill="#ec4899" name="Friday" />
            <Bar dataKey="Saturday" fill="#06b6d4" name="Saturday" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Daily Bookings Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="bookings" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={2} name="Avg Amount" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* State-wise Analytics */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">State-wise Booking Analytics</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">Top 10 states by bookings</p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={stateWiseData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="bookings" fill="#3b82f6" name="Total Bookings" />
            <Bar dataKey="paid" fill="#10b981" name="Paid" />
            <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
            <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top States by Revenue */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <DollarSign className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Top States by Revenue</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topStatesByRevenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#10b981" name="Revenue (₹)" />
            <Bar dataKey="bookings" fill="#3b82f6" name="Bookings" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Booking Completion Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Clock className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Completion Time by Day</h3>
          </div>
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Average:</span>
              <span className="font-semibold">{analytics.bookingCompletionTime.averageHours.toFixed(2)} hours</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Min:</span>
              <span className="font-semibold">{analytics.bookingCompletionTime.minHours.toFixed(2)} hours</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Max:</span>
              <span className="font-semibold">{analytics.bookingCompletionTime.maxHours.toFixed(2)} hours</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Processed:</span>
              <span className="font-semibold">{analytics.bookingCompletionTime.totalProcessed}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={completionTimeByDayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" fill="#8b5cf6" name="Avg Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Conversion Rate</h3>
          </div>
          <div className="mb-4">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {analytics.conversionRate.conversionPercentage}%
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <div>Total: {analytics.conversionRate.totalBookings}</div>
              <div>Paid: {analytics.conversionRate.paidBookings}</div>
              <div>Pending: {analytics.conversionRate.pendingBookings}</div>
              <div>Cancelled: {analytics.conversionRate.cancelledBookings}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={conversionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {conversionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vehicle Type & Tax Mode Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Vehicle Type Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vehicleTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {vehicleTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Tax Mode Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taxModeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10b981" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Processing Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Activity className="h-5 w-5 text-orange-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Processing Statistics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={processingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {processingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600">Processed Bookings</div>
              <div className="text-2xl font-bold text-green-600">
                {analytics.processingStats.processed.toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Revenue: ₹{analytics.processingStats.processedRevenue.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-gray-600">Unprocessed Bookings</div>
              <div className="text-2xl font-bold text-orange-600">
                {analytics.processingStats.unprocessed.toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Revenue: ₹{analytics.processingStats.unprocessedRevenue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
