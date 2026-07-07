'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { History, Home, Wallet, CreditCard, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/mobile-layout';
import { ErrorState, Spinner } from '@/components/ui/states';
import { useToast } from '@/components/ui/use-toast';
import { extractErrorMessage } from '@/lib/client';
import { CabDriverProvider, useCabDriver } from '@/features/cab-booking/context/CabDriverProvider';
import { useConfirm } from '@/components/confirm';
import { DriverDashboard } from '@/features/cab-booking/components/dashboard/DriverDashboard';
import { VehicleSelectModal } from '@/features/cab-booking/components/dashboard/VehicleSelectModal';
import { OnboardingFlow } from '@/features/cab-booking/components/onboarding/OnboardingFlow';
import { RideRequestOverlay } from '@/features/cab-booking/components/rides/RideRequestOverlay';
import { ActiveTripPanel } from '@/features/cab-booking/components/rides/ActiveTripPanel';
import { SubscriptionPanel } from '@/features/cab-booking/components/subscription/SubscriptionPanel';
import { WalletPanel } from '@/features/cab-booking/components/wallet/WalletPanel';
import { TripHistoryPanel } from '@/features/cab-booking/components/history/TripHistoryPanel';
import { DriverProfilePanel } from '@/features/cab-booking/components/profile/DriverProfilePanel';
import {
  useAcceptRide,
  useActiveRide,
  useCabPlans,
  useCabProfile,
  useCabSubscription,
  useCabVerification,
  useDriverDashboard,
  useDriverLocation,
  useRejectRide,
  useSetActiveVehicle,
  useSetDriverAvailability,
  useSetDriverOnline,
  useTripHistory,
  useUpdateRideStatus,
  useVerifyTripOtp,
  useWalletTransactions,
  useDriverWallet,
} from '@/features/cab-booking/hooks';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/types/vehicle';

type Tab = 'home' | 'trips' | 'wallet' | 'plans' | 'profile';

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'trips', label: 'Trips', icon: History },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'plans', label: 'Plans', icon: CreditCard },
  { id: 'profile', label: 'Profile', icon: User },
];

interface DriverStatusState {
  isOnline: boolean;
  isAvailable: boolean;
  vehicleId: string | null;
  availabilityStatus: string;
}

