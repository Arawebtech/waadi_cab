"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { tokenManager, setGlobalLogoutHandler, authAPI } from '@/lib/api'
import { AuthLoading } from './auth-loading'
import { useToast } from '@/components/ui/use-toast'
import journeyLogger from '@/lib/journeyLogger'
import { isPublicPage } from '@/lib/routes'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: any | null
  logout: (showToast?: boolean) => Promise<void>
  refreshAuthState: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  const onPublicPage = isPublicPage(pathname)

  const refreshAuthState = useCallback(() => {
    setIsAuthenticated(tokenManager.isAuthenticated())
    setUser(tokenManager.getUserData())
  }, [])

  const logout = useCallback(async (showToast: boolean = true) => {
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
        title: 'Logged Out',
        description: 'You have been logged out successfully.',
      })
    }

    router.push('/login')
  }, [router, toast])

  useEffect(() => {
    setGlobalLogoutHandler(() => {
      void logout(true)
    })
  }, [logout])

  useEffect(() => {
    const authStatus = tokenManager.isAuthenticated()
    const userData = tokenManager.getUserData()
    const verificationData = tokenManager.getVerificationData()

    setIsAuthenticated(authStatus)
    setUser(userData)
    setIsLoading(false)

    const hasVerificationData = !!verificationData
    const isInAuthFlow =
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname === '/otp-verification'

    if (authStatus && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
      router.replace('/dashboard')
      return
    }

    if (!hasVerificationData) {
      if (authStatus && onPublicPage && !isInAuthFlow) {
        router.replace('/dashboard')
      } else if (!authStatus && !onPublicPage) {
        router.replace('/login')
      }
    }
  }, [pathname, router, onPublicPage])

  useEffect(() => {
    const handleStorageChange = () => {
      refreshAuthState()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [refreshAuthState])

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    logout,
    refreshAuthState,
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
