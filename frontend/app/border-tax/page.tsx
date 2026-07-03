"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MobileLayout } from "@/components/mobile-layout"
import { useToast } from "@/components/ui/use-toast"
import { borderTaxAPI, bookingAPI, validationAPI, historyAPI, tokenManager, type State, type VehicleType, type District, type Plan, type BookingRequest, type BookingValidationRequest } from "@/lib/api"
import { useMaintenanceContext } from "@/components/maintenance-provider"
import { BorderTaxMaintenance } from "@/components/border-tax-maintenance"
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import PaymentIntegration from "@/components/payment-integration"
import { useAuth } from "@/components/auth-provider"
import journeyLogger from "@/lib/journeyLogger"

export default function BorderTaxPage() {
  const router = useRouter()
  const { toast } = useToast()
  const maintenanceContext = useMaintenanceContext()
  const { user } = useAuth()

  // Form data
  const [formData, setFormData] = useState({
    visitingStateId: "",
    visitingStateName: "",
    vehicleNumber: "",
    vehicleTypeId: "",
    vehicleTypeName: "",
    whatsappNumber: "",
    entryBorderId: "",
    entryBorderName: "",
    planId: "",
    planType: "",
    fromDate: "",
    uptoDate: "",
  })

  // Debug: Log form data changes
  useEffect(() => {
    console.log('📊 Form data updated:', formData)
  }, [formData])

  // Dropdown options
  const [states, setStates] = useState<State[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [plans, setPlans] = useState<Plan[]>([])

  // Loading states
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingVehicleTypes, setLoadingVehicleTypes] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Amount calculation
  const [calculatedAmount, setCalculatedAmount] = useState(0)
  const [baseAmount, setBaseAmount] = useState(0)
  const [paymentGatewayFee, setPaymentGatewayFee] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  // Get platform fee from maintenance context (which already has app settings)
  const platformFee = maintenanceContext?.platformFee || 20

  // Success state
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingId, setBookingId] = useState("")

  // Payment state
  const [showPayment, setShowPayment] = useState(false)
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState({
    vehicleNumber: "",
    whatsappNumber: ""
  })

  const [userInfo, setUserInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  })

  useEffect(() => {
    if (showPayment) {
      journeyLogger.checkoutOpened({
        sourceFile: 'border-tax/page.tsx',
        sourceFunction: 'useEffect showPayment',
        userId: user?._id,
        data: {
          amount: totalAmount,
          vehicleNumber: formData.vehicleNumber,
          visitingState: formData.visitingStateName,
          planType: formData.planType,
        },
      })
    }
  }, [showPayment])

  // Search functionality
  const [searchPaymentReference, setSearchPaymentReference] = useState("")
  const [searchResults, setSearchResults] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Search booking by payment reference
  const handleSearchPaymentReference = async () => {
    if (!searchPaymentReference.trim()) {
      toast({
        title: "Error",
        description: "Please enter a payment reference to search",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    setSearchResults(null)

    console.log('🔍 Frontend: Starting payment reference search:', {
      searchTerm: searchPaymentReference.trim(),
      trimmed: searchPaymentReference.trim(),
      length: searchPaymentReference.trim().length
    })

    try {
      const result = await bookingAPI.searchBookingByPaymentReference(searchPaymentReference.trim())
      
      console.log('📊 Frontend: Search result received:', {
        success: result.success,
        hasData: 'data' in result,
        message: result.message,
        fullResult: result
      })
      
      if (result.success && 'data' in result) {
        console.log('✅ Frontend: Booking found:', {
          bookingId: result.data.bookingId,
          paymentReference: result.data.payment_details?.payment_reference
        })
        setSearchResults(result.data)
        setShowSearchResults(true)
        toast({
          title: "Success",
          description: "Booking found successfully",
        })
      } else {
        console.log('❌ Frontend: No booking found:', {
          message: result.message,
          debug: (result as any).debug
        })
        toast({
          title: "Not Found",
          description: result.message || "No booking found with this payment reference",
          variant: "destructive",
        })
        setSearchResults(null)
        setShowSearchResults(false)
      }
    } catch (error) {
      console.error('❌ Frontend: Search error:', error)
      toast({
        title: "Error",
        description: "Failed to search booking. Please try again.",
        variant: "destructive",
      })
      setSearchResults(null)
      setShowSearchResults(false)
    } finally {
      setIsSearching(false)
    }
  }

  // Clear search results
  const clearSearch = () => {
    setSearchPaymentReference("")
    setSearchResults(null)
    setShowSearchResults(false)
  }

  // Define fetchStates function before hooks
  const fetchStates = async () => {
    try {
      setLoadingStates(true)
      const result = await borderTaxAPI.getStates()
      
      if (result.success && 'data' in result) {
        const activeStates = result.data.filter(state => state.is_active)
        console.log('🌍 States loaded with statecodes:', activeStates.map(s => ({ name: s.name, statecode: s.statecode })))
        setStates(activeStates)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load states. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStates(false)
    }
  }

  // Fetch last booking and prefill vehicle number and WhatsApp number on page load
  useEffect(() => {
    const fetchLastBooking = async () => {
      if (!user) {
        return
      }

      try {
        const result = await historyAPI.getBookings(1, 1)

        if (result.success && 'data' in result && result.data.length > 0) {
          const lastBooking = result.data[0]

          if (lastBooking.vehicle_number || lastBooking.whatsapp_number) {
            setFormData(prev => ({
              ...prev,
              ...(lastBooking.vehicle_number && { vehicleNumber: lastBooking.vehicle_number }),
              ...(lastBooking.whatsapp_number && { whatsappNumber: lastBooking.whatsapp_number })
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching last booking:', error)
      }
    }

    fetchLastBooking()
  }, [user])









  // Calculate amounts when plan is selected
  useEffect(() => {
    if (formData.planId && plans.length > 0) {
      calculateAmounts(formData.planId)
    }
  }, [formData.planId, plans])

  // Recalculate amounts when platform fee changes
  useEffect(() => {
    if (formData.planId && plans.length > 0) {
      calculateAmounts(formData.planId)
    }
  }, [platformFee])

  // Auto-set tax from date to today when component loads
  useEffect(() => {
    if (!formData.fromDate) {
      const today = new Date()
      const todayString = today.toISOString().split('T')[0] // Format: YYYY-MM-DD
      
      setFormData(prevFormData => ({
        ...prevFormData,
        fromDate: todayString
      }))
    }
  }, []) // Run only once on component mount

  // Auto-select first vehicle type when vehicle types are loaded
  useEffect(() => {
    if (vehicleTypes.length > 0 && formData.visitingStateId && !formData.vehicleTypeId) {
      console.log('🔄 Auto-selecting first vehicle type')
      // Get the first available vehicle type
      const firstVehicleType = vehicleTypes[0]
      
      if (firstVehicleType) {
        console.log('✅ First vehicle type:', firstVehicleType)
        const newFormData = {
          ...formData,
          vehicleTypeId: firstVehicleType._id,
          vehicleTypeName: firstVehicleType.name,
        }
        setFormData(newFormData)
        
        // Fetch plans for the selected vehicle type
        fetchPlans(firstVehicleType._id)
      }
    }
  }, [vehicleTypes, formData.visitingStateId, formData.vehicleTypeId])
  
  // Debug: Monitor vehicle type changes
  useEffect(() => {
    console.log('🔍 Vehicle Type State Changed:', {
      vehicleTypeId: formData.vehicleTypeId,
      vehicleTypeName: formData.vehicleTypeName,
      hasPlans: plans.length > 0,
      currentPlanId: formData.planId
    })
  }, [formData.vehicleTypeId, formData.vehicleTypeName, plans.length, formData.planId])
  
  // Effect to auto-select first plan when plans are loaded and vehicle type is set but no plan is selected
  useEffect(() => {
    if (plans.length > 0 && formData.vehicleTypeId && !formData.planId) {
      console.log('🎯 Auto-select effect triggered - plans loaded but no plan selected')
      console.log('📋 Available plans:', plans.map(p => ({ id: p._id, type: p.plan_type, amount: p.amount })))
      
      const firstPlan = plans[0]
      console.log('🎯 Selecting first plan:', firstPlan)
      
      // Set today's date as from date and calculate upto date
      const today = new Date()
      const todayString = today.toISOString().split('T')[0]
      const uptoDateString = calculateToDate(todayString, firstPlan.plan_type)
      
      setFormData(prev => ({
        ...prev,
        planId: firstPlan._id,
        planType: firstPlan.plan_type,
        fromDate: todayString,
        uptoDate: uptoDateString,
      }))
      
      // Calculate amounts
      const base = firstPlan.amount
      const platform = platformFee
      const gateway = Math.round(base * 0.02)
      const total = base + platform + gateway
      
      setBaseAmount(base)
      setPaymentGatewayFee(gateway)
      setTotalAmount(total)
      setCalculatedAmount(total)
      
      console.log('✅ Auto-selection via effect complete')
    }
  }, [plans, formData.vehicleTypeId, formData.planId])


  // Sort plans in ascending order: Daily, Day 1-20, Weekly, Monthly, Quarterly
  const sortPlans = (plans: any[]) => {
    return plans.sort((a, b) => {
      const planTypeA = a.plan_type.toLowerCase().trim()
      const planTypeB = b.plan_type.toLowerCase().trim()
      
      // Define order priority
      const getOrderValue = (planType: string) => {
        if (planType === 'daily') return 0
        if (planType.startsWith('day ')) {
          const dayNumber = parseInt(planType.replace('day ', ''))
          return dayNumber // Day 1 = 1, Day 2 = 2, etc.
        }
        if (planType === 'weekly') return 21
        if (planType === 'monthly') return 22
        if (planType === 'quarterly') return 23
        return 99 // Unknown plans go to end
      }
      
      return getOrderValue(planTypeA) - getOrderValue(planTypeB)
    })
  }

  // Calculate amounts based on selected plan
  const calculateAmounts = (planId: string) => {
    const selectedPlan = plans.find(plan => plan._id === planId)
    
    if (selectedPlan) {
      const base = selectedPlan.amount
      const platform = platformFee // Use dynamic platform fee from backend
      const gateway = Math.round(base * 0.02) // 2% payment gateway fee
      const total = base + platform + gateway
      
      setBaseAmount(base)
      setPaymentGatewayFee(gateway)
      setTotalAmount(total)
      setCalculatedAmount(total) // Keep for backward compatibility
    } else {
      // Reset amounts if no plan selected
      setBaseAmount(0)
      setPaymentGatewayFee(0)
      setTotalAmount(0)
      setCalculatedAmount(0)
    }
  }

  // Robust auto-selection function
  const autoSelectDefaultDistrict = useCallback((stateId: string, districtsList: District[]) => {
    const selectedState = states.find(state => state._id === stateId)
    
    if (!selectedState?.defaultEntryDistrict) {
      return
    }

    const defaultDistrict = districtsList.find(d => d._id === selectedState.defaultEntryDistrict?._id)
    if (!defaultDistrict) {
      return
    }
    
    // Use functional update to ensure we get the latest state
    setFormData(prevFormData => {
      // Only update if entryBorderId is empty
      if (prevFormData.entryBorderId) {
        return prevFormData
      }

      const newFormData = {
        ...prevFormData,
        entryBorderId: defaultDistrict._id,
        entryBorderName: defaultDistrict.name,
      }
      
      return newFormData
    })
  }, [states, toast])

  // Auto-select default entry district when districts are loaded
  useEffect(() => {
    if (districts.length > 0 && formData.visitingStateId && !formData.entryBorderId) {
      autoSelectDefaultDistrict(formData.visitingStateId, districts)
    }
  }, [districts, formData.visitingStateId, states, formData.entryBorderId, autoSelectDefaultDistrict])

  // Load states on component mount
  useEffect(() => {
    fetchStates()
  }, [])

  // Re-validate vehicle number when states are loaded (in case validation failed earlier)
  useEffect(() => {
    if (states.length > 0 && formData.vehicleNumber && formData.visitingStateId) {
      console.log('🔄 Re-validating vehicle number after states loaded:', formData.vehicleNumber)
      const error = validateVehicleNumber(formData.vehicleNumber)
      console.log('🔍 Re-validation result:', error)
      setValidationErrors(prev => ({ ...prev, vehicleNumber: error }))
    }
  }, [states, formData.vehicleNumber, formData.visitingStateId])

  // Show maintenance screen if app is offline (after all hooks)
  if (maintenanceContext.isMaintenanceMode && !maintenanceContext.isLoading) {
    return (
      <BorderTaxMaintenance
        title={maintenanceContext.maintenanceTitle}
        message={maintenanceContext.maintenanceMessage}
        estimatedReturnTime={maintenanceContext.estimatedReturnTime}
        onRetry={maintenanceContext.refetch}
        isRetrying={maintenanceContext.isLoading}
      />
    )
  }

  // Show loading screen while checking maintenance status
  if (maintenanceContext.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking app status...</p>
        </div>
      </div>
    )
  }

  const resetForm = () => {
    const emptyForm = {
      visitingStateId: "",
      visitingStateName: "",
      vehicleNumber: "",
      vehicleTypeId: "",
      vehicleTypeName: "",
      whatsappNumber: "",
      entryBorderId: "",
      entryBorderName: "",
      planId: "",
      planType: "",
      fromDate: "",
      uptoDate: "",
    }
    setFormData(emptyForm)
    setBaseAmount(0)
    setPaymentGatewayFee(0)
    setTotalAmount(0)
    setCalculatedAmount(0)
    setVehicleTypes([])
    setDistricts([])
    setPlans([])
    setValidationErrors({
      vehicleNumber: "",
      whatsappNumber: ""
    })
    
    toast({
      title: "Form Reset",
      description: "All form data has been cleared.",
    })
  }


  const fetchVehicleTypesAndDistricts = async (stateId: string) => {
    try {
      setLoadingVehicleTypes(true)
      setLoadingDistricts(true)
      
      // Fetch both vehicle types and districts in parallel
      const [vehicleTypesResult, districtsResult] = await Promise.all([
        borderTaxAPI.getVehicleTypes(stateId),
        borderTaxAPI.getDistricts(stateId)
      ])
      
      if (vehicleTypesResult.success) {
        const activeVehicleTypes = vehicleTypesResult.data.filter(vt => vt.is_active)
        setVehicleTypes(activeVehicleTypes)
      } else {
        toast({
          title: "Error",
          description: vehicleTypesResult.message,
          variant: "destructive",
        })
      }

      if (districtsResult.success) {
        const activeDistricts = districtsResult.data.filter(district => district.is_active)
        setDistricts(activeDistricts)
        
        // Auto-select default district after districts are loaded
        autoSelectDefaultDistrict(stateId, activeDistricts)
      } else {
        toast({
          title: "Error",
          description: districtsResult.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load vehicle types and districts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingVehicleTypes(false)
      setLoadingDistricts(false)
    }
  }

  const fetchPlans = async (vehicleTypeId: string) => {
    console.log('📋 fetchPlans called with vehicleTypeId:', vehicleTypeId)
    console.log('📊 Current formData.planId:', formData.planId)
    
    try {
      setLoadingPlans(true)
      console.log('⏳ Fetching plans from API...')
      
      const result = await borderTaxAPI.getPlans(vehicleTypeId)
      console.log('📡 Plans API response:', result)
      
      if (result.success) {
        const activePlans = result.data.filter(plan => plan.is_active)
        console.log('✅ Active plans:', activePlans)
        
        const sortedPlans = sortPlans(activePlans)
        console.log('📊 Sorted plans:', sortedPlans)
        
        setPlans(sortedPlans)
        
        // Auto-select first plan if no plan is currently selected
        if (sortedPlans.length > 0 && !formData.planId) {
          console.log('🎯 Auto-selecting first plan as no plan is currently selected')
          const firstPlan = sortedPlans[0]
          console.log('📋 First plan details:', firstPlan)
          
          // Set today's date as from date and calculate upto date
          const today = new Date()
          const todayString = today.toISOString().split('T')[0]
          const uptoDateString = calculateToDate(todayString, firstPlan.plan_type)
          
          console.log('📅 Date calculation:', {
            fromDate: todayString,
            uptoDate: uptoDateString,
            planType: firstPlan.plan_type
          })
          
          const newFormData = {
            ...formData,
            planId: firstPlan._id,
            planType: firstPlan.plan_type,
            fromDate: todayString,
            uptoDate: uptoDateString,
          }
          console.log('💾 Setting new form data with auto-selected plan:', newFormData)
          
          setFormData(newFormData)
          
          // Calculate amounts for auto-selected plan using the plan data directly
          // instead of relying on the plans state which might not be updated yet
          const base = firstPlan.amount
          const platform = platformFee
          const gateway = Math.round(base * 0.02)
          const total = base + platform + gateway
          
          console.log('💰 Calculated amounts:', {
            base,
            platform,
            gateway,
            total
          })
          
          setBaseAmount(base)
          setPaymentGatewayFee(gateway)
          setTotalAmount(total)
          setCalculatedAmount(total)
          
          console.log('✅ Auto-selection complete')
        } else {
          console.log('⚠️ Skipping auto-selection:', {
            hasPlans: sortedPlans.length > 0,
            alreadyHasPlan: !!formData.planId,
            currentPlanId: formData.planId
          })
        }
      } else {
        console.error('❌ Failed to fetch plans:', result.message)
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Error fetching plans:', error)
      toast({
        title: "Error",
        description: "Failed to load plans. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingPlans(false)
      console.log('⏳ Plans loading completed')
    }
  }

  const handleStateChange = (stateId: string) => {
    const selectedState = states.find(state => state._id === stateId)
    console.log('🌍 State selected:', { name: selectedState?.name, statecode: selectedState?.statecode })
    
    // Clear validation error when user makes changes
    setValidationError(null)
    
    if (selectedState) {
      const newFormData = {
        ...formData,
        visitingStateId: stateId,
        visitingStateName: selectedState.name,
        // Reset dependent fields
        vehicleTypeId: "",
        vehicleTypeName: "",
        entryBorderId: "",
        entryBorderName: "",
        planId: "",
        planType: "",
        fromDate: "",
        uptoDate: "",
      }
      setFormData(newFormData)
      
      // Clear dependent options
      setVehicleTypes([])
      setDistricts([])
      setPlans([])
      setCalculatedAmount(0)
      
      // Re-validate vehicle number with new state
      if (newFormData.vehicleNumber) {
        const error = validateVehicleNumber(newFormData.vehicleNumber, stateId)
        setValidationErrors(prev => ({ ...prev, vehicleNumber: error }))
      }
      
      // Fetch new data for selected state
      fetchVehicleTypesAndDistricts(stateId)
    }
  }

  const handleVehicleTypeChange = (vehicleTypeId: string) => {
    console.log('🚗 Vehicle type changed to:', {
      vehicleTypeId,
      currentFormData: formData,
      previousVehicleTypeId: formData.vehicleTypeId
    })
    
    const selectedVehicleType = vehicleTypes.find(vt => vt._id === vehicleTypeId)
    
    if (selectedVehicleType) {
      console.log('✅ Selected vehicle type details:', {
        id: selectedVehicleType._id,
        name: selectedVehicleType.name
      })
      
      // Clear dependent options first
      setPlans([])
      setCalculatedAmount(0)
      setBaseAmount(0)
      setPaymentGatewayFee(0)
      setTotalAmount(0)
      
      const newFormData = {
        ...formData,
        vehicleTypeId,
        vehicleTypeName: selectedVehicleType.name,
        // Reset dependent fields
        planId: "",
        planType: "",
        fromDate: "",
        uptoDate: "",
      }
      
      console.log('📝 New form data:', newFormData)
      console.log('🔄 Old planId:', formData.planId, '→ New planId:', newFormData.planId)
      
      // Use functional update to ensure state is properly cleared
      setFormData(prev => ({
        ...prev,
        vehicleTypeId,
        vehicleTypeName: selectedVehicleType.name,
        planId: "",
        planType: "",
        fromDate: "",
        uptoDate: "",
      }))
      
      console.log('🔄 Fetching plans for vehicle type:', vehicleTypeId)
      // Use setTimeout to allow state update to complete before fetching plans
      setTimeout(() => {
        fetchPlans(vehicleTypeId)
      }, 0)
    } else {
      console.error('❌ Vehicle type not found:', vehicleTypeId)
    }
  }

  const handlePlanChange = (planId: string) => {
    // Clear validation error when user makes changes
    setValidationError(null)
    
    const selectedPlan = plans.find(plan => plan._id === planId)
    if (selectedPlan) {
      // Always set today's date as from date when plan changes
      const today = new Date()
      const todayString = today.toISOString().split('T')[0] // Format: YYYY-MM-DD
      
      // Calculate upto date based on the selected plan
      const uptoDateString = calculateToDate(todayString, selectedPlan.plan_type)
      
      
      const newFormData = {
        ...formData,
        planId,
        planType: selectedPlan.plan_type,
        fromDate: todayString,
        uptoDate: uptoDateString,
      }
      setFormData(newFormData)
      
      // Calculate amounts
      calculateAmounts(planId)
    }
  }

  const calculateToDate = (fromDate: string, planType: string): string => {
    if (!fromDate) return ""
    
    const startDate = new Date(fromDate)
    let endDate = new Date(startDate)
    
    // Normalize planType to handle variations
    const normalizedPlanType = planType.toLowerCase().trim()
    
    // Handle daily plans with specific day numbers (day 1, day 2, etc.)
    if (normalizedPlanType.includes('daily') || normalizedPlanType.includes('day')) {
      // Extract day number if present (e.g., "day 1", "day 2", "daily 3")
      const dayMatch = normalizedPlanType.match(/(?:day|daily)\s*(\d+)/i)
      if (dayMatch) {
        const dayNumber = parseInt(dayMatch[1], 10)
        // For "day 1" = same day, "day 2" = 2 days total, "day 3" = 3 days total, etc.
        // Day 1: startDate to startDate (1 day)
        // Day 2: startDate to startDate + 1 day (2 days total)
        // Day 3: startDate to startDate + 2 days (3 days total)
        if (dayNumber === 1) {
          endDate = new Date(startDate) // Same day
        } else {
          endDate.setDate(startDate.getDate() + (dayNumber - 1)) // Add (dayNumber - 1) days
        }
      } else {
        // Default daily (same day)
        endDate = new Date(startDate)
      }
    } else {
      switch (normalizedPlanType) {
        case 'weekly':
        case 'week':
          // Add 6 days (total 7 days including start date)
          endDate.setDate(startDate.getDate() + 6)
          break
        case 'monthly':
        case 'month':
          // Add 1 month and subtract 1 day
          endDate.setMonth(startDate.getMonth() + 1)
          endDate.setDate(startDate.getDate() - 1)
          break
        case 'quarterly':
        case 'quarter':
          // Add 3 months and subtract 1 day
          endDate.setMonth(startDate.getMonth() + 3)
          endDate.setDate(startDate.getDate() - 1)
          break
        case 'yearly':
        case 'year':
          // Add 1 year and subtract 1 day
          endDate.setFullYear(startDate.getFullYear() + 1)
          endDate.setDate(startDate.getDate() - 1)
          break
        default:
          // Default to same day for unknown plan types
          endDate = new Date(startDate)
      }
    }
    
    return endDate.toISOString().split('T')[0]
  }

  const handleFromDateChange = (newFromDate: string) => {
    const newFormData = {
      ...formData,
      fromDate: newFromDate,
      uptoDate: formData.planType ? calculateToDate(newFromDate, formData.planType) : ""
    }
    setFormData(newFormData)
  }

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const getPlanDurationText = (planType: string) => {
    if (!planType) return 'Select plan to see duration'
    
    const normalizedPlanType = planType.toLowerCase().trim()
    
    // Handle daily plans with specific day numbers
    if (normalizedPlanType.includes('daily') || normalizedPlanType.includes('day')) {
      const dayMatch = normalizedPlanType.match(/(?:day|daily)\s*(\d+)/i)
      if (dayMatch) {
        const dayNumber = parseInt(dayMatch[1], 10)
        if (dayNumber === 1) {
          return 'Same day only'
        } else {
          return `${dayNumber} days total (including start date)`
        }
      } else {
        return 'Same day only'
      }
    }
    
    switch (normalizedPlanType) {
      case 'weekly':
      case 'week':
        return '7 days from start date'
      case 'monthly':
      case 'month':
        return '30 days from start date'
      case 'quarterly':
      case 'quarter':
        return '90 days from start date'
      case 'yearly':
      case 'year':
        return '365 days from start date'
      default:
        return 'Custom duration based on plan'
    }
  }

  const getPlanDurationDescription = (planType: string) => {
    if (!planType) return ''
    
    const normalizedPlanType = planType.toLowerCase().trim()
    
    // Handle daily plans with specific day numbers
    if (normalizedPlanType.includes('daily') || normalizedPlanType.includes('day')) {
      const dayMatch = normalizedPlanType.match(/(?:day|daily)\s*(\d+)/i)
      if (dayMatch) {
        const dayNumber = parseInt(dayMatch[1], 10)
        if (dayNumber === 1) {
          return 'Valid for same day only'
        } else {
          return `Valid for ${dayNumber} consecutive days (including start date)`
        }
      } else {
        return 'Valid for same day only'
      }
    }
    
    switch (normalizedPlanType) {
      case 'weekly':
      case 'week':
        return 'Valid for 7 consecutive days'
      case 'monthly':
      case 'month':
        return 'Valid for 30 consecutive days'
      case 'quarterly':
      case 'quarter':
        return 'Valid for 90 consecutive days'
      case 'yearly':
      case 'year':
        return 'Valid for 365 consecutive days'
      default:
        return 'Duration varies based on plan'
    }
  }

  const handleDistrictChange = (districtId: string) => {
    const selectedDistrict = districts.find(district => district._id === districtId)
    
    if (selectedDistrict) {
      const newFormData = {
        ...formData,
        entryBorderId: districtId,
        entryBorderName: selectedDistrict.name,
      }
      setFormData(newFormData)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Run validation before submission
    const vehicleError = validateVehicleNumber(formData.vehicleNumber)
    const phoneError = validatePhoneNumber(formData.whatsappNumber)
    
    setValidationErrors({
      vehicleNumber: vehicleError,
      whatsappNumber: phoneError
    })
    
    // If there are validation errors, don't submit
    if (vehicleError || phoneError) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      })
      return
    }
    
    if (!isFormValid()) {
      toast({
        title: "Error",
        description: "Please fill all required fields.",
        variant: "destructive",
      })
      return
    }

    if (totalAmount === 0) {
      toast({
        title: "Error",
        description: "Please select all required fields to calculate amount.",
        variant: "destructive",
      })
      return
    }

    // Validate booking data with backend before proceeding to payment
    setIsValidating(true)
    setValidationError(null) // Clear any previous errors
    
    try {
      const validationData: BookingValidationRequest = {
        visitingStateId: formData.visitingStateId,
        vehicleTypeId: formData.vehicleTypeId,
        planId: formData.planId,
        vehicleNumber: formData.vehicleNumber,
        whatsappNumber: formData.whatsappNumber,
        entryBorderId: formData.entryBorderId,
        fromDate: formData.fromDate,
        uptoDate: formData.uptoDate,
        frontendCalculatedAmount: totalAmount
      }

      console.log('🔍 Validating booking data with backend:', validationData)
      
      const validationResult = await validationAPI.validateBooking(validationData)
      console.log('🔍 Validation result received:', validationResult)
      
      if (!validationResult.success) {
        console.error('❌ Validation failed:', validationResult)
        
        // Handle specific validation errors - check if it's a BookingValidationResponse with errors
        if ('errors' in validationResult && validationResult.errors) {
          let errorMessage = ""
          
          if (validationResult.errors.amountMismatch) {
            errorMessage = `Amount Mismatch: Frontend ₹${validationResult.errors.frontendAmount}, Backend ₹${validationResult.errors.backendAmount}. Please refresh the page and try again.`
            console.log('🚨 Showing amount mismatch toast:', errorMessage)
            toast({
              title: "Amount Mismatch Detected",
              description: errorMessage,
              variant: "destructive",
            })
          } else if (validationResult.errors.vehicleTypeId) {
            errorMessage = `${validationResult.errors.vehicleTypeId as string} Please select the vehicle type again and pay.`
            console.log('🚨 Showing vehicle type error toast:', errorMessage)
            toast({
              title: "Invalid Vehicle Type",
              description: errorMessage,
              variant: "destructive",
            })
            
            // Clear vehicle type selection when validation fails
            const clearedFormData = {
              ...formData,
              vehicleTypeId: "",
              vehicleTypeName: "",
              planId: "",
              planType: "",
              fromDate: "",
              uptoDate: "",
            }
            setFormData(clearedFormData)
            
            // Clear dependent lists to force re-fetch
            setPlans([])
          } else if (validationResult.errors.planId) {
            errorMessage = `${validationResult.errors.planId as string} Please select the plan again and pay.`
            console.log('🚨 Showing plan error toast:', errorMessage)
            toast({
              title: "Invalid Plan",
              description: errorMessage,
              variant: "destructive",
            })
            
            // Clear plan selection when plan validation fails
            const clearedFormData = {
              ...formData,
              planId: "",
              planType: "",
              fromDate: "",
              uptoDate: "",
            }
            setFormData(clearedFormData)
            
            // Clear plans list to force re-fetch
            setPlans([])
          } else if (validationResult.errors.visitingStateId) {
            errorMessage = `${validationResult.errors.visitingStateId as string} Please select the state again and pay.`
            console.log('🚨 Showing state error toast:', errorMessage)
            toast({
              title: "Invalid State",
              description: errorMessage,
              variant: "destructive",
            })
            
            // Clear state selection when validation fails
            const clearedFormData = {
              ...formData,
              visitingStateId: "",
              visitingStateName: "",
              vehicleTypeId: "",
              vehicleTypeName: "",
              entryBorderId: "",
              entryBorderName: "",
              planId: "",
              planType: "",
              fromDate: "",
              uptoDate: "",
            }
            setFormData(clearedFormData)
            
            // Clear all dependent lists to force re-fetch
            setVehicleTypes([])
            setDistricts([])
            setPlans([])
          } else if (validationResult.errors.vehicleNumber) {
            errorMessage = `${validationResult.errors.vehicleNumber as string} Please click the payment button again.`
            console.log('🚨 Showing vehicle number error toast:', errorMessage)
            toast({
              title: "Invalid Vehicle Number",
              description: errorMessage,
              variant: "destructive",
            })
          } else if (validationResult.errors.whatsappNumber) {
            errorMessage = `${validationResult.errors.whatsappNumber as string} Please click the payment button again.`
            console.log('🚨 Showing WhatsApp number error toast:', errorMessage)
            toast({
              title: "Invalid WhatsApp Number",
              description: errorMessage,
              variant: "destructive",
            })
          } else {
            errorMessage = `${validationResult.message || "Please check your form data and try again."} Please refresh the page and try again.`
            console.log('🚨 Showing generic error toast:', errorMessage)
            toast({
              title: "Validation Failed",
              description: errorMessage,
              variant: "destructive",
            })
          }
          
          // Set validation error state for visible display
          setValidationError(errorMessage)
        } else {
          const errorMessage = `${validationResult.message || "Please check your form data and try again."} Please refresh the page and try again.`
          console.log('🚨 Showing fallback error toast:', errorMessage)
          toast({
            title: "Validation Failed",
            description: errorMessage,
            variant: "destructive",
          })
          setValidationError(errorMessage)
        }
        return
      }

      console.log('✅ Validation successful:', validationResult.data)
      
      // Update the amount with the validated amount from backend
      if (validationResult.data?.validatedAmount && validationResult.data.validatedAmount !== totalAmount) {
        console.log(`💰 Amount updated: Frontend ₹${totalAmount} → Backend ₹${validationResult.data.validatedAmount}`)
        setCalculatedAmount(validationResult.data.validatedAmount)
        setBaseAmount(validationResult.data.validatedAmount)
        setPaymentGatewayFee(validationResult.data.validatedAmount * 0.02)
      }
      
    } catch (error) {
      console.error('❌ Validation API error:', error)
      const errorMessage = "Unable to validate booking data. Please check your connection and click the payment button again."
      console.log('🚨 Showing API error toast:', errorMessage)
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      })
      setValidationError(errorMessage)
      return
    } finally {
      setIsValidating(false)
    }
    
    // Set user info for payment 
    setUserInfo({
      firstName: user?.phoneNumber || formData.whatsappNumber,
      lastName: "Name", 
      email: `${formData.whatsappNumber}@${formData.vehicleNumber}`,
      phone: formData.whatsappNumber
    })

    journeyLogger.productSelected({
      sourceFile: 'border-tax/page.tsx',
      sourceFunction: 'handleSubmit',
      userId: user?._id,
      data: {
        visitingState: formData.visitingStateName,
        vehicleNumber: formData.vehicleNumber,
        vehicleType: formData.vehicleTypeName,
        planType: formData.planType,
        amount: totalAmount,
        fromDate: formData.fromDate,
        uptoDate: formData.uptoDate,
      },
    })

    journeyLogger.checkoutSubmitted({
      sourceFile: 'border-tax/page.tsx',
      sourceFunction: 'handleSubmit',
      userId: user?._id,
      data: { amount: totalAmount },
    })

    // Show payment component
    setShowPayment(true)
  }

  const handlePaymentSuccess = (paymentResponse: any) => {
    toast({
      title: "Payment Successful!",
      description: "Your border tax pass has been booked successfully.",
    })
    
    // Redirect to success page
    router.push(`/payment/success?txnid=${paymentResponse.txnId}`)
  }

  const handlePaymentFailure = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    })
    
    // Go back to form
    setShowPayment(false)
  }

  const validateVehicleNumber = (vehicleNumber: string, visitingStateId?: string) => {
    if (!vehicleNumber) return "Vehicle number is required"
    
    // Check length (should be 8, 9 or 10 characters)
    if (vehicleNumber.length < 8 || vehicleNumber.length > 10) {
      return "Vehicle number must be 8, 9 or 10 characters long"
    }
    
    // Check if at least one alphabet is present
    const alphabetCount = (vehicleNumber.match(/[A-Za-z]/g) || []).length
    if (alphabetCount < 1) {
      return "Vehicle number must contain at least one alphabet"
    }
    
    // Check if last 4 characters are numeric
    const lastFourChars = vehicleNumber.slice(-4)
    if (!/^\d{4}$/.test(lastFourChars)) {
      return "Last 4 characters must be numeric"
    }

    // Check if vehicle number starts with the selected state's statecode
    const stateId = visitingStateId || formData.visitingStateId
    if (stateId) {
      const selectedState = states.find(state => state._id === stateId)
      if (selectedState?.statecode) {
        const stateCode = selectedState.statecode.toUpperCase()
        const vehicleNumberUpper = vehicleNumber.toUpperCase()
        
        // Check if vehicle number starts with the state code (first 2 characters)
        const vehicleStateCode = vehicleNumberUpper.substring(0, 2)
        if (vehicleStateCode === stateCode) {
          return `Same state vehicles not allowed. Vehicle cannot start with ${stateCode}`
        }
      }
    }
    
    return ""
  }

  const validatePhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return "WhatsApp number is required"
    
    // Check if it's exactly 10 digits
    const digitsOnly = phoneNumber.replace(/\D/g, '')
    if (digitsOnly.length !== 10) {
      return "WhatsApp number must be exactly 10 digits"
    }
    
    // Check if it's a valid Indian mobile number (starts with 6, 7, 8, or 9)
    const firstDigit = digitsOnly[0]
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      return "WhatsApp number must start with 6, 7, 8, or 9"
    }
    
    return ""
  }

  const handleVehicleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to uppercase and remove spaces
    const value = e.target.value.toUpperCase().replace(/\s/g, '')
    console.log('🚙 Vehicle number changed to:', value)
    
    const newFormData = { ...formData, vehicleNumber: value }
    setFormData(newFormData)
    
    // Validate vehicle number
    const error = validateVehicleNumber(value)
    console.log('🔍 Vehicle number validation:', error)
    setValidationErrors(prev => ({ ...prev, vehicleNumber: error }))
  }

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 10 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    console.log('📱 WhatsApp number changed to:', value)
    
    const newFormData = { ...formData, whatsappNumber: value }
    setFormData(newFormData)
    
    // Validate phone number
    const error = validatePhoneNumber(value)
    console.log('🔍 Phone number validation:', error)
    setValidationErrors(prev => ({ ...prev, whatsappNumber: error }))
  }

  const isFormValid = () => {
    // Basic field validation
    const hasRequiredFields = (
      formData.visitingStateId &&
      formData.vehicleNumber &&
      formData.vehicleTypeId &&
      formData.whatsappNumber &&
      formData.entryBorderId &&
      formData.planId &&
      formData.fromDate &&
      formData.uptoDate &&
      totalAmount > 0 &&
      !validationErrors.vehicleNumber &&
      !validationErrors.whatsappNumber
    )

    // Date validation - removed as requested
    // Users can now select any date range

    return hasRequiredFields
  }

  // Success page component
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
          <h1 className="text-lg font-semibold">Booking Successful</h1>
        </div>

        {/* Success Content */}
        <div className="px-4 py-8 flex flex-col items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Created!</h2>
            <p className="text-gray-600 mb-4">Your border tax pass has been successfully booked.</p>
            
            <div className="bg-white rounded-lg border p-4 mb-6 text-left">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span className="font-medium">{bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">State:</span>
                  <span className="font-medium">{formData.visitingStateName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">{formData.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium">{formData.planType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Amount:</span>
                  <span className="font-medium">₹{baseAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fees:</span>
                  <span className="font-medium">₹{platformFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Gateway:</span>
                  <span className="font-medium">₹{paymentGatewayFee}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Total Amount:</span>
                    <span className="font-medium text-green-600">₹{totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 w-full max-w-sm">
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Go to Dashboard
              </Button>
              
              <Button
                onClick={() => {
                  setBookingSuccess(false)
                  setBookingId("")
                  // Reset form
                  setFormData({
                    visitingStateId: "",
                    visitingStateName: "",
                    vehicleNumber: "",
                    vehicleTypeId: "",
                    vehicleTypeName: "",
                    whatsappNumber: "",
                    entryBorderId: "",
                    entryBorderName: "",
                    planId: "",
                    planType: "",
                    fromDate: "",
                    uptoDate: "",
                  })
                  setBaseAmount(0)
                  setPaymentGatewayFee(0)
                  setTotalAmount(0)
                  setCalculatedAmount(0)
                  setVehicleTypes([])
                  setDistricts([])
                  setPlans([])
                }}
                variant="outline"
                className="w-full"
              >
                Create Another Booking
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Payment component
  if (showPayment) {
    return (
      <MobileLayout 
        title="Secure Payment" 
        showBackButton 
        backHref="#"
      >
        <div className="px-4 py-6">
          <PaymentIntegration
            amount={totalAmount}
            bookingData={{
              vehicleNumber: formData.vehicleNumber,
              visitingStateName: formData.visitingStateName,
              visitingStateId: formData.visitingStateId,
              vehicleTypeName: formData.vehicleTypeName,
              vehicleTypeId: formData.vehicleTypeId,
              planType: formData.planType,
              planId: formData.planId,
              entryBorderName: formData.entryBorderName,
              entryBorderId: formData.entryBorderId,
              fromDate: formData.fromDate,
              uptoDate: formData.uptoDate,
              whatsappNumber: formData.whatsappNumber
            }}
            userInfo={userInfo}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentFailure={handlePaymentFailure}
            disabled={isSubmitting}
          />
        </div>
      </MobileLayout>
    )
  }



  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-3">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Border Tax Payment</h1>
        </div>
        <button
          onClick={resetForm}
          className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded border hover:bg-gray-50 transition-colors"
        >
          Reset Form
        </button>
      </div>

  
      {/* Search Results */}
      {showSearchResults && searchResults && (
        <div className="px-4 py-4 bg-green-50 border-b border-green-200">
          <div className="max-w-md mx-auto">
            <h3 className="text-md font-semibold text-green-800 mb-3">📋 Booking Found</h3>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span className="font-medium">{searchResults.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">State:</span>
                  <span className="font-medium">{searchResults.visiting_state?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">{searchResults.vehicle_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-600">₹{searchResults.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    searchResults.status === 'paid' ? 'bg-green-100 text-green-800' : 
                    searchResults.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {searchResults.status?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valid From:</span>
                  <span className="font-medium">{new Date(searchResults.tax_from_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valid Until:</span>
                  <span className="font-medium">{new Date(searchResults.tax_upto_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Reference:</span>
                  <span className="font-medium font-mono text-xs">{searchResults.payment_details?.payment_reference}</span>
                </div>
                {searchResults.tax_slip_pdf?.filename && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax Slip:</span>
                    <span className="font-medium text-green-600">✅ Available</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <Button
                  type="button"
                  onClick={() => router.push(`/booking?id=${searchResults._id}`)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  View Full Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="px-4 py-3 pb-16">
        <form onSubmit={handleSubmit} className="space-y-3 max-w-full">
          
                     {/* Select Visiting State */}
           <div className="space-y-2 w-full">
             <Label className="text-sm font-medium text-gray-700 break-words leading-relaxed">
               Select Visiting State | विजिटिंग राज्य का चयन करें
             </Label>
             <Select
              value={formData.visitingStateId}
              onValueChange={handleStateChange}
              disabled={loadingStates}
             >
               <SelectTrigger className="w-full h-11 bg-blue-100 border-blue-200 text-sm px-3">
                <SelectValue placeholder={loadingStates ? "Loading states..." : "Select Visiting State"} />
               </SelectTrigger>
               <SelectContent>
                 {states.map((state) => (
                  <SelectItem key={state._id} value={state._id}>
                    {state.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
             

           </div>

           {/* Vehicle Number */}
           <div className="space-y-2 w-full">
             <Label className="text-sm font-medium text-gray-700 break-words leading-relaxed">
               Enter Your Vehicle Number | अपना वाहन नंबर दर्ज करें
             </Label>
             <Input
               type="text"
               placeholder="HR51Axxxx"
               value={formData.vehicleNumber}
               onChange={handleVehicleNumberChange}
               onBlur={() => {
                 // Validate on blur as well
                 const error = validateVehicleNumber(formData.vehicleNumber)
                 setValidationErrors(prev => ({ ...prev, vehicleNumber: error }))
               }}
               className={`w-full h-14 text-lg uppercase px-4 bg-yellow-50 border-2 focus:ring-2 focus:ring-yellow-200 font-bold text-gray-800 ${
                 validationErrors.vehicleNumber 
                   ? 'border-red-500 focus:border-red-500' 
                   : 'border-yellow-300 focus:border-yellow-500'
               }`}
               maxLength={10}
               onFocus={() => console.log('🚙 Vehicle number input focused, current value:', formData.vehicleNumber)}
             />
             <div className="flex justify-between items-center">
               <div className="text-xs text-red-600">{validationErrors.vehicleNumber}</div>
               <div className="text-xs text-gray-500">{formData.vehicleNumber.length}/10</div>
             </div>
           </div>

           {/* Seat Capacity */}
           <div className="space-y-2 w-full">
             <Label className="text-sm font-medium text-gray-700 break-words leading-relaxed">
              Select Vehicle Type | वाहन प्रकार का चयन करें
             </Label>
             <Select
              value={formData.vehicleTypeId}
              onValueChange={handleVehicleTypeChange}
              disabled={loadingVehicleTypes || !formData.visitingStateId}
             >
               <SelectTrigger className="w-full h-11 bg-blue-100 border-blue-200 text-sm px-3">
                <SelectValue placeholder={
                  !formData.visitingStateId ? "Select state first" :
                  loadingVehicleTypes ? "Loading vehicle types..." : 
                  "Select Vehicle Type"
                } />
               </SelectTrigger>
               <SelectContent>
                {vehicleTypes.map((vehicleType) => (
                  <SelectItem key={vehicleType._id} value={vehicleType._id}>
                    {vehicleType.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

           {/* WhatsApp Number */}
           <div className="space-y-2 w-full">
             <Label className="text-sm font-medium text-gray-700 break-words leading-relaxed">
               Enter Your WhatsApp Number | अपना व्हाट्सएप नंबर लिखें
             </Label>
             <Input
               type="tel"
               placeholder="9343xxxxxx"
               value={formData.whatsappNumber}
               onChange={handlePhoneNumberChange}
               onBlur={() => {
                 // Validate on blur as well
                 const error = validatePhoneNumber(formData.whatsappNumber)
                 setValidationErrors(prev => ({ ...prev, whatsappNumber: error }))
               }}
               className={`w-full h-14 text-lg px-4 bg-green-50 border-2 focus:ring-2 focus:ring-green-200 font-bold text-gray-800 ${
                 validationErrors.whatsappNumber 
                   ? 'border-red-500 focus:border-red-500' 
                   : 'border-green-300 focus:border-green-500'
               }`}
               maxLength={10}
               pattern="[0-9]*"
               inputMode="numeric"
               onFocus={() => console.log('📱 WhatsApp number input focused, current value:', formData.whatsappNumber)}
             />
             <div className="flex justify-between items-center">
               <div className="text-xs text-red-600">{validationErrors.whatsappNumber}</div>
               <div className="text-xs text-gray-500">{formData.whatsappNumber.length}/10</div>
             </div>
           </div>

                     {/* Entry Border */}
           <div className="space-y-2 w-full">
             <Label className="text-sm font-medium text-gray-700 break-words leading-relaxed">
               Select Entry Border | प्रवेश सीमा का चयन करें
             </Label>

             <Select
              value={formData.entryBorderId}
              onValueChange={handleDistrictChange}
              disabled={loadingDistricts || !formData.visitingStateId}
             >
               <SelectTrigger className="w-full h-11 bg-blue-100 border-blue-200 text-sm px-3">
                <SelectValue placeholder={
                  !formData.visitingStateId ? "Select state first" :
                  loadingDistricts ? "Loading districts..." : 
                  "Select Your Entry Border"
                } />
               </SelectTrigger>
               <SelectContent>
                {districts.map((district) => (
                  <SelectItem key={district._id} value={district._id}>
                    {district.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

           {/* Tax Mode */}
           <div className="space-y-2 w-full">
             <Label className="text-sm font-medium text-gray-700 break-words leading-relaxed">
              Select Tax Plan | टैक्स प्लान चुनें
             </Label>
             <Select
              value={formData.planId}
              onValueChange={handlePlanChange}
              disabled={loadingPlans || !formData.vehicleTypeId}
             >
               <SelectTrigger className="w-full h-11 bg-blue-100 border-blue-200 text-sm px-3">
                <SelectValue placeholder={
                  !formData.vehicleTypeId ? "Select vehicle type first" :
                  loadingPlans ? "Loading plans..." : 
                  "Select Tax Plan"
                } />
               </SelectTrigger>
               <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan._id} value={plan._id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{plan.plan_type} - ₹{plan.amount}</span>
                      <span className="text-xs text-gray-500">
                        {getPlanDurationDescription(plan.plan_type)}
                      </span>
                    </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

           {/* Date Fields */}
           <div className="space-y-3 w-full">
             {formData.planType && (
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                 <div className="text-sm font-medium text-blue-800 mb-1">
                   Selected Plan: {formData.planType}
                 </div>
                 <div className="text-xs text-blue-600">
                   {getPlanDurationDescription(formData.planType)}
                 </div>
               </div>
             )}
             
             <div className="grid grid-cols-2 gap-3 w-full">
               <div className="space-y-2 w-full">
                 <Label className="text-sm font-medium text-gray-700">
                   Tax From Date
                 </Label>
                 <div className="text-xs text-gray-600">कर प्राप्त तिथि</div>
                 <Input
                   type="date"
                   value={formData.fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  min={getTodayDate()}
                   className="w-full h-11 text-sm px-3"
                  disabled={!formData.planType}
                 />
                {!formData.planType && (
                  <div className="text-xs text-gray-500">Select tax plan first</div>
                )}
               </div>
               <div className="space-y-2 w-full">
                 <Label className="text-sm font-medium text-gray-700">
                   Tax Upto Date
                 </Label>
                 <div className="text-xs text-gray-600">कर अंतिम तिथि</div>
                 <Input
                   type="date"
                   value={formData.uptoDate}
                  className="w-full h-11 text-sm px-3 bg-gray-100"
                  readOnly
                  disabled
                 />
                <div className="text-xs text-gray-500">
                  {getPlanDurationText(formData.planType)}
                </div>
               </div>
             </div>
             
             {formData.fromDate && formData.uptoDate && (
               <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                 <div className="text-sm font-medium text-green-800 mb-1">
                   Validity Period Calculated
                 </div>
                 <div className="text-xs text-green-600">
                   From: {new Date(formData.fromDate).toLocaleDateString('en-IN', { 
                     weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                   })}
                 </div>
                 <div className="text-xs text-green-600">
                   To: {new Date(formData.uptoDate).toLocaleDateString('en-IN', { 
                     weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                   })}
                 </div>
               </div>
             )}
           </div>

           {/* Total Amount */}
           <div className="text-center py-3 w-full">
             <div className="text-base font-medium text-gray-700 mb-2">
               Total Amount to Pay
             </div>
             <div className="text-2xl font-bold text-green-600">
              {loadingPlans ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Calculating...
                </div>
              ) : (
                `₹${totalAmount}`
              )}
            </div>
            {formData.planType && (
              <div className="text-sm text-gray-600 mt-1">
                {formData.planType} plan for {formData.vehicleTypeName}
              </div>
            )}
            
            {/* Fee Breakdown */}
            {formData.planType && !loadingPlans && (
              <div className="mt-4 bg-white rounded-lg border p-3 text-left">
                <div className="text-sm font-medium text-gray-700 mb-2">Fee Breakdown</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Amount:</span>
                    <span>₹{baseAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fees:</span>
                    <span>₹{platformFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Gateway (2%):</span>
                    <span>₹{paymentGatewayFee}</span>
                  </div>
                  <div className="border-t pt-1 mt-1">
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span className="text-green-600">₹{totalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
           </div>

           {/* Validation Error Display */}
           {validationError && (
             <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
               <div className="flex items-start">
                 <div className="flex-shrink-0">
                   <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                   </svg>
                 </div>
                 <div className="ml-3">
                   <h3 className="text-sm font-medium text-red-800">
                     Validation Error
                   </h3>
                   <div className="mt-2 text-sm text-red-700">
                     {validationError}
                   </div>
                 </div>
               </div>
             </div>
           )}

           {/* Submit Button */}
           <Button
             type="submit"
             className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium mt-4"
            disabled={!isFormValid() || isSubmitting || isValidating}
           >
             {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Booking...
              </>
            ) : (
              "Proceed to Payment"
            )}
           </Button>

        </form>
      </div>
    </div>
  )
}
