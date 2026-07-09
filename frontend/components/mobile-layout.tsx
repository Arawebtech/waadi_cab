"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Receipt, History, User, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/components/auth-provider"
import { isPublicPage } from "@/lib/routes"

interface MobileLayoutProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  backHref?: string
  /** Hide bottom nav even when authenticated (e.g. full-screen flows) */
  hideBottomNav?: boolean
}

export function MobileLayout({
  children,
  title,
  showBackButton = false,
  backHref = "/",
  hideBottomNav = false,
}: MobileLayoutProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { isAuthenticated, isLoading } = useAuth()

  const navItems = [
    { href: "/dashboard", icon: Home, label: t("home") },
    { href: "/border-tax", icon: Receipt, label: t("tax") },
    { href: "/history", icon: History, label: t("history") },
    { href: "/profile", icon: User, label: t("profile") },
  ]

  const onPublicPage = isPublicPage(pathname)
  const shouldShowNav = !hideBottomNav && !onPublicPage && isAuthenticated && !isLoading
  const shouldShowHeader = shouldShowNav || (showBackButton && title)

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      {shouldShowHeader && (
        <header className="mobile-header sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            {showBackButton && (
              <Link href={backHref}>
                <Button variant="ghost" size="sm" className="touch-target p-2 shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            )}
            {title && (
              <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
            )}
          </div>
          <LanguageToggle />
        </header>
      )}

      <main className={shouldShowNav ? "pb-24" : "pb-6"}>{children}</main>

      {shouldShowNav && (
        <nav className="bottom-nav android-gesture-bar">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} className="flex-1">
                  <div className="flex flex-col items-center space-y-1 py-2 touch-target">
                    <item.icon
                      className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-400"}`}
                    />
                    <span
                      className={`text-xs ${isActive ? "text-blue-600 font-medium" : "text-gray-400"}`}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