function DriverAppContent({
  status,
  setStatus,
  vehicles,
}: {
  status: DriverStatusState;
  setStatus: React.Dispatch<React.SetStateAction<DriverStatusState>>;
  vehicles: Vehicle[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');
  const [tripFilter, setTripFilter] = useState('');
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [pendingGoOnline, setPendingGoOnline] = useState(false);

  const profileQ = useCabProfile();
  const verificationQ = useCabVerification();
  const subQ = useCabSubscription();
  const plansQ = useCabPlans();
  const dashboardQ = useDriverDashboard();
  const walletQ = useDriverWallet();
  const walletTxQ = useWalletTransactions();
  const tripHistoryQ = useTripHistory(tripFilter || undefined);
  const activeRideQ = useActiveRide();
  const setOnline = useSetDriverOnline();
  const setAvailability = useSetDriverAvailability();
  const setActiveVehicle = useSetActiveVehicle();
  const acceptRide = useAcceptRide();
  const rejectRide = useRejectRide();
  const updateRideStatus = useUpdateRideStatus();
  const verifyOtp = useVerifyTripOtp();

  const { coords, incomingRide, dismissIncomingRide } = useCabDriver();
  const { confirmAction } = useConfirm();

  const canGoOnline = Boolean(verificationQ.data?.canGoOnline);
  const blockReasons = verificationQ.data?.blockReasons ?? [];
  const subExpiry = subQ.data?.expiryDate ? new Date(subQ.data.expiryDate) : null;
  const isSubExpired = subExpiry ? subExpiry.getTime() < Date.now() : !subQ.data;

  const activeVehicle = useMemo(() => {
    if (!status.vehicleId) return profileQ.data?.activeVehicle ?? null;
    return vehicles.find((v) => v._id === status.vehicleId) ?? profileQ.data?.activeVehicle ?? null;
  }, [status.vehicleId, vehicles, profileQ.data?.activeVehicle]);

  const showVehiclePicker = vehicles.length > 1;

  const getPosition = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading ?? undefined, speed: pos.coords.speed ?? undefined };
    }
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
    );
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }, []);

  const goOnlineWithVehicle = async (vehicleId?: string) => {
    const coordinates = await getPosition();
    const loc = await setOnline.mutateAsync({
      isOnline: true,
      isAvailable: true,
      coordinates,
      vehicleId,
    });
    setStatus({
      isOnline: true,
      isAvailable: loc.isAvailable ?? true,
      vehicleId: loc.vehicleId ?? vehicleId ?? null,
      availabilityStatus: loc.isAvailable ? 'available' : 'busy',
    });
    toast({ title: 'You are online' });
    setVehicleModalOpen(false);
    setPendingGoOnline(false);
  };

  const handleToggleOnline = async () => {
    const next = !status.isOnline;
    if (next && (!canGoOnline || isSubExpired)) {
      const reason = blockReasons[0] || (isSubExpired ? 'Subscription expired' : 'Complete verification');
      toast({ title: 'Cannot go online', description: reason, variant: 'destructive' });
      setTab(isSubExpired ? 'plans' : 'profile');
      return;
    }

    if (!next) {
      try {
        const loc = await setOnline.mutateAsync({ isOnline: false });
        setStatus((s) => ({
          ...s,
          isOnline: false,
          isAvailable: false,
          vehicleId: loc.vehicleId ?? s.vehicleId,
          availabilityStatus: 'offline',
        }));
        toast({ title: 'You are offline' });
      } catch (e) {
        toast({ title: 'Error', description: extractErrorMessage(e), variant: 'destructive' });
      }
      return;
    }

    if (vehicles.length > 1 && !status.vehicleId && !profileQ.data?.activeVehicle) {
      setPendingGoOnline(true);
      setVehicleModalOpen(true);
      return;
    }

    try {
      await goOnlineWithVehicle(status.vehicleId || profileQ.data?.activeVehicle?._id);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { code?: string } } };
      if (err?.response?.data?.code === 'VEHICLE_SELECTION_REQUIRED') {
        setPendingGoOnline(true);
        setVehicleModalOpen(true);
        return;
      }
      toast({ title: 'Error', description: extractErrorMessage(e), variant: 'destructive' });
    }
  };

  const handleToggleAvailable = async () => {
    if (!status.isOnline) return;
    const next = !status.isAvailable;
    try {
      const loc = await setAvailability.mutateAsync(next);
      setStatus((s) => ({
        ...s,
        isAvailable: loc.isAvailable ?? next,
        availabilityStatus: loc.isAvailable ? 'available' : 'busy',
      }));
      toast({ title: next ? 'Available for rides' : 'Availability paused' });
    } catch (e) {
      toast({ title: 'Error', description: extractErrorMessage(e), variant: 'destructive' });
    }
  };

  const handleVehicleSelect = async (vehicleId: string, setDefault?: boolean) => {
    try {
      if (setDefault) await setActiveVehicle.mutateAsync(vehicleId);
      setStatus((s) => ({ ...s, vehicleId }));
      if (pendingGoOnline || status.isOnline) {
        await goOnlineWithVehicle(vehicleId);
      } else {
        setVehicleModalOpen(false);
        toast({ title: setDefault ? 'Default vehicle updated' : 'Vehicle selected' });
      }
    } catch (e) {
      toast({ title: 'Error', description: extractErrorMessage(e), variant: 'destructive' });
    }
  };

  const handleAccept = async (id: string) => {
    try {
      const accepted = await acceptRide.mutateAsync(id);
      const pickup = accepted?.pickup ?? incomingRide?.pickup;
      dismissIncomingRide(id);
      toast({ title: 'Ride accepted!', description: 'Navigating to pickup…' });
      // if (pickup?.lat != null && pickup?.lng != null) {
      //   window.open(
      //     `https://www.google.com/maps/dir/?api=1&destination=${pickup.lat},${pickup.lng}`,
      //     '_blank'
      //   );
      // }
    } catch (e) {
      toast({ title: 'Failed', description: extractErrorMessage(e), variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    const ok = await confirmAction({
      title: 'Reject ride request?',
      description: 'This ride will be offered to other nearby drivers.',
      confirmLabel: 'Reject',
      cancelLabel: 'Keep',
      variant: 'danger',
      action: async () => {
        dismissIncomingRide(id);
        try {
          await rejectRide.mutateAsync(id);
        } catch {
          /* ok */
        }
      },
    });
    if (!ok) return;
  };

  const activeRide = activeRideQ.data;

  if (!profileQ.data) return null;

  return (
    <>
      <VehicleSelectModal
        open={vehicleModalOpen}
        vehicles={vehicles}
        loading={setOnline.isPending || setActiveVehicle.isPending}
        onClose={() => { setVehicleModalOpen(false); setPendingGoOnline(false); }}
        onSelect={handleVehicleSelect}
      />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>
          {tab === 'home' && (
            activeRide ? (
              <ActiveTripPanel
                ride={activeRide}
                driverCoords={coords}
                loading={updateRideStatus.isPending}
                otpLoading={verifyOtp.isPending}
                onUpdateStatus={(s) => updateRideStatus.mutate({ rideId: activeRide._id, status: s })}
                onVerifyOtp={(otp) => verifyOtp.mutate({ rideId: activeRide._id, otp })}
                onCancel={() => updateRideStatus.mutate({ rideId: activeRide._id, status: 'CANCELLED' })}
              />
            ) : (
              <DriverDashboard
                profile={{ ...profileQ.data, activeVehicle: activeVehicle ?? profileQ.data.activeVehicle }}
                dashboard={dashboardQ.data}
                dashboardLoading={dashboardQ.isLoading}
                subscription={subQ.data}
                verification={verificationQ.data}
                isOnline={status.isOnline}
                isAvailable={status.isAvailable}
                onlineLoading={setOnline.isPending}
                availabilityLoading={setAvailability.isPending}
                canGoOnline={canGoOnline}
                subscriptionExpired={isSubExpired}
                blockReasons={blockReasons}
                availabilityStatus={status.availabilityStatus}
                coords={coords}
                showVehiclePicker={showVehiclePicker}
                onChangeVehicle={() => setVehicleModalOpen(true)}
                onToggleOnline={handleToggleOnline}
                onToggleAvailable={handleToggleAvailable}
              />
            )
          )}

          {tab === 'trips' && (
            <TripHistoryPanel
              rides={tripHistoryQ.data?.items}
              loading={tripHistoryQ.isLoading}
              filter={tripFilter}
              onFilterChange={setTripFilter}
            />
          )}

          {tab === 'wallet' && (
            <WalletPanel
              balance={walletQ.data?.balance ?? dashboardQ.data?.wallet.balance ?? 0}
              transactions={walletTxQ.data?.items}
              loading={walletQ.isLoading}
            />
          )}

          {tab === 'profile' && (
            <DriverProfilePanel
              profile={profileQ.data}
              verification={verificationQ.data}
              subscription={subQ.data}
              walletBalance={walletQ.data?.balance ?? dashboardQ.data?.wallet.balance}
              isOnline={status.isOnline}
              loading={profileQ.isLoading}
            />
          )}

          {tab === 'plans' && (
            <SubscriptionPanel
              subscription={subQ.data}
              plans={plansQ.data}
              loading={subQ.isLoading || plansQ.isLoading}
              onPurchase={() => router.push('/subscriptions')}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <RideRequestOverlay
        ride={incomingRide}
        onAccept={handleAccept}
        onReject={handleReject}
        accepting={acceptRide.isPending}
      />

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-xs transition-colors',
                tab === id ? 'text-slate-900 dark:text-white font-semibold' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', tab === id && 'text-emerald-600')} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

function DriverShell() {
  const profileQ = useCabProfile();
  const locationQ = useDriverLocation();
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<DriverStatusState>({
    isOnline: false,
    isAvailable: false,
    vehicleId: null,
    availabilityStatus: 'offline',
  });

  useEffect(() => {
    if (!locationQ.isSuccess) return;
    const loc = locationQ.data?.location;
    setStatus({
      isOnline: loc?.isOnline ?? false,
      isAvailable: loc?.isAvailable ?? false,
      vehicleId: loc?.vehicleId ?? profileQ.data?.activeVehicle?._id ?? null,
      availabilityStatus: locationQ.data?.availabilityStatus ?? 'offline',
    });
    setHydrated(true);
  }, [locationQ.isSuccess, locationQ.data, profileQ.data?.activeVehicle?._id]);

  const vehicles = profileQ.data?.vehicles ?? [];
  const activeBookingId = locationQ.data?.activeRide?._id ?? locationQ.data?.location?.bookingId ?? null;

  if (!hydrated && (locationQ.isLoading || profileQ.isLoading)) {
    return <Spinner label="Restoring driver status…" />;
  }

  return (
    <CabDriverProvider
      isOnline={status.isOnline}
      isAvailable={status.isAvailable}
      activeBookingId={activeBookingId}
    >
      <div className="px-4 pb-2 pt-2">
        <DriverAppContent status={status} setStatus={setStatus} vehicles={vehicles} />
      </div>
    </CabDriverProvider>
  );
}

export function CabBookingModule() {
  const profileQ = useCabProfile();
  const verificationQ = useCabVerification();
  const [showDashboard, setShowDashboard] = useState(false);

  const registrationStep = verificationQ.data?.registrationStep ?? profileQ.data?.user.cabBooking?.registrationStep ?? 1;
  const isOnboarded = registrationStep >= 4 || showDashboard;

  if (profileQ.isLoading || verificationQ.isLoading) {
    return (
      <MobileLayout title="Driver">
        <Spinner label="Loading driver app…" />
      </MobileLayout>
    );
  }

  if (profileQ.isError) {
    return (
      <MobileLayout title="Driver">
        <ErrorState message={extractErrorMessage(profileQ.error)} onRetry={() => profileQ.refetch()} />
      </MobileLayout>
    );
  }

  if (!isOnboarded) {
    return (
      <MobileLayout title="Driver Setup">
        <div className="px-4 pb-24 pt-2">
          <OnboardingFlow onComplete={() => setShowDashboard(true)} />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Driver">
      <DriverShell />
    </MobileLayout>
  );
}
