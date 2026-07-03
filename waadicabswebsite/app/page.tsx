import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Car, 
  Clock, 
  Shield, 
  MapPin, 
  Phone, 
  Star,
  Users,
  CreditCard,
  HeadphonesIcon
} from "lucide-react"

const features = [
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Book a cab anytime, day or night. Our drivers are always ready to serve you."
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "All our drivers are verified and vehicles are regularly maintained for your safety."
  },
  {
    icon: CreditCard,
    title: "Easy Payment",
    description: "Multiple payment options including cash, UPI, and online payments."
  },
  {
    icon: HeadphonesIcon,
    title: "Customer Support",
    description: "Dedicated support team available to help you with any queries or concerns."
  }
]

const carTypes = [
  {
    name: "Hatchback",
    description: "Perfect for city rides",
    capacity: "4 Passengers",
    rate: "₹10/km"
  },
  {
    name: "Sedan",
    description: "Comfortable for longer trips",
    capacity: "4 Passengers",
    rate: "₹12/km"
  },
  {
    name: "SUV",
    description: "Spacious for family trips",
    capacity: "6 Passengers",
    rate: "₹15/km"
  },
  {
    name: "Tempo Traveller",
    description: "Ideal for group travel",
    capacity: "12+ Passengers",
    rate: "₹20/km"
  }
]

const testimonials = [
  {
    name: "Rahul Sharma",
    text: "Excellent service! The driver was punctual and the car was very clean. Highly recommended.",
    rating: 5
  },
  {
    name: "Priya Verma",
    text: "I use Waadi Cabs regularly for my office commute. Always reliable and affordable.",
    rating: 5
  },
  {
    name: "Mohammed Asif",
    text: "Great experience for our family trip to Alwar. The driver was very professional.",
    rating: 5
  }
]

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-secondary text-secondary-foreground py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
                Your Trusted <span className="text-primary">Cab Service</span> in Nuh
              </h1>
              <p className="text-lg md:text-xl text-secondary-foreground/80 mb-8">
                Book affordable and reliable cab services with Waadi Cabs. Available 24/7 for local and outstation trips in Delhi, Alwar, and surrounding areas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/booking">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                    <Car className="mr-2 h-5 w-5" />
                    Book a Cab Now
                  </Button>
                </Link>
                <a href="tel:9518410151">
                  <Button size="lg" variant="outline" className="border-white bg-white text-black hover:bg-white/90 w-full sm:w-auto">
                    <Phone className="mr-2 h-5 w-5" />
                    Call: 9518410151
                  </Button>
                </a>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Waadi Cabs?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We are committed to providing you with the best cab service experience in the region.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                      <feature.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Car Types Section */}
        <section className="py-16 md:py-24 bg-muted">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Fleet</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Choose from our wide range of well-maintained vehicles for any occasion.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {carTypes.map((car) => (
                <Card key={car.name} className="overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="h-40 bg-secondary flex items-center justify-center">
                    <Car className="h-20 w-20 text-primary" />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-1">{car.name}</h3>
                    <p className="text-muted-foreground text-sm mb-3">{car.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {car.capacity}
                      </div>
                      <span className="font-semibold text-primary">{car.rate}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/booking">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Book Your Ride
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Read reviews from our satisfied customers across the region.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name} className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4">&quot;{testimonial.text}&quot;</p>
                    <p className="font-semibold">{testimonial.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-secondary text-secondary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Book Your Ride?</h2>
            <p className="text-secondary-foreground/80 max-w-2xl mx-auto mb-8">
              Experience comfortable and reliable cab service with Waadi Cabs. Book now and travel stress-free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/booking">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Book Online
                </Button>
              </Link>
              <a href="tel:9518410151">
                <Button size="lg" variant="outline" className="border-white bg-white text-black hover:bg-white/90">
                  <Phone className="mr-2 h-5 w-5" />
                  9518410151
                </Button>
              </a>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-secondary-foreground/70">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Delhi Alwar Road, Nuh, Opposite Malik Hospital, Near Indian Oil Petrol Pump</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
