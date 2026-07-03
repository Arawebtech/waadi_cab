"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MobileLayout } from "@/components/mobile-layout"
import { MapPin, Car, Calendar, CreditCard, ArrowRight } from "lucide-react"

export default function BookPassPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    fromState: "",
    toState: "",
    border: "",
    carType: "",
    date: "",
    passType: "",
  })

  const states = [
    "Maharashtra",
    "Gujarat",
    "Karnataka",
    "Tamil Nadu",
    "Rajasthan",
    "Haryana",
    "Punjab",
    "Uttar Pradesh",
  ]

  const carTypes = [
    { value: "5+1", label: "5+1 Seater", price: 200, description: "Small car/SUV" },
    { value: "6+1", label: "6+1 Seater", price: 300, description: "Medium SUV" },
    { value: "7+1", label: "7+1 Seater", price: 400, description: "Large SUV/Van" },
  ]

  const passTypes = [
    { value: "daily", label: "Daily Pass", multiplier: 1, description: "Valid for 24 hours" },
    { value: "weekly", label: "Weekly Pass", multiplier: 3.5, description: "Valid for 7 days" },
    { value: "monthly", label: "Monthly Pass", multiplier: 10, description: "Valid for 30 days" },
  ]

  const calculatePrice = () => {
    const carType = carTypes.find((c) => c.value === formData.carType)
    const passType = passTypes.find((p) => p.value === formData.passType)
    if (carType && passType) {
      return Math.round(carType.price * passType.multiplier)
    }
    return 0
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      const bookingData = {
        ...formData,
        price: calculatePrice(),
        id: Date.now().toString(),
      }
      localStorage.setItem("currentBooking", JSON.stringify(bookingData))
      router.push("/payment")
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.fromState && formData.toState && formData.border
      case 2:
        return formData.carType
      case 3:
        return formData.date
      case 4:
        return formData.passType
      default:
        return false
    }
  }

  return (
    <MobileLayout title="Book Pass" showBackButton backHref="/dashboard">
      <div className="px-4 py-6">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of 4</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 4) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Route Selection */}
        {currentStep === 1 && (
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                Select Route
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mobile-form-group">
                <Label className="text-sm font-medium text-gray-700">From State</Label>
                <Select
                  value={formData.fromState}
                  onValueChange={(value) => setFormData({ ...formData, fromState: value })}
                >
                  <SelectTrigger className="mobile-input">
                    <SelectValue placeholder="Select origin state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mobile-form-group">
                <Label className="text-sm font-medium text-gray-700">To State</Label>
                <Select
                  value={formData.toState}
                  onValueChange={(value) => setFormData({ ...formData, toState: value })}
                >
                  <SelectTrigger className="mobile-input">
                    <SelectValue placeholder="Select destination state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mobile-form-group">
                <Label className="text-sm font-medium text-gray-700">Border Checkpoint</Label>
                <Select value={formData.border} onValueChange={(value) => setFormData({ ...formData, border: value })}>
                  <SelectTrigger className="mobile-input">
                    <SelectValue placeholder="Select border checkpoint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkpoint-1">Main Highway Border</SelectItem>
                    <SelectItem value="checkpoint-2">Express Route Border</SelectItem>
                    <SelectItem value="checkpoint-3">Secondary Route Border</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Vehicle Type */}
        {currentStep === 2 && (
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Car className="h-5 w-5 mr-2 text-blue-600" />
                Vehicle Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.carType}
                onValueChange={(value) => setFormData({ ...formData, carType: value })}
                className="space-y-4"
              >
                {carTypes.map((car) => (
                  <div key={car.value} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={car.value} id={car.value} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor={car.value} className="font-medium cursor-pointer">
                              {car.label}
                            </Label>
                            <p className="text-sm text-gray-600">{car.description}</p>
                          </div>
                          <span className="text-lg font-bold text-blue-600">₹{car.price}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Date Selection */}
        {currentStep === 3 && (
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Travel Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mobile-form-group">
                <Label className="text-sm font-medium text-gray-700">Select Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  className="mobile-input"
                  required
                />
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your pass will be valid from the selected date. Make sure to plan your travel
                  accordingly.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Pass Type */}
        {currentStep === 4 && (
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                Pass Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.passType}
                onValueChange={(value) => setFormData({ ...formData, passType: value })}
                className="space-y-4"
              >
                {passTypes.map((pass) => (
                  <div key={pass.value} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={pass.value} id={pass.value} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor={pass.value} className="font-medium cursor-pointer">
                              {pass.label}
                            </Label>
                            <p className="text-sm text-gray-600">{pass.description}</p>
                          </div>
                          <span className="text-sm text-gray-500">{pass.multiplier}x</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              {formData.carType && formData.passType && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-800">Total Amount:</span>
                    <span className="text-2xl font-bold text-green-600">₹{calculatePrice()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex space-x-4 mt-6">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1 mobile-button">
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
            className={`mobile-button ${currentStep === 1 ? "w-full" : "flex-1"}`}
          >
            {currentStep === 4 ? "Proceed to Payment" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </MobileLayout>
  )
}
