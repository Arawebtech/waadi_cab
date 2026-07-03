"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { MobileLayout } from "@/components/mobile-layout"
import { useLanguage } from "@/hooks/use-language"
import { useToast } from "@/components/ui/use-toast"
import { dashboardAPI, type DashboardResponse, type RecentActivity, type ActivePass, cabAPI, type CabBookingPublic, ApiError, tokenManager, historyAPI } from "@/lib/api"
import { downloadPdf, getPdfFilename } from '@/lib/pdf-download'
import { downloadInvoice } from '@/lib/invoice-generator'
import { Receipt, Calendar, CreditCard, Car, History, Bell, ChevronRight, ShoppingCart, Loader2, MapPin, Clock, Download, FileText, Share2, Youtube } from "lucide-react"
import { useMaintenanceContext } from "@/components/maintenance-provider"
import { DisabledBorderTaxButton } from "@/components/disabled-border-tax-button"
import VersionTracker from "@/components/version-tracker"
import { Capacitor } from "@capacitor/core"

export default function DashboardPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const maintenanceContext = useMaintenanceContext()
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardResponse['data'] | null>(null)
  const [cabBookings, setCabBookings] = useState<CabBookingPublic[]>([])
  const [downloadingPdfs, setDownloadingPdfs] = useState<Set<string>>(new Set())
  const [downloadingInvoices, setDownloadingInvoices] = useState<Set<string>>(new Set())
  
  // Check if border tax is in maintenance mode
  const isBorderTaxMaintenance = maintenanceContext.isMaintenanceMode && !maintenanceContext.isLoading

  // Get user data for version tracking
  const userData = tokenManager.getUserData()

  useEffect(() => {
    fetchDashboardData()
    fetchCabBookings()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const result = await dashboardAPI.fetchDashboard()
      
      if (result.success) {
        setDashboardData(result.data)
      } else {
        // If app is in maintenance mode, don't show error toast
        if (isBorderTaxMaintenance) {
          // Set fallback data for maintenance mode
          setDashboardData({
            summary: {
              totalActivePasses: 0,
              totalSpent: 0,
              totalSpentFormatted: "₹0",
              expiringSoonCount: 0
            },
            activePasses: [],
            recentActivity: [],
            user: {
              name: "User",
              phoneNumber: "",
              greeting: "Hello"
            }
          })
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      // If app is in maintenance mode, don't show error toast
      if (!isBorderTaxMaintenance) {
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCabBookings = async () => {
    try {
      const res = await cabAPI.listUnassigned(4)
      if ((res as ApiError).success === false) {
        // If app is in maintenance mode, set empty array instead of returning
        if (isBorderTaxMaintenance) {
          setCabBookings([])
        }
        return
      }
      setCabBookings((res as any).data || [])
    } catch (error) {
      // If app is in maintenance mode, set empty array instead of showing error
      if (isBorderTaxMaintenance) {
        setCabBookings([])
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'border-l-green-500 bg-green-50'
      case 'pending':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'expired':
        return 'border-l-red-500 bg-red-50'
      default:
        return 'border-l-blue-500 bg-blue-50'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pass created':
        return <Receipt className="h-4 w-4 text-blue-600" />
      case 'pass activated':
        return <Car className="h-4 w-4 text-green-600" />
      case 'payment successful':
        return <CreditCard className="h-4 w-4 text-green-600" />
      default:
        return <History className="h-4 w-4 text-gray-600" />
    }
  }

  const handleActivityClick = (bookingId: string) => {
    if (bookingId) {
      router.push(`/booking?id=${encodeURIComponent(bookingId)}`)
    }
  }

  const handlePdfDownload = async (activity: RecentActivity, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the activity click
    
    if (!activity.tax_slip_pdf?.filename) return

    try {
      setDownloadingPdfs(prev => new Set(prev).add(activity.id))
      
      const filename = getPdfFilename({
        bookingId: activity.bookingId,
        tax_slip_pdf: activity.tax_slip_pdf
      })
      const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/v1/bookings/${activity.id}/pdf`
      await downloadPdf({ url: pdfUrl, filename })
      
      toast({
        title: "Download Started",
        description: "Your tax slip PDF is being downloaded.",
      })
    } catch (error) {
      console.error('PDF download error:', error)
      toast({
        title: "Download Failed",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingPdfs(prev => {
        const newSet = new Set(prev)
        newSet.delete(activity.id)
        return newSet
      })
    }
  }

  const handleInvoiceDownload = async (activity: RecentActivity, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent triggering the activity click

    // Immediate feedback - log that button was clicked
    console.log('🔘 Invoice button clicked!', activity)
    
    try {
      console.log('📄 Starting invoice download for activity:', activity)
      console.log('📄 Activity ID:', activity.id)
      console.log('📄 Activity type:', activity.type)
      
      if (!activity.id) {
        console.error('❌ No activity ID found:', activity)
        throw new Error('Invalid booking ID')
      }
      
      setDownloadingInvoices(prev => new Set(prev).add(activity.id))
      
      // Show loading toast immediately
      toast({
        title: "Preparing Invoice",
        description: "Fetching booking details...",
        duration: 2000,
      })
      
      // Fetch full booking details
      console.log('🔍 Fetching booking details for ID:', activity.id)
      const result = await historyAPI.getBookingById(activity.id)
      
      console.log('📦 Booking fetch result:', result)
      console.log('📦 Result success:', (result as any).success)
      console.log('📦 Result data:', (result as any).data)
      
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from server')
      }

      if (!('success' in result) || !result.success) {
        const errorMsg = ('message' in result && result.message) || 'Failed to fetch booking details'
        console.error('❌ Booking fetch failed:', errorMsg)
        throw new Error(errorMsg)
      }

      if (!('data' in result) || !result.data) {
        throw new Error('No booking data received from server')
      }

      console.log('✅ Booking data received:', result.data)
      console.log('✅ Booking ID in data:', result.data.bookingId || result.data._id)
      
      // Wrap downloadInvoice in try-catch to handle any synchronous errors
      try {
        downloadInvoice(result.data)
        console.log('✅ Invoice opened successfully')
        
        // Delay toast to ensure window opens first
        setTimeout(() => {
          toast({
            title: "Invoice Ready",
            description: "Invoice opened in new window. Use Print > Save as PDF to download.",
          })
          setDownloadingInvoices(prev => {
            const newSet = new Set(prev)
            newSet.delete(activity.id)
            return newSet
          })
        }, 500)
      } catch (invoiceError) {
        console.error('❌ Invoice generation error:', invoiceError)
        console.error('❌ Error stack:', invoiceError instanceof Error ? invoiceError.stack : 'No stack')
        throw new Error(`Failed to generate invoice: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Invoice download error:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        activityId: activity.id
      })
      
      toast({
        title: "Error Downloading Invoice",
        description: error instanceof Error ? error.message : "Failed to generate invoice. Please try again or check the browser console for details.",
        variant: "destructive",
        duration: 5000,
      })
      
      setDownloadingInvoices(prev => {
        const newSet = new Set(prev)
        newSet.delete(activity.id)
        return newSet
      })
    }
  }

  const handleShareApp = async () => {
    const appUrl = "https://play.google.com/store/apps/details?id=com.MP.Waadi_App&hl=en"
    const shareText = "Check out Waadi App - Border Tax Payment made easy! Get your vehicle border tax passes quickly and securely."
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Share plugin for native apps
        const { Share } = await import('@capacitor/share')
        
        await Share.share({
          title: 'Waadi App - Border Tax Payment',
          text: shareText,
          url: appUrl,
          dialogTitle: 'Share Waadi App with friends'
        })
      } else {
        // Use Web Share API for web browsers
        if (navigator.share) {
          await navigator.share({
            title: 'Waadi App - Border Tax Payment',
            text: shareText,
            url: appUrl
          })
        } else {
          // Fallback to copying link to clipboard
          await navigator.clipboard.writeText(appUrl)
          toast({
            title: "Link Copied!",
            description: "App link has been copied to your clipboard.",
          })
        }
      }
    } catch (error: any) {
      // User cancelled the share - don't show error
      if (error.message !== 'cancelled') {
        console.error('Share error:', error)
        
        // Fallback: try to copy to clipboard
        try {
          await navigator.clipboard.writeText(appUrl)
          toast({
            title: "Link Copied!",
            description: "App link has been copied to your clipboard.",
          })
        } catch (clipboardError) {
          toast({
            title: "Share Failed",
            description: "Unable to share or copy link. Please try again.",
            variant: "destructive",
          })
        }
      }
    }
  }

  if (isLoading) {
    return (
      <>
        <MobileLayout title={t("dashboard")}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </MobileLayout>
      </>
    )
  }

  if (!dashboardData) {
    return (
      <>
        <MobileLayout title={t("dashboard")}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Failed to load dashboard data</p>
              <button 
                onClick={fetchDashboardData}
                className="text-blue-600 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </MobileLayout>
      </>
    )
  }

  // Provide fallback data if dashboardData is null
  const { summary, activePasses, recentActivity, user } = dashboardData || {
    summary: { totalActivePasses: 0, totalSpent: 0, totalSpentFormatted: "₹0", expiringSoonCount: 0 },
    activePasses: [],
    recentActivity: [],
    user: { name: "User", phoneNumber: "", greeting: "Hello" }
  }

  return (
    <>
      <MobileLayout title={t("dashboard")}>
        {/* Marquee Notice */}
        <div className="bg-amber-50 border-b border-amber-200 py-2 overflow-hidden relative w-full">
          <div className="flex animate-marquee whitespace-nowrap will-change-transform">
            <span className="text-sm font-medium text-amber-900 px-4 inline-block flex-shrink-0">
              Waadi is an agent and facilitator We do not issue the border tax slip. It is generated by Govt. portal. • 
            </span>
            <span className="text-sm font-medium text-amber-900 px-4 inline-block flex-shrink-0">
              Waadi is an agent and facilitator We do not issue the border tax slip. It is generated by Govt. portal. • 
            </span>
            <span className="text-sm font-medium text-amber-900 px-4 inline-block flex-shrink-0">
              Waadi is an agent and facilitator We do not issue the border tax slip. It is generated by Govt. portal. • 
            </span>
          </div>
        </div>
        
        <div className="px-4 pb-6">
        {/* Big Alert Button for Border Tax Payment */}
        {isBorderTaxMaintenance ? (
          <DisabledBorderTaxButton
            title={t("payBorderTaxAlert")}
            description="Service will be available at 5:00 AM. We are available 7 days a week."
          />
        ) : (
          <Link href="/border-tax">
            <Card className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 active:scale-95">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-1">{t("payBorderTaxAlert")}</h3>
                      <p className="text-blue-100 text-sm">{t("payBorderTaxDesc")}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                    <span className="text-white font-semibold text-sm">{t("payNow")}</span>
                    <ChevronRight className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{user.greeting}, {user.name}!</h2>
          <p className="text-gray-600">{t("readyForJourney")}</p>
        </div>

        {/* Tax Slip Ready - below greeting */}
        {recentActivity.find(a => a.tax_slip_pdf?.filename) && (
          (() => {
            const latestWithPdf = [...recentActivity]
              .filter(a => a.tax_slip_pdf?.filename)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
            if (!latestWithPdf) return null
            return (
              <Card className="mb-6 border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Tax Slip Ready</h3>
                        <p className="text-sm text-gray-600">Your latest tax slip is available for download</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handlePdfDownload(latestWithPdf, e as any)}
                      disabled={downloadingPdfs.has(latestWithPdf.id)}
                      className="px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                      title="Download Tax Slip"
                    >
                      {downloadingPdfs.has(latestWithPdf.id) ? (
                        <span className="inline-flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Downloading</span>
                      ) : (
                        <span className="inline-flex items-center"><Download className="h-4 w-4 mr-2" />Download PDF</span>
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })()
        )}

        {/* Maintenance Mode Indicator */}
        {isBorderTaxMaintenance && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-orange-800">Service Notice</h3>
                <p className="text-sm text-orange-700">
                  Border tax service is temporarily unavailable. Other features remain accessible.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cab Bookings Slider - Moved to top */}
        {cabBookings.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Available Cab Bookings</h3>
              <Link href="/cab-bookings" className="text-sm text-blue-600 font-medium">View All</Link>
            </div>
            <div className="flex space-x-3 overflow-x-auto pb-2 -mx-1 px-1">
              {cabBookings.map((b) => (
                <Card key={b._id} className="min-w-[320px] p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {b.trip_type === 'one_way' ? 'One Way' : 'Round Trip'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(b.start_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <div className="bg-blue-100 p-1.5 rounded-full flex-shrink-0">
                          <MapPin className="h-3 w-3 text-blue-600" />
                        </div>
                        <div className="text-sm font-semibold text-gray-900 leading-snug break-words">{b.from_location}</div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="bg-green-100 p-1.5 rounded-full flex-shrink-0">
                          <MapPin className="h-3 w-3 text-green-600" />
                        </div>
                        <div className="text-sm font-semibold text-gray-900 leading-snug break-words">{b.to_location}</div>
                      </div>
                    </div>
                    
                    {b.return_date && (
                      <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        Return: {new Date(b.return_date).toLocaleDateString()}
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-blue-200">
                      <Link 
                        href="/cab-bookings/view" 
                        className="inline-flex items-center text-sm text-blue-600 font-medium hover:text-blue-700" 
                        onClick={() => { if (typeof window !== 'undefined') sessionStorage.setItem('cab_view_id', b._id) }}
                      >
                        View Details
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Notifications for expiring passes */}
        {summary.expiringSoonCount > 0 && (
          <Card className="mobile-card mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Bell className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    {summary.expiringSoonCount} pass{summary.expiringSoonCount > 1 ? 'es' : ''} expiring soon
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">Tap to view all notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.totalActivePasses}</p>
                <p className="text-xs text-gray-600">{t("activePasses")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.totalSpentFormatted}</p>
                <p className="text-xs text-gray-600">{t("totalSpent")}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("quickActions")}</h3>
          <div className="space-y-3">
            <Link href="/insurance-inquiry">
              <Card className="p-4 active:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Get Car Insurance</p>
                      <p className="text-sm text-gray-600">Quick inquiry. We will contact you.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>
            </Link>
         
            <Link href="/history">
              <Card className="p-4 active:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <History className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t("viewHistory")}</p>
                      <p className="text-sm text-gray-600">{t("checkPastBookings")}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>
            </Link>

            {/* YouTube Channel Card */}
            <a 
              href="https://www.youtube.com/@wadicab" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="p-4 active:bg-gray-50 transition-colors hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <Youtube className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Watch Our YouTube Channel</p>
                      <p className="text-sm text-gray-600">Get tips, tutorials & updates</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>
            </a>
          </div>
        </div>

        {/* Active Passes */}
        {activePasses.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t("activePasses")}</h3>
              <Link href="/history" className="text-sm text-blue-600 font-medium">
                {t("viewAll")}
              </Link>
            </div>

            <div className="space-y-3">
              {activePasses.map((pass) => (
                <Card key={pass.id} className={`p-4 border-l-4 ${getStatusColor(pass.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">→ {pass.state}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(pass.status)}`}>
                        {pass.status}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">₹{pass.amount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{pass.passType} • {pass.vehicleInfo || pass.vehicleType}</span>
                    <span>
                      {t("expires")}: {(() => {
                        const expiry = (pass as any).validUpto || (pass as any).validUntil || (pass as any).expiresAt
                        const d = expiry ? new Date(expiry) : null
                        return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A'
                      })()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("recentActivity")}</h3>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-center space-x-3 p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => handleActivityClick(activity.id)}
                >
                  <div className="bg-gray-100 p-2 rounded-full">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.type}</p>
                    <p className="text-xs text-gray-600">{activity.description}</p>
                    {activity.tax_slip_pdf?.filename && (
                      <div className="flex items-center mt-1">
                        <FileText className="h-3 w-3 text-green-600 mr-1" />
                        <span className="text-xs text-green-600 font-medium">Tax Slip Ready</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleInvoiceDownload(activity, e)}
                      disabled={downloadingInvoices.has(activity.id)}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="Download Invoice"
                    >
                      {downloadingInvoices.has(activity.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Receipt className="h-4 w-4" />
                      )}
                    </button>
                    {activity.tax_slip_pdf?.filename && (
                      <button
                        onClick={(e) => handlePdfDownload(activity, e)}
                        disabled={downloadingPdfs.has(activity.id)}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="Download Tax Slip"
                      >
                        {downloadingPdfs.has(activity.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <span className="text-xs text-gray-500">{activity.timeAgo}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no data */}
        {activePasses.length === 0 && recentActivity.length === 0 && (
          <div className="text-center py-8">
            <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
              <Car className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
            <p className="text-gray-600 mb-4">Start by purchasing your first border tax pass</p>
            {isBorderTaxMaintenance ? (
              <button 
                disabled
                className="bg-gray-400 text-white px-6 py-2 rounded-lg font-medium cursor-not-allowed flex items-center mx-auto"
              >
                <Clock className="h-4 w-4 mr-2" />
                Available at 5:00 AM
              </button>
            ) : (
              <Link href="/border-tax">
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">
                  {t("payBorderTax")}
                </button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Version Tracking */}
      {userData && (
        <VersionTracker 
          userId={userData._id || userData.phoneNumber} 
          platform="web" 
        />
      )}

      </MobileLayout>

      {/* Floating Share Button - Outside MobileLayout to prevent clipping */}
      <button
        onClick={handleShareApp}
        className="fixed bottom-24 right-6 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl hover:from-blue-700 hover:to-blue-800 active:scale-95 transition-all duration-200 flex items-center justify-center group"
        style={{ 
          boxShadow: '0 10px 30px rgba(37, 99, 235, 0.4)',
        }}
        aria-label="Share App"
        title="Share Waadi App with your friends!"
      >
        <Share2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
      </button>
    </>
  )
}
