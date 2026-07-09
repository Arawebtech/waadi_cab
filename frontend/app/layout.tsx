import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { NetworkProvider } from '@/components/network-provider'
import { SafeAreaProvider } from '@/components/safe-area-provider'
import { LanguageProvider } from '@/components/language-provider'
import { NetworkStatusIndicator } from '@/components/network-status-indicator'
import { Toaster } from '@/components/ui/toaster'
import CapacitorInit from '@/components/capacitor-init'
import BookingRealtimeSync from '@/components/booking-realtime-sync'
import { MaintenanceProvider } from '@/components/maintenance-provider'
import { VersionCheck } from '@/components/version-check'

export const metadata: Metadata = {
  title: 'Waadi Cab - Border Pass Service',
  description: 'Digital solution for seamless border crossing. Book passes instantly and travel without hassle.',
  generator: 'v0.dev',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Must run before paint — prevents header/search overlap on Android */}
        <script src="/capacitor-safe-area-boot.js" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SafeAreaProvider>
            <LanguageProvider>
              <NetworkProvider>
                <MaintenanceProvider>
                  <AuthProvider>
                    <NetworkStatusIndicator />
                    <div className="app-shell min-h-screen w-full overflow-x-hidden">
                      <VersionCheck>{children}</VersionCheck>
                    </div>
                    <Toaster />
                    <CapacitorInit />
                    <BookingRealtimeSync />
                  </AuthProvider>
                </MaintenanceProvider>
              </NetworkProvider>
            </LanguageProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
