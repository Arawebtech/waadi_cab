import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Calendar,
  User,
  Car,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  RefreshCw,
  Save,
  MapPin,
  Phone,
  Hash,
  Bell,
  Check,
  ArrowLeft,
  MessageCircle,
  Upload,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import AdminAPI from '../services/api';
import socketService from '../services/socketService';
import { Booking, BookingFilters, State, User as UserType } from '../types';

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewedBookings, setViewedBookings] = useState<Set<string>>(new Set());
  const [unreadBookingIds, setUnreadBookingIds] = useState<Set<string>>(new Set());
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const ringIntervalRef = useRef<number | null>(null);
  const [expandedBookingIds, setExpandedBookingIds] = useState<Set<string>>(new Set());
  const [pdfUploadModalOpen, setPdfUploadModalOpen] = useState(false);
  const [selectedBookingForPdf, setSelectedBookingForPdf] = useState<Booking | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  // Router hooks
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Sound notification refs
  // const audioRef = useRef<HTMLAudioElement | null>(null);
  // const lastSoundAtRef = useRef<number>(0);

  // // Preload notification sound
  // useEffect(() => {
  //   try {
  //     const url = new URL('./bell-notification.wav', import.meta.url).toString();
  //     audioRef.current = new Audio(url);
  //     audioRef.current.preload = 'auto';
  //     audioRef.current.volume = 0.6;
  //   } catch (e) {
  //     console.warn('Failed to preload notification sound');
  //   }
  // }, []);

  // Continuous ringing while there are unread bookings
  // useEffect(() => {
  //   const hasUnread = unreadBookingIds.size > 0;
  //   if (hasUnread) {
  //     // Start interval if not already running
  //     if (ringIntervalRef.current == null) {
  //       ringIntervalRef.current = window.setInterval(() => {
  //         playNotificationSound();
  //       }, 6000);
  //     }
  //   } else {
  //     // Stop interval when no unread
  //     if (ringIntervalRef.current != null) {
  //       window.clearInterval(ringIntervalRef.current);
  //       ringIntervalRef.current = null;
  //     }
  //   }
  //   return () => {
  //     if (ringIntervalRef.current != null && unreadBookingIds.size === 0) {
  //       window.clearInterval(ringIntervalRef.current);
  //       ringIntervalRef.current = null;
  //     }
  //   };
  // }, [unreadBookingIds]);

  // const playNotificationSound = () => {
  //   try {
  //     const now = Date.now();
  //     if (now - lastSoundAtRef.current < 1500) return; // throttle
  //     lastSoundAtRef.current = now;

  //     if (audioRef.current) {
  //       // Restart from beginning for successive plays
  //       audioRef.current.pause();
  //       audioRef.current.currentTime = 0;
  //       void audioRef.current.play().catch(() => {
  //         // Autoplay may be blocked until user interacts
  //       });
  //     }
  //   } catch (e) {
  //     console.warn('Notification sound blocked or failed');
  //   }
  // };

  // Check if a booking matches current UI filters
  const matchesFilters = (booking: Booking): boolean => {
    try {
      // Status filter
      if (filters.status && booking.status !== filters.status) return false;

      // Processed filter ("true" | "false" | "")
      if (filters.processed === 'true' && !booking.processed_by_admin) return false;
      if (filters.processed === 'false' && !!booking.processed_by_admin) return false;

      // State multi-select filter
      if (filters.state_ids && filters.state_ids.length > 0) {
        const bookingStateId = (booking as any).visiting_state?._id || (booking as any).state_id;
        if (!bookingStateId || !filters.state_ids.includes(bookingStateId)) return false;
      }

      // Tax mode filter
      if (filters.tax_mode && booking.tax_mode !== filters.tax_mode) return false;

      // Date filters - Use Indian Standard Time (IST) consistently
      const start = filters.date_from ? new Date(filters.date_from + 'T00:00:00+05:30') : null;
      const end = filters.date_to ? new Date(filters.date_to + 'T23:59:59.999+05:30') : null;

      let compareDate: Date | null = null;
      if (filters.date_on === 'tax') {
        compareDate = booking.tax_from_date ? new Date(booking.tax_from_date) : null;
      } else {
        compareDate = booking.createdAt ? new Date(booking.createdAt) : null;
      }
      
      if ((start || end) && !compareDate) return false;
      if (compareDate) {
        // Convert compareDate to IST for comparison
        const compareDateIST = new Date(compareDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const startIST = start ? new Date(start.toLocaleString("en-US", {timeZone: "Asia/Kolkata"})) : null;
        const endIST = end ? new Date(end.toLocaleString("en-US", {timeZone: "Asia/Kolkata"})) : null;
        
        // Compare dates only (ignore time)
        const compareDateOnly = new Date(compareDateIST.getFullYear(), compareDateIST.getMonth(), compareDateIST.getDate());
        const startDateOnly = startIST ? new Date(startIST.getFullYear(), startIST.getMonth(), startIST.getDate()) : null;
        const endDateOnly = endIST ? new Date(endIST.getFullYear(), endIST.getMonth(), endIST.getDate()) : null;
        
        if (startDateOnly && compareDateOnly < startDateOnly) return false;
        if (endDateOnly && compareDateOnly > endDateOnly) return false;
      }

      // Basic search filter (best-effort on client side)
      if (filters.search && filters.search.trim().length > 0) {
        const q = filters.search.trim().toLowerCase();
        const haystack = [
          booking.bookingId,
          booking.vehicle_number,
          booking.user?.firstName,
          booking.user?.lastName,
          booking.user?.phoneNumber,
          booking.payment_details?.transaction_id,
          booking.payment_details?.payment_transaction_id,
          booking.payment_details?.bank_reference,
          booking.payment_details?.cashfree_order_id,
          booking.payment_details?.payment_reference,
        ]
          .filter(Boolean)
          .map(String)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (filters.payment_transaction_id?.trim()) {
        const q = filters.payment_transaction_id.trim().toLowerCase();
        const value = (booking.payment_details?.payment_transaction_id || '').toLowerCase();
        if (!value.includes(q)) return false;
      }

      if (filters.bank_reference?.trim()) {
        const q = filters.bank_reference.trim().toLowerCase();
        const value = (booking.payment_details?.bank_reference || '').toLowerCase();
        if (!value.includes(q)) return false;
      }

      if (filters.cashfree_order_id?.trim()) {
        const q = filters.cashfree_order_id.trim().toLowerCase();
        const value = (booking.payment_details?.cashfree_order_id || '').toLowerCase();
        if (!value.includes(q)) return false;
      }

      return true;
    } catch {
      // If anything goes wrong, do not show it for safety
      return false;
    }
  };

  // Filter states with proper initialization
  const [filters, setFilters] = useState<BookingFilters>(() => {
    // Get today's date in IST
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return {
      page: 1,
      limit: 20,
      search: '',
      status: 'paid',
      processed: '',
      state_id: '',
      state_ids: [], // Multi-select states
      tax_mode: '',
      date_from: todayIST,
      date_to: todayIST,
      date_on: 'createdAt',
      sort_by: 'createdAt',
      sort_order: 'desc',
      repeat_vehicle_days: 0,
      payment_transaction_id: '',
      bank_reference: '',
      cashfree_order_id: '',
    };
  });
  
  // Keep current filters in ref for auto-refresh
  const filtersRef = useRef<BookingFilters>(filters);
  
  // Update filters ref whenever filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Load selected booking ID from localStorage on component mount
  useEffect(() => {
    const savedSelectedId = localStorage.getItem('admin_selected_booking_id');
    if (savedSelectedId) {
      setSelectedBookingId(savedSelectedId);
    }
  }, []);

  // Save selected booking ID to localStorage whenever it changes
  const handleBookingSelection = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    localStorage.setItem('admin_selected_booking_id', bookingId);
  };

  // Clear selected booking
  const clearSelectedBooking = () => {
    setSelectedBookingId(null);
    localStorage.removeItem('admin_selected_booking_id');
  };

  // Default filters for reset functionality
  const getDefaultFilters = (): BookingFilters => {
    // Get today's date in IST
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return {
      page: 1,
      limit: 20,
      search: '',
      status: 'paid',
      processed: '',
      state_id: '',
      state_ids: [], // Multi-select states
      tax_mode: '',
      date_from: todayIST,
      date_to: todayIST,
      date_on: 'createdAt',
      sort_by: 'createdAt',
      sort_order: 'desc',
      repeat_vehicle_days: 0,
      payment_transaction_id: '',
      bank_reference: '',
      cashfree_order_id: '',
    };
  };

  // Helper to get the normalized (IST) date used for day-based comparisons
  const getBookingDateForFilter = (booking: Booking): number | null => {
    try {
      let rawDate: string | undefined;
      if (filters.date_on === 'tax') {
        rawDate = booking.tax_from_date;
      } else {
        rawDate = booking.createdAt;
      }

      if (!rawDate) return null;

      const date = new Date(rawDate);
      // Convert to IST and strip time to midnight
      const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const normalized = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate());
      return normalized.getTime();
    } catch {
      return null;
    }
  };

  // Derived list applying "same car in same state for N consecutive days" filter on top of API results
  const visibleBookings = useMemo(() => {
    const minDays = filters.repeat_vehicle_days ?? 0;

    // No extra filter -> show all bookings from API
    if (!minDays || minDays <= 1) {
      return bookings;
    }

    // Group by vehicle_number + visiting_state, collect unique normalized dates
    const groups = new Map<string, number[]>();

    bookings.forEach((booking) => {
      const stateId = booking.visiting_state?._id;
      const dateMs = getBookingDateForFilter(booking);
      if (!stateId || dateMs == null) return;

      const key = `${booking.vehicle_number}|${stateId}`;
      const existing = groups.get(key) ?? [];
      existing.push(dateMs);
      groups.set(key, existing);
    });

    const oneDayMs = 24 * 60 * 60 * 1000;
    const qualifyingKeys = new Set<string>(); // key|dateMs

    groups.forEach((dates, key) => {
      // Unique & sorted dates
      const uniqueDates = Array.from(new Set(dates)).sort((a, b) => a - b);
      if (uniqueDates.length < minDays) return;

      let streakStart = 0;
      for (let i = 1; i <= uniqueDates.length; i++) {
        const isLast = i === uniqueDates.length;
        const isGap =
          !isLast && Math.abs(uniqueDates[i] - uniqueDates[i - 1]) !== oneDayMs;

        if (isLast || isGap) {
          const streakLen = i - streakStart;
          if (streakLen >= minDays) {
            for (let j = streakStart; j < i; j++) {
              qualifyingKeys.add(`${key}|${uniqueDates[j]}`);
            }
          }
          streakStart = i;
        }
      }
    });

    // Keep only bookings that belong to any qualifying (vehicle,state,date) combination
    return bookings.filter((booking) => {
      const stateId = booking.visiting_state?._id;
      const dateMs = getBookingDateForFilter(booking);
      if (!stateId || dateMs == null) return false;
      const key = `${booking.vehicle_number}|${stateId}|${dateMs}`;
      return qualifyingKeys.has(key);
    });
  }, [bookings, filters.repeat_vehicle_days, filters.date_on]);

  useEffect(() => {
    loadBookings();
    loadStates();
    loadUsers();
  }, [filters]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('states-dropdown');
      const button = document.querySelector('[data-states-dropdown-trigger]');
      
      if (dropdown && !dropdown.contains(event.target as Node) && !button?.contains(event.target as Node)) {
        dropdown.classList.add('hidden');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load individual booking if ID is in URL
  useEffect(() => {
    if (bookingId) {
      const booking = bookings.find(b => b._id === bookingId);
      if (booking) {
        setSelectedBooking(booking);
      }
    }
  }, [bookingId, bookings]);

  // Initialize Socket.IO connection and real-time updates
  useEffect(() => {
    // Connect to Socket.IO
    socketService.connect();

    // Handle new booking events
    const handleNewBooking = (data: any) => {
      console.log('📡 Received new booking:', data);
      const newBooking = data.booking;
      // Only show completed (paid) bookings in the list
      if (!newBooking || newBooking.status !== 'paid') {
        return;
      }
      // Respect current filters; ignore if it doesn't match
      if (!matchesFilters(newBooking)) {
        return;
      }
      
      // Add the new booking to the top of the list if it matches filters
      setBookings(prevBookings => {
        const exists = prevBookings.find(b => b._id === newBooking._id);
        if (exists) return prevBookings;
        return [newBooking, ...prevBookings];
      });
      
      // Add to unread set until admin views
      setUnreadBookingIds(prev => {
        const next = new Set(prev);
        next.add(newBooking._id);
        return next;
      });

      // Play a sweet notification sound
      // playNotificationSound();
      
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Booking', {
          body: `New booking from ${newBooking.user?.firstName} ${newBooking.user?.lastName}`,
          icon: '/favicon.ico'
        });
      }
    };

    // Handle booking update events
    const handleBookingUpdated = (data: any) => {
      console.log('📡 Received booking update:', data);
      const updatedBooking = data.booking;
      if (!updatedBooking) return;

      // Only keep bookings that are paid. If update changes to paid, add; otherwise remove.
      setBookings(prevBookings => {
        const exists = prevBookings.some(b => b._id === updatedBooking._id);
        if (updatedBooking.status === 'paid') {
          if (!matchesFilters(updatedBooking)) {
            // If it no longer matches filters, remove if present
            return exists ? prevBookings.filter(b => b._id !== updatedBooking._id) : prevBookings;
          }
          if (exists) {
            return prevBookings.map(b => (b._id === updatedBooking._id ? updatedBooking : b));
          }
          // New paid booking that matches filters becomes unread
          setUnreadBookingIds(prev => new Set(prev).add(updatedBooking._id));
          // playNotificationSound();
          return [updatedBooking, ...prevBookings];
        }
        // Remove from list if it exists and is no longer paid
        if (exists) {
          return prevBookings.filter(b => b._id !== updatedBooking._id);
        }
        return prevBookings;
      });
    };

    const handlePaymentVerified = (data: any) => {
      console.log('📡 Received payment verified:', data);
      handleBookingUpdated({ booking: data.booking });
    };

    // Handle booking deletion events
    const handleBookingDeleted = (data: any) => {
      console.log('📡 Received booking deletion:', data);
      const deletedBookingId = data.bookingId;
      
      setBookings(prevBookings => 
        prevBookings.filter(booking => booking._id !== deletedBookingId)
      );
    };

    // Set up event listeners
    socketService.onNewBooking(handleNewBooking);
    socketService.onBookingUpdated(handleBookingUpdated);
    socketService.onPaymentVerified(handlePaymentVerified);
    socketService.onBookingDeleted(handleBookingDeleted);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup on unmount
    return () => {
      socketService.offNewBooking();
      socketService.offBookingUpdated();
      socketService.offPaymentVerified();
      socketService.offBookingDeleted();
      socketService.disconnect();
    };
  }, []);

  // Auto-refresh bookings every 2 minutes as fallback (WebSockets handle realtime)
  useEffect(() => {
    const interval = setInterval(async () => {
      // Use current filters from ref for auto-refresh
      try {
        setLoading(true);
        
        // Debug: Log the filters being sent in auto-refresh
        console.log('🔄 Auto-refresh - Sending filters to API:', {
          state_ids: filtersRef.current.state_ids,
          status: filtersRef.current.status,
          date_from: filtersRef.current.date_from,
          date_to: filtersRef.current.date_to,
          allFilters: filtersRef.current
        });
        
        const response = await AdminAPI.getAllBookings(filtersRef.current);
        
        // Check for new bookings (created in the last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const newBookings = response.bookings.filter(booking => 
          new Date(booking.createdAt) > fiveMinutesAgo && 
          !viewedBookings.has(booking._id)
        );
        
        // Add new bookings to viewed set if they're not already there
        newBookings.forEach(booking => {
          if (!viewedBookings.has(booking._id)) {
            setViewedBookings(prev => new Set(prev).add(booking._id));
          }
        });
        
        setBookings(response.bookings);
        setPagination(response.pagination);
      } catch (err) {
        setError('Failed to load bookings');
        console.error('Error loading bookings:', err);
      } finally {
        setLoading(false);
      }
    }, 120000); // 120 seconds

    return () => clearInterval(interval);
  }, []); // Empty dependency array to prevent interval recreation

  const loadBookings = async () => {
    try {
      setLoading(true);
      
      // Debug: Log the filters being sent
      console.log('🔍 Sending filters to API:', {
        state_ids: filters.state_ids,
        status: filters.status,
        date_from: filters.date_from,
        date_to: filters.date_to,
        allFilters: filters
      });
      
      // Use filters as they are, don't override status
      const response = await AdminAPI.getAllBookings(filters);
      
      // Check for new bookings (created in the last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const newBookings = response.bookings.filter(booking => 
        new Date(booking.createdAt) > fiveMinutesAgo && 
        !viewedBookings.has(booking._id)
      );
      
      // Add new bookings to viewed set if they're not already there
      newBookings.forEach(booking => {
        if (!viewedBookings.has(booking._id)) {
          setViewedBookings(prev => new Set(prev).add(booking._id));
        }
      });
      
      setBookings(response.bookings);
      setPagination(response.pagination);
    } catch (err) {
      setError('Failed to load bookings');
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStates = async () => {
    try {
      const statesData = await AdminAPI.getAllStates();
      setStates(statesData);
    } catch (err) {
      console.error('Error loading states:', err);
    }
  };

  const loadUsers = async () => {
    try {
      // Load only active users with basic info for dropdown (much faster)
      const response = await AdminAPI.getAllUsers({ 
        limit: 500, // Reduced from 1000 to 500
        search: '', // No search filter to speed up
        sort_by: 'firstName',
        sort_order: 'asc'
      });
      setUsers(response.users);
    } catch (err) {
      console.error('Error loading users:', err);
      // Don't show error to user, just log it - users dropdown is not critical
    }
  };

  const handleFilterChange = (key: keyof BookingFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? Number(value) : 1 // Only reset page when changing filters other than page itself
    }));
  };

  const handleStateSelectionChange = (stateId: string, checked: boolean) => {
    setFilters(prev => {
      const currentStateIds = prev.state_ids || [];
      let newStateIds: string[];
      
      if (checked) {
        // Add state if not already selected
        newStateIds = currentStateIds.includes(stateId) 
          ? currentStateIds 
          : [...currentStateIds, stateId];
      } else {
        // Remove state if currently selected
        newStateIds = currentStateIds.filter(id => id !== stateId);
      }
      
      return {
        ...prev,
        state_ids: newStateIds,
        page: 1 // Reset to first page when changing filters
      };
    });
  };

  const resetFilters = () => {
    setFilters(getDefaultFilters());
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: 'pending' | 'paid' | 'cancelled') => {
    try {
      await AdminAPI.updateBooking(bookingId, { status: newStatus });
      await loadBookings(); // Reload the list
    } catch (err) {
      console.error('Error updating booking status:', err);
      alert('Failed to update booking status');
    }
  };

  const markAsViewed = (bookingId: string) => {
    setViewedBookings(prev => new Set(prev).add(bookingId));
    setUnreadBookingIds(prev => {
      const next = new Set(prev);
      next.delete(bookingId);
      return next;
    });
  };

  const markAllAsViewed = () => {
    setUnreadBookingIds(new Set());
  };

  const isNewBooking = (booking: Booking) => {
    return unreadBookingIds.has(booking._id);
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

  const handlePdfUpload = async (booking: Booking) => {
    setSelectedBookingForPdf(booking);
    setPdfUploadModalOpen(true);
  };

  const handlePdfFileUpload = async (file: File) => {
    if (!selectedBookingForPdf) return;

    try {
      setUploadingPdf(true);
      
      const result = await AdminAPI.uploadBookingPdf(selectedBookingForPdf._id, file);

      if (result.success) {
        // Refresh bookings to show updated PDF status
        await loadBookings();
        setPdfUploadModalOpen(false);
        setSelectedBookingForPdf(null);
        alert('Tax slip PDF uploaded successfully! Customer will be notified via WhatsApp.');
      } else {
        alert(`Failed to upload PDF: ${result.message}`);
      }
    } catch (error: any) {
      console.error('PDF upload error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload PDF. Please try again.';
      alert(errorMessage);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handlePdfDownload = async (booking: Booking) => {
    try {
      const blob = await AdminAPI.downloadBookingPdf(booking._id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = booking.tax_slip_pdf?.original_name || `tax_slip_${booking.bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('PDF download error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to download PDF. Please try again.';
      alert(errorMessage);
    }
  };

  const exportBookings = async () => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: 0 });

    try {
      // Fetch all bookings from all pages
      const { bookings: allBookings, failedPages } = await fetchAllBookings();
      
      if (allBookings.length === 0) {
        alert('No bookings found to export.');
        setIsExporting(false);
        return;
      }

      // Generate Excel data with all bookings
      setExportProgress({ current: allBookings.length, total: allBookings.length });
      const excelData = generateExcelData(allBookings);
      downloadExcel(excelData);
      
      // Show success message with warnings if pages were skipped
      setTimeout(() => {
        if (failedPages.length > 0) {
          const message =
            `Exported ${allBookings.length} bookings successfully.\n\n` +
            `Note: ${failedPages.length} page(s) could not be loaded (page numbers: ${failedPages.slice(0, 10).join(', ')}${failedPages.length > 10 ? '...' : ''}). The export may be incomplete—try again or narrow the date/state filters.\n\n` +
            `When opening the CSV in Excel: if you see a message about "page breaks" or "features not supported", click OK—your data is complete; CSV format does not support those features.`;
          alert(message);
        } else {
          alert(
            `Successfully exported ${allBookings.length} bookings.\n\n` +
            `When opening in Excel: if you see "page breaks will not be added" or "some features not supported", click OK—your data is all there.`
          );
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

  // Build API-safe filters for export (only keys the backend accepts; excludes client-only e.g. repeat_vehicle_days)
  const getExportApiFilters = (overrides: { page?: number; limit?: number } = {}): BookingFilters => {
    const base: BookingFilters = {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      status: filters.status,
      processed: filters.processed,
      state_id: filters.state_id,
      state_ids: filters.state_ids,
      tax_mode: filters.tax_mode,
      date_from: filters.date_from,
      date_to: filters.date_to,
      date_on: filters.date_on,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      payment_transaction_id: filters.payment_transaction_id,
      bank_reference: filters.bank_reference,
      cashfree_order_id: filters.cashfree_order_id,
    };
    return { ...base, ...overrides };
  };

  const fetchAllBookings = async (): Promise<{ bookings: Booking[]; failedPages: number[] }> => {
    const allBookings: Booking[] = [];
    const failedPages: number[] = [];
    let currentPage = 1;
    let totalPages = 1;
    let hasMorePages = true;
    const maxRetries = 2;
    const maxFailedPages = 10;
    const skipDelay = 200;

    // First, get the total pages count (use export-safe params only)
    try {
      const firstResponse = await AdminAPI.getAllBookings(
        getExportApiFilters({ page: 1, limit: 100 })
      );
      totalPages = firstResponse.pagination.pages;
      allBookings.push(...firstResponse.bookings);
      setExportProgress({ current: firstResponse.bookings.length, total: firstResponse.pagination.total });
      currentPage = 2;
    } catch (error) {
      console.error('Error fetching first page:', error);
      throw new Error('Failed to fetch bookings. Please check your connection and try again.');
    }

    // Fetch remaining pages with skip-on-failure logic
    while (currentPage <= totalPages && hasMorePages) {
      let pageFetched = false;
      let retryCount = 0;

      // Try to fetch this page with retries
      while (retryCount <= maxRetries && !pageFetched) {
        try {
          const response = await AdminAPI.getAllBookings(
            getExportApiFilters({ page: currentPage, limit: 100 })
          );
          
          allBookings.push(...response.bookings);
          setExportProgress({ current: allBookings.length, total: response.pagination.total });
          
          // Check if there are more pages
          hasMorePages = currentPage < response.pagination.pages;
          pageFetched = true;
          
          // Add a small delay to avoid overwhelming the server
          if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, skipDelay));
          }
        } catch (error: any) {
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Wait before retrying with exponential backoff
            const delay = 1000 * retryCount;
            console.log(`Retrying page ${currentPage} (attempt ${retryCount}/${maxRetries}) after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Max retries reached - skip this page
            console.warn(`Failed to fetch page ${currentPage} after ${maxRetries} retries. Skipping...`);
            failedPages.push(currentPage);
            
            // If too many pages fail consecutively, stop
            if (failedPages.length > maxFailedPages) {
              console.error(`Too many failed pages (${failedPages.length}). Stopping export.`);
              break;
            }
            
            // Skip this page and continue
            pageFetched = true;
          }
        }
      }

      currentPage++;
      
      // Stop if we've hit too many failures
      if (failedPages.length > maxFailedPages) {
        break;
      }
    }

    return { bookings: allBookings, failedPages };
  };

  const generateExcelData = (bookingsData: Booking[]) => {
    const headers = [
      'Booking ID',
      'Customer Name',
      'Phone Number',
      'WhatsApp Number',
      'Vehicle Number',
      'Seat Capacity',
      'Visiting State',
      'Entry Border',
      'Tax Mode',
      'Tax From Date',
      'Tax Upto Date',
      'Amount (₹)',
      'Status',
      'Processed',
      'Payment Reference',
      'Merchant Order ID',
      'Payment Transaction ID',
      'UTR / Bank Reference',
      'Cashfree Order ID',
      'Payment Method',
      'Paid At',
      'Booking Date'
    ];

    const rows = bookingsData.map(booking => {
      // Safely format dates
      let taxFromDate = 'N/A';
      let taxUptoDate = 'N/A';
      let bookingDate = 'N/A';
      let paidAt = 'N/A';

      try {
        if (booking.tax_from_date) {
          const date = new Date(booking.tax_from_date);
          if (!isNaN(date.getTime())) {
            taxFromDate = format(date, 'MMM dd, yyyy');
          }
        }
      } catch (error) {
        console.warn('Error formatting tax_from_date:', error);
      }

      try {
        if (booking.tax_upto_date) {
          const date = new Date(booking.tax_upto_date);
          if (!isNaN(date.getTime())) {
            taxUptoDate = format(date, 'MMM dd, yyyy');
          }
        }
      } catch (error) {
        console.warn('Error formatting tax_upto_date:', error);
      }

      try {
        if (booking.createdAt) {
          const date = new Date(booking.createdAt);
          if (!isNaN(date.getTime())) {
            bookingDate = format(date, 'MMM dd, yyyy HH:mm');
          }
        }
      } catch (error) {
        console.warn('Error formatting createdAt:', error);
      }

      try {
        if (booking.payment_details?.paid_at) {
          const date = new Date(booking.payment_details.paid_at);
          if (!isNaN(date.getTime())) {
            paidAt = format(date, 'MMM dd, yyyy HH:mm');
          }
        }
      } catch (error) {
        console.warn('Error formatting paid_at:', error);
      }

      return [
        booking.bookingId || 'N/A',
        `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim() || 'N/A',
        booking.user?.phoneNumber || 'N/A',
        booking.whatsapp_number || 'N/A',
        booking.vehicle_number || 'N/A',
        booking.seat_capacity || 'N/A',
        booking.visiting_state?.name || 'N/A',
        booking.entry_border || 'N/A',
        booking.tax_mode || 'N/A',
        taxFromDate,
        taxUptoDate,
        booking.amount || 0,
        booking.status || 'N/A',
        booking.processed_by_admin ? 'Yes' : 'No',
        booking.payment_details?.payment_reference || 'N/A',
        booking.payment_details?.transaction_id || 'N/A',
        booking.payment_details?.payment_transaction_id || 'N/A',
        booking.payment_details?.bank_reference || 'N/A',
        booking.payment_details?.cashfree_order_id || 'N/A',
        booking.payment_details?.payment_method || 'N/A',
        paidAt,
        bookingDate
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
      link.setAttribute('download', `bookings_export_${timestamp}.csv`);
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

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 mr-1" />;
      case 'pending':
        return <Clock className="w-4 h-4 mr-1" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 mr-1" />;
      default:
        return null;
    }
  };

  const isBookingIdExpanded = (id: string) => expandedBookingIds.has(id);
  const toggleBookingIdExpanded = (id: string) => {
    setExpandedBookingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const BookingEditModal: React.FC<{ booking: Booking; onClose: () => void; onSave: () => void }> = ({
    booking,
    onClose,
    onSave
  }) => {
    const [formData, setFormData] = useState({
      status: booking.status,
      amount: booking.amount,
      tax_mode: booking.tax_mode,
      visiting_state: booking.visiting_state?._id || '',
      processed_by_admin: booking.processed_by_admin ?? false
    });
    const [applyToSameStateReference, setApplyToSameStateReference] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const canBulkReplaceByReference = !!booking.visiting_state_id && !booking.visiting_state?._id;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setIsSaving(true);
        const payload: any = { ...formData };
        if (!payload.visiting_state) {
          delete payload.visiting_state;
        }
        await AdminAPI.updateBooking(booking._id, payload);

        if (applyToSameStateReference && canBulkReplaceByReference && formData.visiting_state) {
          await AdminAPI.bulkReplaceBookingStateReference(booking.visiting_state_id!, formData.visiting_state);
        }

        onSave();
        onClose();
      } catch (err) {
        console.error('Error updating booking:', err);
        alert('Failed to update booking');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Booking</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tax Mode</label>
              <select
                value={formData.tax_mode}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_mode: e.target.value as any }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <optgroup label="Traditional Plans">
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </optgroup>
                <optgroup label="Day-Based Plans">
                  <option value="Day 1">Day 1</option>
                  <option value="Day 2">Day 2</option>
                  <option value="Day 3">Day 3</option>
                  <option value="Day 4">Day 4</option>
                  <option value="Day 5">Day 5</option>
                  <option value="Day 6">Day 6</option>
                  <option value="Day 7">Day 7</option>
                  <option value="Day 8">Day 8</option>
                  <option value="Day 9">Day 9</option>
                  <option value="Day 10">Day 10</option>
                  <option value="Day 11">Day 11</option>
                  <option value="Day 12">Day 12</option>
                  <option value="Day 13">Day 13</option>
                  <option value="Day 14">Day 14</option>
                  <option value="Day 15">Day 15</option>
                  <option value="Day 16">Day 16</option>
                  <option value="Day 17">Day 17</option>
                  <option value="Day 18">Day 18</option>
                  <option value="Day 19">Day 19</option>
                  <option value="Day 20">Day 20</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Visiting State</label>
              <select
                value={formData.visiting_state}
                onChange={(e) => setFormData(prev => ({ ...prev, visiting_state: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a state</option>
                {states.map(state => (
                  <option key={state._id} value={state._id}>{state.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                id="processed_by_admin"
                type="checkbox"
                checked={formData.processed_by_admin}
                onChange={(e) => setFormData(prev => ({ ...prev, processed_by_admin: e.target.checked }))}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="processed_by_admin" className="ml-2 block text-sm text-gray-700">
                Processed by Admin
              </label>
            </div>
            {canBulkReplaceByReference && (
            <div className="flex items-center">
              <input
                id="apply_to_same_state_reference"
                type="checkbox"
                checked={applyToSameStateReference}
                onChange={(e) => setApplyToSameStateReference(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                disabled={!formData.visiting_state}
              />
              <label htmlFor="apply_to_same_state_reference" className="ml-2 block text-sm text-gray-700">
                Apply to all bookings with this same deleted state reference
              </label>
            </div>
            )}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const BookingCreateModal: React.FC<{ onClose: () => void; onSave: () => void }> = ({
    onClose,
    onSave
  }) => {
    const [formData, setFormData] = useState({
      user_id: '',
      visiting_state: '',
      vehicle_number: '',
      seat_capacity: '4+1',
      whatsapp_number: '',
      entry_border: '',
      tax_mode: 'Daily',
      tax_from_date: '',
      tax_upto_date: '',
      amount: 0,
      status: 'pending'
    });
    const [districts, setDistricts] = useState<any[]>([]);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load districts when state changes
    useEffect(() => {
      if (formData.visiting_state) {
        loadDistricts(formData.visiting_state);
      } else {
        setDistricts([]);
        setFormData(prev => ({ ...prev, entry_border: '' }));
      }
    }, [formData.visiting_state]);

    const loadDistricts = async (stateId: string) => {
      try {
        setLoadingDistricts(true);
        const response = await AdminAPI.getDistricts(stateId);
        setDistricts(response);
      } catch (error) {
        console.error('Error loading districts:', error);
        setDistricts([]);
      } finally {
        setLoadingDistricts(false);
      }
    };

    const validateForm = () => {
      const newErrors: Record<string, string> = {};

      if (!formData.user_id) newErrors.user_id = 'Customer is required';
      if (!formData.visiting_state) newErrors.visiting_state = 'Visiting state is required';
      if (!formData.vehicle_number.trim()) newErrors.vehicle_number = 'Vehicle number is required';
      if (!formData.seat_capacity) newErrors.seat_capacity = 'Seat capacity is required';
      if (!formData.whatsapp_number.trim()) newErrors.whatsapp_number = 'WhatsApp number is required';
      if (!formData.entry_border.trim()) newErrors.entry_border = 'Entry border is required';
      if (!formData.tax_mode) newErrors.tax_mode = 'Tax mode is required';
      if (!formData.tax_from_date) newErrors.tax_from_date = 'Tax from date is required';
      if (!formData.tax_upto_date) newErrors.tax_upto_date = 'Tax upto date is required';
      if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';

      // Validate phone number format (10 digits)
      if (formData.whatsapp_number && !/^\d{10}$/.test(formData.whatsapp_number.replace(/\D/g, ''))) {
        newErrors.whatsapp_number = 'WhatsApp number must be 10 digits';
      }

      // Validate vehicle number format (basic validation)
      if (formData.vehicle_number && formData.vehicle_number.length < 5) {
        newErrors.vehicle_number = 'Vehicle number must be at least 5 characters';
      }

      // Validate date range
      if (formData.tax_from_date && formData.tax_upto_date) {
        const fromDate = new Date(formData.tax_from_date);
        const toDate = new Date(formData.tax_upto_date);
        if (fromDate >= toDate) {
          newErrors.tax_upto_date = 'Tax upto date must be after tax from date';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) {
        return;
      }

      try {
        setIsSubmitting(true);
        
        // Format the data for API
        const submitData = {
          ...formData,
          vehicle_number: formData.vehicle_number.toUpperCase().trim(),
          whatsapp_number: formData.whatsapp_number.replace(/\D/g, ''), // Remove non-digits
          entry_border: formData.entry_border.trim(),
          amount: Number(formData.amount),
          seat_capacity: formData.seat_capacity // Keep as string since API expects string
        };

        await AdminAPI.createBooking(submitData as any);
        onSave();
        onClose();
      } catch (err: any) {
        console.error('Error creating booking:', err);
        const errorMessage = err.response?.data?.message || 'Failed to create booking';
        alert(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Create New Booking</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer & State Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.user_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a customer</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.phoneNumber})
                    </option>
                  ))}
                </select>
                {errors.user_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.user_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visiting State <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.visiting_state}
                  onChange={(e) => setFormData(prev => ({ ...prev, visiting_state: e.target.value, entry_border: '' }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.visiting_state ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a state</option>
                  {states.map(state => (
                    <option key={state._id} value={state._id}>{state.name}</option>
                  ))}
                </select>
                {errors.visiting_state && (
                  <p className="mt-1 text-sm text-red-600">{errors.visiting_state}</p>
                )}
              </div>
              </div>

            {/* Vehicle Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value.toUpperCase() }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.vehicle_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., DL01AB1234"
                  maxLength={15}
                />
                {errors.vehicle_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.vehicle_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seat Capacity <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.seat_capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, seat_capacity: e.target.value }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.seat_capacity ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="4+1">4+1 (Small Car)</option>
                  <option value="6+1">6+1 (SUV)</option>
                  <option value="7+1">7+1 (Large SUV)</option>
                  <option value="8+1">8+1 (Van)</option>
                  <option value="9+1">9+1 (Mini Bus)</option>
                </select>
                {errors.seat_capacity && (
                  <p className="mt-1 text-sm text-red-600">{errors.seat_capacity}</p>
                )}
              </div>
              </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value.replace(/\D/g, '') }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.whatsapp_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="10 digit mobile number"
                  maxLength={10}
                />
                {errors.whatsapp_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.whatsapp_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Border <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.entry_border}
                  onChange={(e) => setFormData(prev => ({ ...prev, entry_border: e.target.value }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.entry_border ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={!formData.visiting_state || loadingDistricts}
                >
                  <option value="">
                    {loadingDistricts ? 'Loading districts...' : 'Select entry border'}
                  </option>
                  {districts.map(district => (
                    <option key={district._id} value={district.name}>
                      {district.name}
                    </option>
                  ))}
                </select>
                {errors.entry_border && (
                  <p className="mt-1 text-sm text-red-600">{errors.entry_border}</p>
                )}
              </div>
              </div>

            {/* Tax Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tax_mode}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_mode: e.target.value }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.tax_mode ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <optgroup label="Traditional Plans">
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </optgroup>
                  <optgroup label="Day-Based Plans">
                    <option value="Day 1">Day 1</option>
                    <option value="Day 2">Day 2</option>
                    <option value="Day 3">Day 3</option>
                    <option value="Day 4">Day 4</option>
                    <option value="Day 5">Day 5</option>
                    <option value="Day 6">Day 6</option>
                    <option value="Day 7">Day 7</option>
                    <option value="Day 8">Day 8</option>
                    <option value="Day 9">Day 9</option>
                    <option value="Day 10">Day 10</option>
                    <option value="Day 11">Day 11</option>
                    <option value="Day 12">Day 12</option>
                    <option value="Day 13">Day 13</option>
                    <option value="Day 14">Day 14</option>
                    <option value="Day 15">Day 15</option>
                    <option value="Day 16">Day 16</option>
                    <option value="Day 17">Day 17</option>
                    <option value="Day 18">Day 18</option>
                    <option value="Day 19">Day 19</option>
                    <option value="Day 20">Day 20</option>
                  </optgroup>
                </select>
                {errors.tax_mode && (
                  <p className="mt-1 text-sm text-red-600">{errors.tax_mode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.tax_from_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_from_date: e.target.value }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.tax_from_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.tax_from_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.tax_from_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Upto Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.tax_upto_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_upto_date: e.target.value }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.tax_upto_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.tax_upto_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.tax_upto_date}</p>
                )}
              </div>
              </div>

            {/* Amount & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                <Save className="h-4 w-4 mr-2" />
                Create Booking
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // If viewing individual booking, show booking details
  if (bookingId && selectedBooking) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/bookings')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Bookings</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Booking Details - {selectedBooking.bookingId}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => openWhatsAppChat(selectedBooking.whatsapp_number)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
              title="Open WhatsApp chat"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </button>
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Booking Information</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Booking ID</h3>
                <p className="text-lg font-semibold text-gray-900">{selectedBooking.bookingId}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                <span className={getStatusBadge(selectedBooking.status)}>
                  {getStatusIcon(selectedBooking.status)}
                  {selectedBooking.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Amount</h3>
                <p className="text-lg font-semibold text-gray-900">₹{selectedBooking.amount.toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Created Date</h3>
                <p className="text-gray-900">{format(new Date(selectedBooking.createdAt), 'MMM dd, yyyy HH:mm')}</p>
              </div>
            </div>

            {/* Vehicle & Travel Info */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle & Travel Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Vehicle Number</h4>
                  <p className="text-gray-900">{selectedBooking.vehicle_number}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Seat Capacity</h4>
                  <p className="text-gray-900">{selectedBooking.seat_capacity}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Entry Border</h4>
                  <p className="text-gray-900">{selectedBooking.entry_border}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Visiting State</h4>
                  <p className="text-gray-900">{selectedBooking.visiting_state?.name || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Tax Mode</h4>
                  <p className="text-gray-900">{selectedBooking.tax_mode}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Tax Period</h4>
                  <p className="text-gray-900">
                    {format(new Date(selectedBooking.tax_from_date), 'MMM dd, yyyy')} - {format(new Date(selectedBooking.tax_upto_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Name</h4>
                  <p className="text-gray-900">{selectedBooking.user.firstName} {selectedBooking.user.lastName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Phone Number</h4>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900">{selectedBooking.user?.phoneNumber}</p>
                    <button
                      onClick={() => openWhatsAppChat(selectedBooking.whatsapp_number)}
                      className="text-green-600 hover:text-green-900 flex items-center"
                      title="Open WhatsApp chat"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">WhatsApp Number</h4>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900">{selectedBooking.whatsapp_number}</p>
                    {selectedBooking.whatsapp_number && (
                      <button
                        onClick={() => openWhatsAppChat(selectedBooking.whatsapp_number)}
                        className="text-green-600 hover:text-green-900 flex items-center"
                        title="Open WhatsApp chat"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Payment Status</h4>
                  <span className={getStatusBadge(selectedBooking.status)}>
                    {selectedBooking.status}
                  </span>
                </div>
                {selectedBooking.payment_details?.transaction_id && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Merchant Order ID</h4>
                    <p className="text-gray-900 font-mono text-sm">{selectedBooking.payment_details.transaction_id}</p>
                  </div>
                )}
                {selectedBooking.payment_details?.payment_transaction_id && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Payment Transaction ID</h4>
                    <p className="text-gray-900 font-mono text-sm">{selectedBooking.payment_details.payment_transaction_id}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">UTR / Bank Reference</h4>
                  <p className="text-gray-900 font-mono text-sm">
                    {selectedBooking.payment_details?.bank_reference || '—'}
                  </p>
                </div>
                {selectedBooking.payment_details?.cashfree_order_id && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Cashfree Order ID</h4>
                    <p className="text-gray-900 font-mono text-sm">{selectedBooking.payment_details.cashfree_order_id}</p>
                  </div>
                )}
                {selectedBooking.payment_details?.payment_reference && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Internal Payment Reference</h4>
                    <p className="text-gray-900 font-mono text-sm">{selectedBooking.payment_details.payment_reference}</p>
                  </div>
                )}
                {selectedBooking.payment_details?.payment_method && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Payment Method</h4>
                    <p className="text-gray-900 capitalize">{selectedBooking.payment_details.payment_method}</p>
                  </div>
                )}
                {selectedBooking.payment_details?.paid_at && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Paid On</h4>
                    <p className="text-gray-900">{format(new Date(selectedBooking.payment_details.paid_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Bookings Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage all bookings, update statuses, and track payments.
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          {/* Real-time Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${socketService.getConnectionStatus() ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500">
              {socketService.getConnectionStatus() ? 'Live' : 'Offline'}
            </span>
          </div>
          {/* Unread indicator and bulk action */}
          <div className="flex items-center space-x-2">
            <Bell className={`h-4 w-4 ${unreadBookingIds.size > 0 ? 'text-yellow-600 animate-bell-bounce' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-600">{unreadBookingIds.size} unread</span>
            {unreadBookingIds.size > 0 && (
              <button
                onClick={markAllAsViewed}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                title="Mark all as viewed"
              >
                Mark all viewed
              </button>
            )}
          </div>
          
          <button
            onClick={loadBookings}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          {selectedBookingId && (
            <button
              onClick={clearSelectedBooking}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center"
              title="Clear selected booking"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Clear Selection
            </button>
          )}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Booking
          </button>
          <button
            onClick={exportBookings}
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
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={resetFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center text-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by phone, vehicle, booking ID, payment IDs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              title="Search by phone, vehicle, booking ID, customer name, or payment reference IDs"
            />
          </div>

          {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

          {/* State Filter - Custom Multi Select */}
          <div className="relative">
            <div className="relative">
              <button
                type="button"
                data-states-dropdown-trigger
                onClick={() => {
                  const dropdown = document.getElementById('states-dropdown');
                  if (dropdown) {
                    dropdown.classList.toggle('hidden');
                  }
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm flex items-center justify-between"
              >
                <span className="block truncate">
                  {filters.state_ids && filters.state_ids.length > 0 
                    ? `${filters.state_ids.length} state${filters.state_ids.length > 1 ? 's' : ''} selected`
                    : 'Select states'
                  }
                </span>
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              <div
                id="states-dropdown"
                className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm hidden"
              >
                {states.map((state) => {
                  const isSelected = filters.state_ids?.includes(state._id) || false;
                  return (
                    <div
                      key={state._id}
                      onClick={() => handleStateSelectionChange(state._id, !isSelected)}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 hover:text-blue-900"
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent onClick
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                        />
                        <span className="font-normal block truncate">
                          {state.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {/* Clear All Option */}
                {filters.state_ids && filters.state_ids.length > 0 && (
                  <div className="border-t border-gray-100">
                    <div
                      onClick={() => setFilters(prev => ({ ...prev, state_ids: [], page: 1 }))}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-red-50 hover:text-red-900 text-red-600"
                    >
                      <span className="font-normal block truncate">
                        Clear all states
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Selected State Tags */}
            {filters.state_ids && filters.state_ids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {filters.state_ids.map(stateId => {
                  const state = states.find(s => s._id === stateId);
                  return state ? (
                    <span
                      key={stateId}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      {state.name}
                      <button
                        onClick={() => handleStateSelectionChange(stateId, false)}
                        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 transition-colors"
                        title="Remove state"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Tax Mode Filter */}
          <select
            value={filters.tax_mode}
            onChange={(e) => handleFilterChange('tax_mode', e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Tax Modes</option>
            <optgroup label="Traditional Plans">
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </optgroup>
            <optgroup label="Day-Based Plans">
              <option value="Day 1">Day 1</option>
              <option value="Day 2">Day 2</option>
              <option value="Day 3">Day 3</option>
              <option value="Day 4">Day 4</option>
              <option value="Day 5">Day 5</option>
              <option value="Day 6">Day 6</option>
              <option value="Day 7">Day 7</option>
              <option value="Day 8">Day 8</option>
              <option value="Day 9">Day 9</option>
              <option value="Day 10">Day 10</option>
              <option value="Day 11">Day 11</option>
              <option value="Day 12">Day 12</option>
              <option value="Day 13">Day 13</option>
              <option value="Day 14">Day 14</option>
              <option value="Day 15">Day 15</option>
              <option value="Day 16">Day 16</option>
              <option value="Day 17">Day 17</option>
              <option value="Day 18">Day 18</option>
              <option value="Day 19">Day 19</option>
              <option value="Day 20">Day 20</option>
            </optgroup>
          </select>
          {/* Processed Filter */}
          <select
            value={filters.processed as any}
            onChange={(e) => handleFilterChange('processed', e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Processed</option>
            <option value="true">Processed</option>
            <option value="false">Not Processed</option>
          </select>
          {/* Repeat Vehicle (Consecutive Days) Filter */}
          <select
            value={filters.repeat_vehicle_days && filters.repeat_vehicle_days > 0 ? filters.repeat_vehicle_days : ''}
            onChange={(e) =>
              handleFilterChange(
                'repeat_vehicle_days',
                e.target.value ? Number(e.target.value) : 0
              )
            }
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Vehicles</option>
            <option value="2">Same car in same state for 2+ consecutive days</option>
            <option value="3">Same car in same state for 3+ consecutive days</option>
            <option value="4">Same car in same state for 4+ consecutive days</option>
          </select>
        </div>

        {/* Cashfree payment tracking filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Transaction ID</label>
            <input
              type="text"
              placeholder="Cashfree cf_payment_id"
              value={filters.payment_transaction_id || ''}
              onChange={(e) => handleFilterChange('payment_transaction_id', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">UTR / Bank Reference</label>
            <input
              type="text"
              placeholder="bank_reference / UTR"
              value={filters.bank_reference || ''}
              onChange={(e) => handleFilterChange('bank_reference', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cashfree Order ID</label>
            <input
              type="text"
              placeholder="cf_order_id"
              value={filters.cashfree_order_id || ''}
              onChange={(e) => handleFilterChange('cashfree_order_id', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Filter By</label>
            <select
              value={filters.date_on}
              onChange={(e) => handleFilterChange('date_on', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="createdAt">Booking Date</option>
              <option value="tax">Tax From Date</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {filters.date_on === 'createdAt' ? 'From Booking Date' : 'From Tax Date'}
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {filters.date_on === 'createdAt' ? 'To Booking Date' : 'To Tax Date'}
            </label>
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
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>
        {/* Add more stat cards here */}
      </div>

      {/* Bookings Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                  </tr>
                ))
              ) : visibleBookings.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                visibleBookings.map((booking) => {
                  const isSelected = selectedBookingId === booking._id;
                  return (
                  <tr 
                    key={booking._id} 
                      onClick={() => handleBookingSelection(booking._id)}
                      // className={`cursor-pointer hover:bg-gray-50 transition-all duration-300 ${
                      // isNewBooking(booking) && !viewedBookings.has(booking._id)
                      //   ? 'animate-new-booking border-l-4 border-yellow-400' 
                      //   : ''
                      // } ${!booking.processed_by_admin ? 'animate-unprocessed' : ''} ${
                      //   isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      // }`}
                      className={`cursor-pointer hover:bg-gray-50 transition-all duration-300 ${
  !booking.processed_by_admin
    ? 'animate-new-booking border-l-4 border-yellow-500'
    : ''
} ${
  isNewBooking(booking) && !viewedBookings.has(booking._id)
    ? 'animate-new-booking border-l-4 border-yellow-400'
    : ''
} ${
  isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      <div className="flex items-center">
                        {isBookingIdExpanded(booking.bookingId) ? (
                          <>
                            <span className="font-mono">{booking.bookingId}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookingIdExpanded(booking.bookingId);
                              }}
                              className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                              title="Read less"
                            >
                              ...
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="font-mono">{booking.bookingId.slice(0, 3)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookingIdExpanded(booking.bookingId);
                              }}
                              className="text-blue-600 hover:text-blue-800 focus:outline-none"
                              title="Read more"
                            >
                              ...
                            </button>
                          </>
                        )}
                        {isSelected && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            Selected
                          </span>
                        )}
                        {isNewBooking(booking) && (
                          <Bell className="h-4 w-4 ml-2 text-yellow-600 animate-bell-bounce" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.user.firstName} {booking.user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{booking.whatsapp_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.vehicle_number}</div>
                      <div className="text-sm text-gray-500">{booking.seat_capacity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.visiting_state?.name || 'N/A'}
                        {!booking.visiting_state?._id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                              setEditModalOpen(true);
                            }}
                            className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                            title="Set visiting state"
                          >
                            Set state
                          </button>
                        )}
                      </div>
                      {booking.entry_border && (
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                          <span>{booking.entry_border}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.tax_mode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {booking.tax_from_date ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                          title="From Date"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(booking.tax_from_date), 'MMM dd, yyyy')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          <Calendar className="w-3 h-3 mr-1" />
                          Not set
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {booking.tax_upto_date ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                          title="To Date"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(booking.tax_upto_date), 'MMM dd, yyyy')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          <Calendar className="w-3 h-3 mr-1" />
                          Not set
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{booking.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(booking.status)}>
                        {getStatusIcon(booking.status)}
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const currentProcessed = booking.processed_by_admin || false;
                            console.log('🔄 Toggling processed status:', {
                              bookingId: booking.bookingId,
                              currentProcessed,
                              newProcessed: !currentProcessed
                            });
                            await AdminAPI.updateBooking(booking._id, { processed_by_admin: !currentProcessed });
                            console.log('✅ Successfully updated processed status');
                            await loadBookings();
                          } catch (e) {
                            console.error('❌ Error updating processed flag:', e);
                            alert('Failed to update processed flag');
                          }
                        }}
                        className={`px-2 py-1 rounded text-xs ${booking.processed_by_admin ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                        title="Toggle processed"
                      >
                        {booking.processed_by_admin ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.payment_details?.payment_transaction_id ||
                      booking.payment_details?.bank_reference ||
                      booking.payment_details?.cashfree_order_id ||
                      booking.payment_details?.transaction_id ? (
                        <div className="space-y-1">
                          {booking.payment_details?.payment_transaction_id && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 mr-2 min-w-[72px]">Txn ID:</span>
                              <span className="font-mono text-xs bg-green-50 px-2 py-1 rounded border border-green-200 text-green-700 max-w-[180px] truncate" title={booking.payment_details.payment_transaction_id}>
                                {booking.payment_details.payment_transaction_id}
                              </span>
                            </div>
                          )}
                          {booking.payment_details?.bank_reference && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 mr-2 min-w-[72px]">UTR/Ref:</span>
                              <span className="font-mono text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200 text-amber-800 max-w-[180px] truncate" title={booking.payment_details.bank_reference}>
                                {booking.payment_details.bank_reference}
                              </span>
                            </div>
                          )}
                          {booking.payment_details?.cashfree_order_id && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 mr-2 min-w-[72px]">CF Order:</span>
                              <span className="font-mono text-xs bg-purple-50 px-2 py-1 rounded border border-purple-200 text-purple-700 max-w-[180px] truncate" title={booking.payment_details.cashfree_order_id}>
                                {booking.payment_details.cashfree_order_id}
                              </span>
                            </div>
                          )}
                          {booking.payment_details?.transaction_id && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 mr-2 min-w-[72px]">Order:</span>
                              <span className="font-mono text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200 text-blue-700 max-w-[180px] truncate" title={booking.payment_details.transaction_id}>
                                {booking.payment_details.transaction_id}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(booking.createdAt), 'HH:mm:ss')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {isNewBooking(booking) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsViewed(booking._id);
                            }}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Mark as viewed"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                            setEditModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                            navigate(`/bookings/${booking._id}`);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="View booking details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {booking.tax_slip_pdf?.filename ? (
                          <>
                        <button
                              onClick={(e) => { e.stopPropagation(); handlePdfDownload(booking); }}
                              className="text-purple-600 hover:text-purple-900"
                              title="Download tax slip PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePdfUpload(booking); }}
                              className="text-orange-600 hover:text-orange-900"
                              title="Replace tax slip PDF"
                            >
                              <Upload className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePdfUpload(booking); }}
                            className="text-orange-600 hover:text-orange-900"
                            title="Upload tax slip PDF"
                          >
                            <Upload className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsAppChat(booking.whatsapp_number);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
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
                {[...Array(pagination.pages)].map((_, i) => {
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

      {/* Edit Modal */}
      {editModalOpen && selectedBooking && (
        <BookingEditModal
          booking={selectedBooking}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedBooking(null);
          }}
          onSave={loadBookings}
        />
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <BookingCreateModal
          onClose={() => setCreateModalOpen(false)}
          onSave={loadBookings}
        />
      )}

      {/* PDF Upload Modal */}
      {pdfUploadModalOpen && selectedBookingForPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upload Tax Slip PDF - {selectedBookingForPdf.bookingId}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select PDF File
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handlePdfFileUpload(file);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={uploadingPdf}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only PDF files are allowed. Maximum size: 10MB
                </p>
              </div>
              {uploadingPdf && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Uploading PDF...</span>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setPdfUploadModalOpen(false);
                    setSelectedBookingForPdf(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  disabled={uploadingPdf}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings; 