import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { NetworkProvider } from '@/components/network-provider'
import { SafeAreaProvider } from '@/components/safe-area-provider'
import { SafeAreaView } from '@/components/safe-area-view'
// import { ConnectivityScreen } from '@/components/connectivity-screen'
import { NetworkStatusIndicator } from '@/components/network-status-indicator'
import { Toaster } from '@/components/ui/toaster'
import CapacitorInit from '@/components/capacitor-init'
import { MaintenanceProvider } from '@/components/maintenance-provider'
import { VersionCheck } from '@/components/version-check'

export const metadata: Metadata = {
  title: 'Wadi Cab - Border Pass Service',
  description: 'Digital solution for seamless border crossing. Book passes instantly and travel without hassle.',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SafeAreaProvider>
            <NetworkProvider>
              <MaintenanceProvider>
                <AuthProvider>
                  {/* Network Status Indicator (Development Only) */}
                  <NetworkStatusIndicator />
                  
                  {/* Connectivity Blocking Screen */}
                  {/* <ConnectivityScreen /> */}
                  
                  {/* Main App Content with Safe Area and Version Check */}
                  <SafeAreaView edges={['top']} className="min-h-screen">
                    <VersionCheck>
                      {children}
                    </VersionCheck>
                  </SafeAreaView>
                  
                  <Toaster />
                  <CapacitorInit />
                </AuthProvider>
              </MaintenanceProvider>
            </NetworkProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
