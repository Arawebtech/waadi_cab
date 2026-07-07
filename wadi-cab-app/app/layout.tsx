import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/components/query-provider';
import { SafeAreaProvider } from '@/components/safe-area-provider';
import { SafeAreaView } from '@/components/safe-area-view';
import { Toaster } from '@/components/ui/toaster';
import CapacitorInit from '@/components/capacitor-init';
import { ConfirmProvider } from '@/components/confirm';

export const metadata: Metadata = {
  title: 'Wadi Cab — Book a Ride',
  description: 'Book cabs, track your driver, and manage rides with Wadi Cab.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <SafeAreaProvider>
            <QueryProvider>
              <ConfirmProvider>
              <SafeAreaView edges={['top']} className="min-h-screen">
                {children}
              </SafeAreaView>
              <Toaster />
              <CapacitorInit />
              </ConfirmProvider>
            </QueryProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
