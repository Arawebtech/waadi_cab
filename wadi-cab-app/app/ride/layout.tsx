'use client';

import { CustomerRideProvider } from '@/features/customer-ride/context/CustomerRideProvider';
import { RideTabBar } from '@/features/customer-ride/components/RideTabBar';
import { useCustomerRide } from '@/features/customer-ride/context/CustomerRideProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function RideAuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useCustomerRide();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/ride/auth');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isAuthRoute) {
      router.replace('/ride/auth/login');
    }
    if (isAuthenticated && isAuthRoute) {
      router.replace('/ride');
    }
  }, [isAuthenticated, isLoading, isAuthRoute, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  if (!isAuthenticated && !isAuthRoute) return null;

  return (
    <>
      {children}
      {!isAuthRoute && <RideTabBar />}
    </>
  );
}

export default function RideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFixedHome = pathname === '/ride';

  return (
    <CustomerRideProvider>
      <div
        className={cn(isFixedHome ? 'h-[100dvh] overflow-hidden' : 'min-h-screen bg-white pb-20 text-slate-900')}
      >
        <RideAuthGate>{children}</RideAuthGate>
      </div>
    </CustomerRideProvider>
  );
}
