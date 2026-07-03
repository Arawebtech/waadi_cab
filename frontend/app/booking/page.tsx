"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MobileLayout } from "@/components/mobile-layout"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { historyAPI, type BookingDetail } from '@/lib/api'
import { downloadPdf, getPdfFilename } from '@/lib/pdf-download'
import { downloadInvoice } from '@/lib/invoice-generator'
import {
  Calendar,
  Car,
  MapPin,
  Phone,
  CreditCard,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Download,
  FileText,
  Receipt
} from "lucide-react"

export default function BookingDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  // Get booking ID from query parameters
  const bookingId = searchParams.get('id')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🔒 User not authenticated, redirecting to login')
      router.push('/login')
      return
    }
  }, [isAuthenticated, authLoading, router])

  // Redirect if no booking ID provided
  useEffect(() => {
    if (!bookingId) {
      console.log('❌ No booking ID provided, redirecting to history')
      router.push('/history')
      return
    }
  }, [bookingId, router])

  useEffect(() => {
    const fetchBooking = async () => {
      // Don't fetch if not authenticated, still loading auth, or no booking ID
      if (authLoading || !isAuthenticated || !bookingId) {
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        console.log('🔍 Fetching booking with ID:', bookingId)
        
        const result = await historyAPI.getBookingById(bookingId)
        
        if (!result.success) {
          console.error('❌ Failed to fetch booking:', result.message)
          setError(result.message || 'Failed to fetch booking details')
          return
        }
        
        console.log('✅ Booking data received:', result.data)
        setBooking(result.data)
        
      } catch (error) {
        console.error('💥 Error fetching booking:', error)
        setError('Failed to load booking details. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    if (bookingId && isAuthenticated) {
      fetchBooking()
    }
  }, [bookingId, isAuthenticated, authLoading])

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show error if no booking ID
  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Request</h1>
          <p className="text-gray-600">No booking ID provided</p>
          <Button 
            onClick={() => router.push('/history')}
            className="mt-4"
          >
            Back to History
          </Button>
        </div>
      </div>
    )
  }

  // Show loading while fetching booking data
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Please check the booking ID and try again.</p>
          <Button 
            onClick={() => router.push('/history')}
            className="mt-4"
          >
            Back to History
          </Button>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Booking Not Found</h1>
          <p className="text-gray-600">Unable to fetch booking details for ID: {bookingId}</p>
          <p className="text-sm text-gray-500 mt-2">Please check the booking ID and try again.</p>
          <Button 
            onClick={() => router.push('/history')}
            className="mt-4"
          >
            Back to History
          </Button>
        </div>
      </div>
    )
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Helper function to get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePdfDownload = async () => {
    if (!booking) return;

    try {
      setDownloadingPdf(true);
      
      const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/v1/bookings/${booking._id}/pdf`;
      const filename = getPdfFilename(booking);
      
      await downloadPdf({ url: pdfUrl, filename });
      
      toast({
        title: "Success",
        description: "Tax slip PDF downloaded successfully!",
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleInvoiceDownload = () => {
    if (!booking) {
      toast({
        title: "Error",
        description: "Booking data not available. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDownloadingInvoice(true);
      console.log('Generating invoice for booking:', booking.bookingId);
      downloadInvoice(booking);
      
      // Reset loading state after a short delay to allow window to open
      setTimeout(() => {
        setDownloadingInvoice(false);
        toast({
          title: "Invoice Ready",
          description: "Invoice opened in new window. Use Print > Save as PDF to download.",
        });
      }, 500);
    } catch (error) {
      console.error('Invoice download error:', error);
      setDownloadingInvoice(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invoice. Please check if popups are blocked and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <MobileLayout title="Booking Details" showBackButton backHref="/history">
      <div className="px-4 pb-6 space-y-6">
        {/* Download Options - Priority Section */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Invoice Download */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Download Invoice</h3>
                    <p className="text-sm text-gray-600">Get your booking invoice as PDF</p>
                  </div>
                </div>
                <Button
                  onClick={handleInvoiceDownload}
                  disabled={downloadingInvoice}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {downloadingInvoice ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Invoice
                    </>
                  )}
                </Button>
              </div>

              {/* Tax Slip Download */}
              {booking.tax_slip_pdf?.filename && (
                <div className="flex items-center justify-between border-t border-blue-200 pt-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Tax Slip Ready</h3>
                      <p className="text-sm text-gray-600">Your tax slip PDF is available for download</p>
                    </div>
                  </div>
                  <Button
                    onClick={handlePdfDownload}
                    disabled={downloadingPdf}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {downloadingPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Tax Slip
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Booking ID and Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Booking #{booking.bookingId}</h2>
                <p className="text-sm text-gray-500">Created on {formatDate(booking.createdAt)}</p>
              </div>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.toUpperCase()}
              </Badge>
            </div>
            
            {/* Payment Info */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Payment Status</h4>
                  <span className={getStatusColor(booking.status)}>
                    {booking.status}
                  </span>
                </div>
                {booking.payment_details?.transaction_id && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Transaction ID</h4>
                    <p className="text-gray-900 font-mono text-sm">{booking.payment_details.transaction_id}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Amount</h4>
                  <p className="text-gray-900 font-semibold">₹{booking.amount.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Created Date</h4>
                  <p className="text-gray-900">{formatDate(booking.createdAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle and Travel Details */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Car className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Vehicle Number</p>
                  <p className="font-medium">{booking.vehicle_number}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Entry Border</p>
                  <p className="font-medium">{booking.entry_border}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Visiting State</p>
                  <p className="font-medium">{booking.visiting_state.name}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Tax Period</p>
                  <p className="font-medium">
                    {formatDate(booking.tax_from_date)} - {formatDate(booking.tax_upto_date)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Tax Mode</p>
                  <p className="font-medium">{booking.tax_mode}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Car className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Seat Capacity</p>
                  <p className="font-medium">{booking.seat_capacity}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Amount</span>
                <span className="font-semibold text-lg">{formatCurrency(booking.amount)}</span>
              </div>
              
              {booking.payment_details?.transaction_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Transaction ID</span>
                  <span className="font-mono text-sm">{booking.payment_details.transaction_id}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">WhatsApp Number</p>
                  <p className="font-medium">{booking.whatsapp_number}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">User Phone</p>
                  <p className="font-medium">{booking.user.phoneNumber}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Car className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">User Name</p>
                  <p className="font-medium">{booking.user.firstName} {booking.user.lastName}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity Information */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Validity</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Valid From</span>
                <span className="font-medium">{formatDate(booking.validity.valid_from)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Valid Until</span>
                <span className="font-medium">{formatDate(booking.validity.valid_until)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={booking.validity.is_expired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                  {booking.validity.is_expired ? 'EXPIRED' : 'VALID'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </MobileLayout>
  )
}
