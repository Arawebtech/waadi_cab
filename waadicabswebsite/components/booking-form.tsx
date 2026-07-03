"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Car, 
  Users, 
  MapPin, 
  Calendar, 
  Clock, 
  Phone, 
  User,
  Mail,
  CheckCircle2
} from "lucide-react"

const carTypes = [
  {
    id: "hatchback",
    name: "Hatchback",
    description: "Swift, WagonR, i10",
    capacity: 4,
    rate: 10,
    baseFare: 100
  },
  {
    id: "sedan",
    name: "Sedan",
    description: "Dzire, Etios, Amaze",
    capacity: 4,
    rate: 12,
    baseFare: 150
  },
  {
    id: "suv",
    name: "SUV",
    description: "Innova, Ertiga, Scorpio",
    capacity: 6,
    rate: 15,
    baseFare: 200
  },
  {
    id: "tempo",
    name: "Tempo Traveller",
    description: "12-15 Seater",
    capacity: 15,
    rate: 20,
    baseFare: 500
  }
]

interface BookingFormProps {
  onSubmit: (data: BookingData) => void
}

export interface BookingData {
  name: string
  email: string
  phone: string
  pickup: string
  destination: string
  date: string
  time: string
  carType: string
  passengers: number
  distance: number
  notes: string
  totalAmount: number
}

export function BookingForm({ onSubmit }: BookingFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    pickup: "",
    destination: "",
    date: "",
    time: "",
    carType: "sedan",
    passengers: 2,
    distance: 10,
    notes: ""
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedCar = carTypes.find(c => c.id === formData.carType) || carTypes[1]
  const totalAmount = selectedCar.baseFare + (formData.distance * selectedCar.rate)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format"
    if (!formData.phone.trim()) newErrors.phone = "Phone is required"
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = "Enter a valid 10-digit phone number"
    if (!formData.pickup.trim()) newErrors.pickup = "Pickup location is required"
    if (!formData.destination.trim()) newErrors.destination = "Destination is required"
    if (!formData.date) newErrors.date = "Date is required"
    if (!formData.time) newErrors.time = "Time is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit({
        ...formData,
        totalAmount
      })
    }
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your 10-digit phone number"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className={`pl-10 ${errors.phone ? "border-destructive" : ""}`}
              />
            </div>
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Trip Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Trip Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickup">Pickup Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
                <Input
                  id="pickup"
                  placeholder="Enter pickup address"
                  value={formData.pickup}
                  onChange={(e) => handleChange("pickup", e.target.value)}
                  className={`pl-10 ${errors.pickup ? "border-destructive" : ""}`}
                />
              </div>
              {errors.pickup && <p className="text-sm text-destructive">{errors.pickup}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                <Input
                  id="destination"
                  placeholder="Enter destination address"
                  value={formData.destination}
                  onChange={(e) => handleChange("destination", e.target.value)}
                  className={`pl-10 ${errors.destination ? "border-destructive" : ""}`}
                />
              </div>
              {errors.destination && <p className="text-sm text-destructive">{errors.destination}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`pl-10 ${errors.date ? "border-destructive" : ""}`}
                />
              </div>
              {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  className={`pl-10 ${errors.time ? "border-destructive" : ""}`}
                />
              </div>
              {errors.time && <p className="text-sm text-destructive">{errors.time}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="distance">Estimated Distance (km)</Label>
              <Input
                id="distance"
                type="number"
                min="1"
                value={formData.distance}
                onChange={(e) => handleChange("distance", parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="passengers">Number of Passengers</Label>
            <Input
              id="passengers"
              type="number"
              min="1"
              max={selectedCar.capacity}
              value={formData.passengers}
              onChange={(e) => handleChange("passengers", parseInt(e.target.value) || 1)}
            />
            <p className="text-sm text-muted-foreground">
              Maximum {selectedCar.capacity} passengers for {selectedCar.name}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Car Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Select Your Car
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.carType}
            onValueChange={(value) => handleChange("carType", value)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {carTypes.map((car) => (
              <div key={car.id} className="relative">
                <RadioGroupItem
                  value={car.id}
                  id={car.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={car.id}
                  className="flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Car className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{car.name}</h4>
                      {formData.carType === car.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{car.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {car.capacity} seats
                      </span>
                      <span className="font-semibold text-primary">₹{car.rate}/km</span>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any special requirements or instructions..."
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card className="bg-secondary text-secondary-foreground">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Fare Estimate</h3>
              <div className="space-y-1 text-sm text-secondary-foreground/80">
                <p>Base Fare: ₹{selectedCar.baseFare}</p>
                <p>Distance ({formData.distance} km x ₹{selectedCar.rate}/km): ₹{formData.distance * selectedCar.rate}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-secondary-foreground/70">Total Amount</p>
              <p className="text-3xl font-bold text-primary">₹{totalAmount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        Proceed to Payment
      </Button>
    </form>
  )
}
