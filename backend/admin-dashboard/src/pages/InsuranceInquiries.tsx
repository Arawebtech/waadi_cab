import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, Clock, Phone, CheckCircle, XCircle, Filter, Download, Lock } from 'lucide-react';
import { format } from 'date-fns';
import AdminAPI from '../services/api';
import { InsuranceInquiry } from '../types';

const InsuranceInquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<InsuranceInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  
  // Export modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        page: pagination.page,
        limit: pagination.limit,
        search,
        status,
        dateFrom,
        dateTo
      };
      const { inquiries, pagination: pageInfo } = await AdminAPI.getInsuranceInquiries(filters);
      setInquiries(inquiries as any);
      setPagination(pageInfo);
    } finally {
      setLoading(false);
    }
  }, [search, status, dateFrom, dateTo, pagination.page, pagination.limit]);

  useEffect(() => { load(); }, [load]);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, status, dateFrom, dateTo]);

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const updateStatus = async (id: string, newStatus: 'new' | 'contacted' | 'closed') => {
    await AdminAPI.updateInsuranceInquiry(id, { status: newStatus });
    await load();
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'new':
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case 'contacted':
        return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
      case 'closed':
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="w-3 h-3 mr-1" />;
      case 'contacted':
        return <Phone className="w-3 h-3 mr-1" />;
      case 'closed':
        return <CheckCircle className="w-3 h-3 mr-1" />;
      default:
        return <XCircle className="w-3 h-3 mr-1" />;
    }
  };

  const openWhatsAppChat = (phoneNumber: string) => {
    // Format phone number for WhatsApp
    let formattedNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    
    // If number starts with 0, replace with country code
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '91' + formattedNumber.substring(1);
    }
    
    // If number doesn't start with country code, add it
    if (!formattedNumber.startsWith('91')) {
      formattedNumber = '91' + formattedNumber;
    }
    
    // Open WhatsApp chat
    const whatsappUrl = `https://wa.me/${formattedNumber}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const exportInquiries = () => {
    setShowPasswordModal(true);
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

    try {
      // Fetch all inquiries from all pages with current filters
      const allInquiries = await fetchAllInquiries();
      
      // Generate Excel data with all inquiries
      const excelData = generateExcelData(allInquiries);
      downloadExcel(excelData);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchAllInquiries = async (): Promise<InsuranceInquiry[]> => {
    const allInquiries: InsuranceInquiry[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const response = await AdminAPI.getInsuranceInquiries({
          page: currentPage,
          limit: 100, // Fetch more per page for efficiency
          search,
          status,
          dateFrom,
          dateTo
        });
        
        allInquiries.push(...(response.inquiries as InsuranceInquiry[]));
        
        // Check if there are more pages
        hasMorePages = currentPage < response.pagination.pages;
        currentPage++;
        
        // Add a small delay to avoid overwhelming the server
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error);
        throw new Error(`Failed to fetch inquiries from page ${currentPage}`);
      }
    }

    return allInquiries;
  };

  const generateExcelData = (inquiriesData: InsuranceInquiry[]) => {
    const headers = [
      'Vehicle Number',
      'Phone Number',
      'Status',
      'Created Date',
      'Created Time'
    ];

    const rows = inquiriesData.map(inq => [
      inq.vehicle_number || 'N/A',
      inq.phone_number || 'N/A',
      inq.status || 'N/A',
      format(new Date(inq.createdAt), 'MMM dd, yyyy'),
      format(new Date(inq.createdAt), 'HH:mm:ss')
    ]);

    return [headers, ...rows];
  };

  const downloadExcel = (data: any[][]) => {
    // Create CSV content
    const csvContent = data.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Add BOM for UTF-8 encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link with date range in filename
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with date range
    let filename = 'insurance_inquiries_export';
    if (dateFrom && dateTo) {
      filename += `_${dateFrom}_to_${dateTo}`;
    } else if (dateFrom) {
      filename += `_from_${dateFrom}`;
    } else if (dateTo) {
      filename += `_until_${dateTo}`;
    }
    filename += `_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPassword('');
    setPasswordError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Insurance Inquiries</h2>
          <p className="text-sm text-gray-500">Manage insurance booking inquiries from users.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={load} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
          <button
            onClick={exportInquiries}
            disabled={isExporting}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={resetFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center text-sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Reset Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by vehicle or phone" 
              autoComplete="off"
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
            />
          </div>
          
          {/* Status Filter */}
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value)} 
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">New Inquiries</h3>
              <p className="text-2xl font-bold text-gray-900">{inquiries.filter(i => i.status === 'new').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Contacted</h3>
              <p className="text-2xl font-bold text-gray-900">{inquiries.filter(i => i.status === 'contacted').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Closed</h3>
              <p className="text-2xl font-bold text-gray-900">{inquiries.filter(i => i.status === 'closed').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Filter className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total</h3>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : inquiries.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No inquiries found</td></tr>
              ) : (
                inquiries.map((inq) => (
                  <tr key={inq._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="font-mono">{inq.vehicle_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span>{inq.phone_number}</span>
                        <button
                          onClick={() => openWhatsAppChat(inq.phone_number)}
                          className="text-green-600 hover:text-green-900 flex items-center"
                          title="Open WhatsApp chat"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span className={getStatusBadge(inq.status)}>
                          {getStatusIcon(inq.status)}
                          {inq.status}
                        </span>
                        <select 
                          value={inq.status} 
                          onChange={(e) => updateStatus(inq._id, e.target.value as any)} 
                          className="rounded border-gray-300 text-xs px-2 py-1"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="text-sm">
                        {new Date(inq.createdAt).toLocaleDateString('en-IN', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(inq.createdAt).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openWhatsAppChat(inq.phone_number)}
                          className="text-green-600 hover:text-green-900 flex items-center"
                          title="Open WhatsApp chat"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                      </div>
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
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
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
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                {(() => {
                  const totalPages = pagination.pages;
                  const currentPage = pagination.page;
                  const maxVisiblePages = 5;
                  
                  // Calculate the range of pages to show
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  // Adjust start page if we're near the end
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }
                  
                  const pages = [];
                  
                  // Add first page and ellipsis if needed
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        1
                      </button>
                    );
                    
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis-start" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500">
                          ...
                        </span>
                      );
                    }
                  }
                  
                  // Add visible pages
                  for (let page = startPage; page <= endPage; page++) {
                    const isActive = page === currentPage;
                    pages.push(
                      <button
                        key={page}
                        onClick={() => setPagination(prev => ({ ...prev, page }))}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          isActive
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  
                  // Add ellipsis and last page if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis-end" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500">
                          ...
                        </span>
                      );
                    }
                    
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setPagination(prev => ({ ...prev, page: totalPages }))}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  
                  return pages;
                })()}
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
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
                <h3 className="text-lg font-medium text-gray-900">Export Insurance Inquiries</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Please enter the password to export insurance inquiries data to Excel.
                    {dateFrom || dateTo ? (
                      <span className="block mt-2 font-medium">
                        Exporting data from {dateFrom || 'beginning'} to {dateTo || 'today'}
                      </span>
                    ) : (
                      <span className="block mt-2 font-medium">
                        This will include inquiries from all pages.
                      </span>
                    )}
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

export default InsuranceInquiries;


