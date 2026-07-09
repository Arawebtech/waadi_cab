"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MobileLayout } from "@/components/mobile-layout"
import { useLanguage } from "@/hooks/use-language"
import { useToast } from "@/components/ui/use-toast"
import { historyAPI, type HistoryBooking } from "@/lib/api"
import { downloadPdf, getPdfFilename } from "@/lib/pdf-download"
import { base_url } from "@/environment"
import { Search, Eye, Calendar, Loader2, Download, FileText } from "lucide-react"
import { useBookingRealtimeRefresh } from "@/hooks/use-booking-realtime"

export default function HistoryPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState("all")
  const [bookings, setBookings] = useState<HistoryBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingPdfs, setDownloadingPdfs] = useState<Set<string>>(new Set())
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1
  })

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true)
      // Only fetch paid bookings
      const result = await historyAPI.getBookings(1, 50, 'paid') // Fetch more to show all user data, only paid status
      
      if (result.success) {
        setBookings(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('History fetch error:', error)
      toast({
        title: "Error",
        description: "Failed to load booking history. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useBookingRealtimeRefresh(
    useCallback(({ booking, bookingId }) => {
      if (booking && booking.status === 'paid') {
        setBookings((prev) => {
          const id = String(booking._id || bookingId)
          const exists = prev.some((b) => b._id === id)
          if (exists) {
            return prev.map((b) => (b._id === id ? { ...b, ...booking } as HistoryBooking : b))
          }
          return [booking as HistoryBooking, ...prev]
        })
        return
      }
      fetchBookings()
    }, [fetchBookings])
  )

  const getPassStatus = (fromDate: string, uptoDate: string): string => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day for accurate comparison
    
    const startDate = new Date(fromDate)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(uptoDate)
    endDate.setHours(23, 59, 59, 999) // End of day
    
    if (today >= startDate && today <= endDate) {
      return "Active"
    } else if (today > endDate) {
      return "Expired"
    } else {
      return "Upcoming"
    }
  }

  const filteredHistory = bookings.filter((booking) => {
    // Search filter
    const matchesSearch =
      booking.visiting_state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.entry_border.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter
    let matchesFilter = true
    if (filter !== "all") {
      const passStatus = getPassStatus(booking.tax_from_date, booking.tax_upto_date)
      if (filter === "active") {
        matchesFilter = passStatus === "Active"
      } else if (filter === "expired") {
        matchesFilter = passStatus === "Expired"
      }
    }

    return matchesSearch && matchesFilter
  })

  const getStatusColor = (fromDate: string, uptoDate: string) => {
    const status = getPassStatus(fromDate, uptoDate)
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Expired":
        return "bg-red-100 text-red-800"
      case "Upcoming":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleBookingClick = (bookingId: string) => {
    router.push(`/booking?id=${encodeURIComponent(bookingId)}`)
  }

  const handlePdfDownload = async (booking: HistoryBooking, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    try {
      setDownloadingPdfs(prev => new Set(prev).add(booking._id));
      
      const pdfUrl = `${base_url}/bookings/${booking._id}/pdf`;
      const filename = getPdfFilename(booking);
      
      await downloadPdf({
        url: pdfUrl,
        filename: filename,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
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
      setDownloadingPdfs(prev => {
        const newSet = new Set(prev);
        newSet.delete(booking._id);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <MobileLayout title={t("history")}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading booking history...</p>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title={t("history")}>
      <div className="px-4 py-6">
        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by state, vehicle, or border..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-input pl-10"
            />
          </div>

          <div className="flex space-x-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="flex-1"
            >
              All Paid ({bookings.length})
            </Button>
            <Button
              variant={filter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("active")}
              className="flex-1"
            >
              Active ({bookings.filter(b => getPassStatus(b.tax_from_date, b.tax_upto_date) === "Active").length})
            </Button>
            <Button
              variant={filter === "expired" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("expired")}
              className="flex-1"
            >
              Expired ({bookings.filter(b => getPassStatus(b.tax_from_date, b.tax_upto_date) === "Expired").length})
            </Button>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-4">
          {filteredHistory.map((booking) => {
            const passStatus = getPassStatus(booking.tax_from_date, booking.tax_upto_date)
            
            return (
              <Card 
                key={booking._id} 
                className="mobile-card active:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleBookingClick(booking._id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">→ {booking.visiting_state.name}</h3>
                      <Badge className={getStatusColor(booking.tax_from_date, booking.tax_upto_date)} variant="secondary">
                        {passStatus}
                      </Badge>
                      {booking.tax_slip_pdf?.filename && (
                        <Badge className="bg-green-100 text-green-800" variant="secondary">
                          <FileText className="h-3 w-3 mr-1" />
                          PDF Ready
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {booking.tax_slip_pdf?.filename && (
                        <button
                          onClick={(e) => handlePdfDownload(booking, e)}
                          disabled={downloadingPdfs.has(booking._id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Download tax slip PDF"
                        >
                          {downloadingPdfs.has(booking._id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Vehicle:</span>
                      <span className="font-medium">{booking.vehicle_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{booking.seat_capacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{booking.tax_mode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Entry:</span>
                      <span>{booking.entry_border}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valid:</span>
                      <span>{formatDate(booking.tax_from_date)} - {formatDate(booking.tax_upto_date)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-gray-900">
                      <span>Amount:</span>
                      <span>₹{booking.amount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredHistory.length === 0 && !isLoading && (
          <Card className="mobile-card">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No paid passes found" : bookings.length === 0 ? "No paid bookings yet" : "No paid passes match your filter"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "Try adjusting your search terms" : 
                 bookings.length === 0 ? "Start by booking and paying for your first border tax pass" :
                 "Try a different filter or search term"}
              </p>
              <Button 
                onClick={() => {
                  if (searchTerm) {
                    setSearchTerm("")
                  } else if (filter !== "all") {
                    setFilter("all")
                  }
                }} 
                variant="outline" 
                className="mobile-button"
              >
                {searchTerm ? "Clear Search" : filter !== "all" ? "Show All" : "Book First Pass"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Show total count */}
        {!isLoading && bookings.length > 0 && (
          <div className="text-center text-sm text-gray-500 mt-6">
            Showing {filteredHistory.length} of {bookings.length} paid bookings
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
