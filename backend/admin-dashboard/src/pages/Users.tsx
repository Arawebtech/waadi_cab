import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  Lock,
  Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import AdminAPI from '../services/api';
import { User, UserFilters } from '../types';

function exportFetchErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    const serverMsg =
      data &&
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : '';
    if (serverMsg) return serverMsg;
    if (err.code === 'ECONNABORTED') {
      return 'Request timed out. The server may be busy — wait a minute and try again, or ask ops to increase API limits.';
    }
    if (err.response?.status) {
      return `Server error ${err.response.status}${err.response.statusText ? ` (${err.response.statusText})` : ''}`;
    }
    return err.message || 'Network request failed';
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });

  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20,
    search: '',
    sort_by: 'createdAt',
    sort_order: 'desc',
    date_from: '',
    date_to: '',
    min_bookings: undefined
  });

  // Export modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await AdminAPI.getAllUsers(filters);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);


  const handleFilterChange = (key: keyof UserFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? Number(value) : 1 // Ensure page is always a number
    }));
  };

  const exportUsers = () => {
    setShowPasswordModal(true);
    setPassword('');
    setPasswordError('');
  };

  const handlePasswordSubmit = async () => {
    if (password !== 'excel9911') {
      setPasswordError('Incorrect password. Please try again.');
      return;
    }

    setPasswordError('');
    setIsExporting(true);
    setShowPasswordModal(false);
    setExportProgress({ current: 0, total: 0 });

    try {
      // Fetch all users from all pages
      const { users: allUsers, failedPages } = await fetchAllUsers();
      
      if (allUsers.length === 0) {
        alert('No users found to export.');
        setIsExporting(false);
        return;
      }
      
      // Generate Excel data with all users
      setExportProgress({ current: allUsers.length, total: allUsers.length });
      const excelData = generateExcelData(allUsers);
      downloadExcel(excelData);
      
      // Show success message with warnings if pages were skipped
      setTimeout(() => {
        if (failedPages.length > 0) {
          const message = `Exported ${allUsers.length} users successfully.\n\n` +
            `Warning: ${failedPages.length} page(s) failed to load and were skipped:\n` +
            `Pages: ${failedPages.slice(0, 10).join(', ')}${failedPages.length > 10 ? '...' : ''}\n\n` +
            `The export may be incomplete. Please try again or contact support if the issue persists.`;
          alert(message);
        } else {
          alert(`Successfully exported ${allUsers.length} users!`);
        }
      }, 500);
    } catch (error: any) {
      console.error('Export error:', error);
      const errorMessage = error?.message || 'Failed to export data. Please try again.';
      alert(`Export failed: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const sortValueForCursor = (user: User, sortKey: string): string => {
    const raw = (user as unknown as Record<string, unknown>)[sortKey];
    if (raw === undefined || raw === null) {
      const fallback = user.createdAt;
      const d = fallback ? new Date(fallback as string) : null;
      return d && !isNaN(d.getTime()) ? d.toISOString() : '';
    }
    if (sortKey === 'createdAt' || sortKey === 'updatedAt' || sortKey.endsWith('At')) {
      const d = raw instanceof Date ? raw : new Date(String(raw));
      return !isNaN(d.getTime()) ? d.toISOString() : '';
    }
    return String(raw);
  };

  const fetchAllUsers = async (): Promise<{ users: User[]; failedPages: number[] }> => {
    const allUsers: User[] = [];
    const failedPages: number[] = [];
    const maxRetries = 3;
    const skipDelay = 200;
    const exportPageSize = 500;
    const exportFilters: UserFilters = {
      ...filters,
      search: filters.search || '',
      sort_by: filters.sort_by || 'createdAt',
      sort_order: filters.sort_order || 'desc',
      date_from: filters.date_from || '',
      date_to: filters.date_to || '',
      min_bookings: filters.min_bookings
    };
    const sortKey = exportFilters.sort_by || 'createdAt';
    const useOffsetExport =
      (exportFilters.min_bookings != null && exportFilters.min_bookings > 0) ||
      ['bookingCount', 'totalSpent'].includes(exportFilters.sort_by || '');

    const fetchBatchWithRetries = async (batchFilters: UserFilters): Promise<Awaited<ReturnType<typeof AdminAPI.getAllUsers>>> => {
      let lastError: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await AdminAPI.getAllUsers(batchFilters, 180000);
        } catch (err) {
          lastError = err;
          if (attempt < maxRetries) {
            const delayMs = 1000 * (attempt + 1);
            console.log(`Retrying user export batch (attempt ${attempt + 1}/${maxRetries}) after ${delayMs}ms...`);
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
      }
      throw lastError;
    };

    let after: { id: string; sortValue: string } | null = null;
    let totalExpected = 0;

    try {
      if (useOffsetExport) {
        let page = 1;
        let totalPages = 1;
        const firstResponse = await fetchBatchWithRetries({
          ...exportFilters,
          page: 1,
          limit: exportPageSize
        });
        totalExpected = firstResponse.pagination.total;
        totalPages = firstResponse.pagination.pages;
        allUsers.push(...firstResponse.users);
        setExportProgress({ current: allUsers.length, total: totalExpected });
        page = 2;
        while (page <= totalPages) {
          const response = await fetchBatchWithRetries({
            ...exportFilters,
            page,
            limit: exportPageSize
          });
          allUsers.push(...response.users);
          setExportProgress({ current: allUsers.length, total: totalExpected });
          await new Promise((r) => setTimeout(r, skipDelay));
          page++;
        }
      } else {
        while (true) {
          const batchFilters: UserFilters = {
            ...exportFilters,
            limit: exportPageSize,
            page: 1
          };
          if (after) {
            batchFilters.after_id = after.id;
            batchFilters.after_sort_value = after.sortValue;
            delete batchFilters.page;
          }

          const response = await fetchBatchWithRetries(batchFilters);
          if (totalExpected === 0) {
            totalExpected = response.pagination.total;
          }
          allUsers.push(...response.users);
          setExportProgress({ current: allUsers.length, total: totalExpected });

          if (response.users.length < exportPageSize) {
            break;
          }

          const last = response.users[response.users.length - 1];
          after = {
            id: last._id,
            sortValue: sortValueForCursor(last, sortKey)
          };

          if (!after.sortValue) {
            throw new Error('Could not continue export (missing sort position on last row). Try again or change sort to "Join date".');
          }

          await new Promise((r) => setTimeout(r, skipDelay));
        }
      }
    } catch (error) {
      console.error('Error fetching users for export:', error);
      throw new Error(exportFetchErrorMessage(error));
    }

    return { users: allUsers, failedPages };
  };

  const generateExcelData = (usersData: User[]) => {
    const headers = [
      'User ID',
      'First Name',
      'Last Name',
      'Phone Number',
      'Email',
      'Status',
      'Booking Count',
      'Total Spent (₹)',
      'App Version',
      'Platform',
      'FCM Token',
      'Join Date'
    ];

    const rows = usersData.map(user => {
      // Safely format date
      let joinDate = 'N/A';
      try {
        if (user.createdAt) {
          const date = new Date(user.createdAt);
          if (!isNaN(date.getTime())) {
            joinDate = format(date, 'MMM dd, yyyy');
          }
        }
      } catch (error) {
        console.warn('Error formatting date for user:', user._id, error);
      }

      return [
      user._id || 'N/A',
      user.firstName || '',
      user.lastName || '',
      user.phoneNumber || 'N/A',
      user.email || 'N/A',
      user.isVerified === true ? 'Verified' : 'Unverified',
      user.bookingCount || 0,
      user.totalSpent || 0,
        user.appVersion || 'Unknown',
        user.platform || 'Unknown',
      user.fcmToken || 'No token',
        joinDate
      ];
    });

    return [headers, ...rows];
  };

  const downloadExcel = (data: any[][]) => {
    try {
      // Helper function to escape CSV cell content
      const escapeCsvCell = (cell: any): string => {
        if (cell === null || cell === undefined) {
          return '';
        }
        
        const cellStr = String(cell);
        
        // Replace newlines and carriage returns with spaces
        const cleaned = cellStr.replace(/[\r\n]+/g, ' ').trim();
        
        // Escape quotes by doubling them and wrap in quotes
        return `"${cleaned.replace(/"/g, '""')}"`;
      };

      // Create CSV content with proper escaping
    const csvContent = data.map(row => 
        row.map(escapeCsvCell).join(',')
    ).join('\n');

      // Add BOM for UTF-8 encoding (helps Excel recognize UTF-8)
    const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
      // Create blob with proper MIME type
      const blob = new Blob([csvWithBOM], { 
        type: 'text/csv;charset=utf-8;' 
      });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
      
      // Generate filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      link.setAttribute('download', `all_users_export_${timestamp}.csv`);
    link.style.visibility = 'hidden';
      link.style.position = 'absolute';
      link.style.left = '-9999px';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error creating CSV file:', error);
      throw new Error('Failed to create CSV file. Please try again.');
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPassword('');
    setPasswordError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Users Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage all registered users and view their activity.
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={loadUsers}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportUsers}
            disabled={isExporting}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {exportProgress.total > 0 
                  ? `Exporting... (${exportProgress.current}/${exportProgress.total})`
                  : 'Exporting...'
                }
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search users by name, phone, or email..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              autoComplete="off"
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Minimum Bookings Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Bookings</label>
            <select
              value={filters.min_bookings || ''}
              onChange={(e) => handleFilterChange('min_bookings', e.target.value ? parseInt(e.target.value) : '')}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Users</option>
              <option value="1">At least 1 booking</option>
              <option value="2">At least 2 bookings</option>
              <option value="3">At least 3 bookings</option>
              <option value="4">At least 4 bookings</option>
              <option value="5">At least 5 bookings</option>
              <option value="10">At least 10 bookings</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Verified Users</h3>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.isVerified === true).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Active This Month</h3>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => 
                  new Date(u.createdAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
              <p className="text-2xl font-bold text-gray-900">
                ₹{users.reduce((sum, u) => sum + (u.totalSpent || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Version Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Smartphone className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Users with Version Info</h3>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.appVersion).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Smartphone className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Android Users</h3>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.platform === 'android').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Smartphone className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Web Users</h3>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.platform === 'web').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  App Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  FCM Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Join Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="ml-4">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {(user.firstName || '')[0]}{(user.lastName || '')[0] || 'U'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName || ''} {user.lastName || ''}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user._id?.slice(-6) || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-gray-400" />
                        {user.phoneNumber || 'N/A'}
                      </div>
                      {user.email && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Mail className="h-4 w-4 mr-1 text-gray-400" />
                          {user.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isVerified === true
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.isVerified === true ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Unverified
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {user.bookingCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                        ₹{(user.totalSpent || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.appVersion ? (
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {user.appVersion}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.platform ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          user.platform === 'android' ? 'bg-green-100 text-green-800' :
                          user.platform === 'ios' ? 'bg-gray-100 text-gray-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {user.platform}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.fcmToken ? (
                        <div className="max-w-xs">
                          <div className="text-xs text-gray-400 mb-1">FCM Token:</div>
                          <div className="font-mono text-xs bg-gray-100 p-1 rounded break-all">
                            {user.fcmToken.length > 20 
                              ? `${user.fcmToken.substring(0, 20)}...` 
                              : user.fcmToken
                            }
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No token</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handleFilterChange('page', Math.min(pagination.pages, pagination.page + 1))}
              disabled={pagination.page === pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                {[...Array(Math.min(10, pagination.pages))].map((_, i) => {
                  const page = i + 1;
                  const isActive = page === pagination.page;
                  return (
                    <button
                      key={page}
                      onClick={() => handleFilterChange('page', page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        isActive
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handleFilterChange('page', Math.min(pagination.pages, pagination.page + 1))}
                  disabled={pagination.page === pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="mt-2 text-center">
                <h3 className="text-lg font-medium text-gray-900">Export All Users Data</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Please enter the password to export ALL user data to Excel. This will include users from all pages.
                  </p>
                </div>
                <div className="mt-4">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                  )}
                </div>
                <div className="mt-6 flex justify-center space-x-3">
                  <button
                    onClick={closePasswordModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users; 