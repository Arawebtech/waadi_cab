'use client';

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MobileLayout } from "@/components/mobile-layout"
import { Car, Shield, Clock, CreditCard, ArrowRight, MapPin, Users, Star, Globe } from "lucide-react"
import Image from "next/image"
import { PushNotifications } from '@capacitor/push-notifications';
import { useEffect } from "react"

export default function LandingPage() {
  async function requestPushPermission() {
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
    } else {
      console.log('Push permission denied');
    }
  }
  useEffect(() => {
    requestPushPermission();
  }, []);
  console.log("LandingPage");

  return (
    <MobileLayout>
      <div className="h-screen flex flex-col px-6 pb-8 bg-gray-50">
        {/* Header with Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-16 h-16">
              <Image
                src="/logo.png"
                alt="Waadi Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">Waadi</span>
              <span className="text-lg font-semibold text-blue-600">Cab</span>
            </div>
          </div>

          {/* Tagline with divider */}
          <div className="w-16 h-0.5 bg-gray-800 mb-3"></div>
          <h2 className="text-center text-gray-800 font-medium">
            <span className="text-gray-800">India's Biggest</span>{" "}
            <span className="text-yellow-500 font-bold">B2B</span>{" "}
            <span className="text-gray-800">Taxi Marketplace</span>
          </h2>
        </div>

        {/* Main Content - Central Figure */}
        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          {/* Central Image */}
          <div className="relative w-72 h-80 mb-6">
            <Image
              src="/image.png"
              alt="Professional Driver"
              fill
              className="object-contain rounded-3xl"
              priority
            />
          </div>

          {/* Main Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3 text-center">
            Professional Taxi Services
          </h1>

          {/* Subtitle */}
          {/* <p className="text-gray-600 text-center leading-relaxed max-w-xs">
            Connect with verified drivers and book your ride instantly. Safe, reliable, and professional.
          </p> */}

          <p className="text-gray-600 text-center leading-relaxed max-w-xs">
            Disclaimer: Waadi is a private application owned by JAFRIDA (Waadi Tax & Insurance Solutions). It provides independent transport consultancy and is NOT an official government app. We have no affiliation with MoRTH, VAHAN, or any State Transport Department.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <Link href="/login" className="block">
              <Button className="w-full h-12 text-base font-semibold bg-gray-700 hover:bg-gray-800 text-white rounded-xl">
                Log in
              </Button>
            </Link>
            <Link href="/signup" className="block">
              <Button className="w-full h-12 text-base font-semibold bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>

        {/* Trust Indicators - Compact */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              <span>Verified</span>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}
