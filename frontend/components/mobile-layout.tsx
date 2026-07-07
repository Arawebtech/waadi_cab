"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Receipt, History, User, ArrowLeft, CarTaxiFront } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/components/auth-provider"
import { SafeAreaTop, SafeAreaBottom, SafeAreaView } from "@/components/safe-area-view"

interface MobileLayoutProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  backHref?: string
}

export function MobileLayout({ children, title, showBackButton = false, backHref = "/" }: MobileLayoutProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { isAuthenticated, isLoading } = useAuth()

  const navItems = [
    { href: "/dashboard", icon: Home, label: t("home") },
    { href: "/border-tax", icon: Receipt, label: t("tax") },
    { href: "/cab-booking", icon: CarTaxiFront , label: t("cab") },
    { href: "/history", icon: History, label: t("history") },
    { href: "/profile", icon: User, label: t("profile") },
  ]

  // List of all public/pre-login pages
  const publicPages = [
    "/",                    // Landing page
    "/login",              // Login page
    "/signup",             // Signup page
    "/otp-verification",   // OTP verification
    "/forgot-password",    // Forgot password
    "/reset-password",     // Reset password
    "/terms",              // Terms and conditions
    "/privacy",            // Privacy policy
    "/help",              // Help/Support
  ]

  const isPublicPage = publicPages.includes(pathname)

  // Show bottom nav only if user is authenticated and not on a public page
  const shouldShowNav = !isPublicPage && isAuthenticated && !isLoading

  return (
    <div className="mobile-container">
      {/* Mobile Header with safe area top */}
      {shouldShowNav && (
        <SafeAreaTop>
          <header className="mobile-header">
            <div className="flex items-center space-x-3">
              {showBackButton && (
                <Link href={backHref}>
                  <Button variant="ghost" size="sm" className="touch-target p-2">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <h1 className="text-lg font-semibold text-gray-900">{title || "Waadi"}</h1>
            </div>
            <LanguageToggle />
          </header>
        </SafeAreaTop>
      )}

      {/* Main Content with safe area bottom padding */}
      <SafeAreaView edges={['bottom']} className={`mobile-content ${shouldShowNav ? "pt-0 pb-24" : "pb-6"}`}>
        {children}
      </SafeAreaView>

      {/* Bottom Navigation with enhanced safe area handling */}
      {shouldShowNav && (
        <SafeAreaBottom>
          <nav className="bottom-nav android-gesture-bar">
            <div className="flex items-center justify-around">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || (item.href === '/cab-booking' && pathname.startsWith('/cab-booking'))
                return (
                  <Link key={item.href} href={item.href} className="flex-1">
                    <div className="flex flex-col items-center space-y-1 py-2 touch-target">
                      <item.icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                      <span className={`text-xs ${isActive ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </nav>
        </SafeAreaBottom>
      )}
    </div>
  )
}
