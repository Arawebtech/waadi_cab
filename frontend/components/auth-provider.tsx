"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { tokenManager, setGlobalLogoutHandler, authAPI } from '@/lib/api'
import { AuthLoading } from './auth-loading'
import { useToast } from '@/components/ui/use-toast'
import journeyLogger from '@/lib/journeyLogger'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: any | null
  logout: () => void | Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  // List of public pages that don't require authentication
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

  useEffect(() => {
    // Register global logout handler
    setGlobalLogoutHandler(() => logout(true))
    
    // Check authentication status on mount
    const checkAuth = () => {
      const authStatus = tokenManager.isAuthenticated()
      const userData = tokenManager.getUserData()
      const verificationData = tokenManager.getVerificationData()
      
      console.log('AuthProvider Debug:', {
        pathname,
        authStatus,
        hasUserData: !!userData,
        hasVerificationData: !!verificationData,
        isPublicPage,
        isInAuthFlow: pathname === "/login" || pathname === "/signup" || pathname === "/otp-verification"
      })
      
      setIsAuthenticated(authStatus)
      setUser(userData)
      setIsLoading(false)

      const isInAuthFlow = pathname === "/login" || pathname === "/signup" || pathname === "/otp-verification"
      const hasVerificationData = !!verificationData
      
      // If user is authenticated and visiting login/signup/landing, redirect to dashboard
      if (authStatus && (pathname === "/login" || pathname === "/signup" || pathname === "/")) {
        console.log('User is authenticated, redirecting to dashboard from:', pathname)
        router.replace("/dashboard")
        return
      }
      
      // Don't redirect if user is in OTP verification flow (has verification data)
      if (!hasVerificationData) {
        // If user is authenticated and on other public pages, redirect to dashboard
        if (authStatus && isPublicPage) {
          console.log('Redirecting authenticated user to dashboard')
          router.replace("/dashboard")
        }
        
        // If user is not authenticated and on a protected page, redirect to login
        if (!authStatus && !isPublicPage) {
          console.log('Redirecting to login')
          router.replace("/login")
        }
      }
    }

    checkAuth()
  }, [pathname, router, isPublicPage])

  // Listen for storage changes to update auth state
  useEffect(() => {
    const handleStorageChange = () => {
      const authStatus = tokenManager.isAuthenticated()
      const userData = tokenManager.getUserData()
      const verificationData = tokenManager.getVerificationData()
      
      setIsAuthenticated(authStatus)
      setUser(userData)
      
      // If verification data is cleared (OTP verification completed), check auth status
      if (!verificationData && authStatus) {
        // User has completed OTP verification and is now authenticated
        // Let the main useEffect handle the redirect
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])


  const logout = async (showToast: boolean = true) => {
    console.log('🚪 Logout initiated')
    const userId = tokenManager.getUserData()?._id

    try {
      await authAPI.logout()
    } catch {
      // Continue local logout even if API fails
    }

    journeyLogger.userLogout({
      sourceFile: 'auth-provider.tsx',
      sourceFunction: 'logout',
      userId,
    })

    tokenManager.clearTokens()
    setIsAuthenticated(false)
    setUser(null)
    
    if (showToast) {
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      })
    }
    
    router.push("/login")
  }

  // Force refresh auth state (useful after OTP verification)
  const refreshAuthState = () => {
    const authStatus = tokenManager.isAuthenticated()
    const userData = tokenManager.getUserData()
    
    setIsAuthenticated(authStatus)
    setUser(userData)
  }

  const value = {
    isAuthenticated,
    isLoading,
    user,
    logout,
    refreshAuthState
  }

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? <AuthLoading /> : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 