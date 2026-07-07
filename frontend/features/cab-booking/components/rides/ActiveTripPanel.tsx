'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Car,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Shield,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DriverMapEmbed } from '../map/DriverMapEmbed';
import { StatusBadge } from '../Stepper';
import type { CabRideRequest } from '@/types/cab-booking';
import { useRoutePolyline } from '@/hooks/useRoutePolyline';
import { useConfirm } from '@/components/confirm';
import { TripChatPanel } from './TripChatPanel';

const PRE_TRIP = ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'OTP_VERIFICATION'];
const TRIP_ACTIVE = ['TRIP_STARTED'];

const STATUS_FLOW: { status: string; label: string }[] = [
  { status: 'DRIVER_ARRIVED', label: 'Arrived at Pickup' },
  { status: 'TRIP_STARTED', label: 'Start Trip (OTP)' },
  { status: 'TRIP_COMPLETED', label: 'Complete Trip' },
];

interface Props {
  ride: CabRideRequest;
  driverCoords?: { lat: number; lng: number } | null;
  onUpdateStatus: (status: string) => void;
  onVerifyOtp: (otp: string) => void;
  onCancel: () => void;
  loading?: boolean;
  otpLoading?: boolean;
}

export function ActiveTripPanel({
  ride,
  driverCoords,
  onUpdateStatus,
  onVerifyOtp,
  onCancel,
  loading,
  otpLoading,
}: Props) {
  const [otp, setOtp] = useState('');
  const [showChat, setShowChat] = useState(false);
  const legacyMigratedRef = useRef(false);
  const { confirmAction } = useConfirm();

  // Legacy rides may still be DRIVER_ASSIGNED — advance once automatically
  useEffect(() => {
    if (ride.status === 'DRIVER_ASSIGNED' && !legacyMigratedRef.current) {
      legacyMigratedRef.current = true;
      onUpdateStatus('DRIVER_ARRIVING');
    }
  }, [ride.status, onUpdateStatus]);

  const routeOrigin = useMemo(() => {
    if (TRIP_ACTIVE.includes(ride.status) || PRE_TRIP.includes(ride.status)) {
      return driverCoords ?? { lat: ride.pickup.lat, lng: ride.pickup.lng };
    }
    return { lat: ride.pickup.lat, lng: ride.pickup.lng };
  }, [ride.status, driverCoords, ride.pickup.lat, ride.pickup.lng]);

  const routeDestination = useMemo(() => {
    if (TRIP_ACTIVE.includes(ride.status)) return { lat: ride.drop.lat, lng: ride.drop.lng };
    if (PRE_TRIP.includes(ride.status)) return { lat: ride.pickup.lat, lng: ride.pickup.lng };
    return { lat: ride.drop.lat, lng: ride.drop.lng };
  }, [ride.status, ride.pickup.lat, ride.pickup.lng, ride.drop.lat, ride.drop.lng]);

  const { points: routePoints, distanceKm, durationMin } = useRoutePolyline(routeOrigin, routeDestination);

  const nextAction = STATUS_FLOW.find((s) => {
    if (s.status === 'DRIVER_ARRIVED') return ride.status === 'DRIVER_ARRIVING';
    if (s.status === 'TRIP_STARTED') return ride.status === 'OTP_VERIFICATION';
    if (s.status === 'TRIP_COMPLETED') return ride.status === 'TRIP_STARTED';
    return false;
  });

  const openNavigation = () => {
    const dest = TRIP_ACTIVE.includes(ride.status) ? ride.drop : ride.pickup;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`, '_blank');
  };

  const distanceLabel = TRIP_ACTIVE.includes(ride.status) ? 'Remaining' : 'To pickup';

  const isPaymentComplete = ['paid', 'paid_by_cash'].includes(ride.paymentStatus || '');
  const canCompleteTrip = ride.status === 'TRIP_STARTED' && isPaymentComplete;
  const paymentPendingDuringTrip = ride.status === 'TRIP_STARTED' && !isPaymentComplete;

  const handleStatusAction = async (status: string, label: string) => {
    await confirmAction({
      title: label,
      description: 'Confirm this step for the active trip.',
      confirmLabel: label,
      variant: status === 'TRIP_COMPLETED' ? 'success' : 'primary',
      action: () => onUpdateStatus(status),
    });
  };

  const handleCancelRide = async () => {
    await confirmAction({
      title: 'Cancel ride?',
      description: 'The customer will be notified. This action cannot be undone.',
      confirmLabel: 'Yes, cancel ride',
      cancelLabel: 'Keep ride',
      variant: 'danger',
      action: onCancel,
    });
  };

  const handleCompleteTrip = async () => {
    if (!isPaymentComplete) return;
    await confirmAction({
      title: 'Complete trip?',
      description: `Collect ₹${ride.fare.total} from the customer before completing.`,
      confirmLabel: 'Complete trip',
      cancelLabel: 'Not yet',
      variant: 'success',
      action: () => onUpdateStatus('TRIP_COMPLETED'),
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Active Trip</h2>
          <p className="text-sm text-muted-foreground">#{ride.rideNumber}</p>
        </div>
        <StatusBadge status={ride.status.toLowerCase()} />
      </div>

      <DriverMapEmbed
        className="overflow-hidden rounded-2xl border border-white/20 shadow-lg"
        style={{ height: 220 }}
        pickup={{ lat: ride.pickup.lat, lng: ride.pickup.lng }}
        drop={{ lat: ride.drop.lat, lng: ride.drop.lng }}
        driver={driverCoords ?? undefined}
        routePoints={routePoints}
      />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
          <p className="text-muted-foreground text-xs">{distanceLabel}</p>
          <p className="font-bold">{distanceKm?.toFixed(1) ?? ride.distanceKm} km</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
          <p className="text-muted-foreground text-xs">ETA</p>
          <p className="font-bold">{durationMin ?? ride.durationMin} min</p>
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4" />
          <span className="font-medium capitalize">{ride.customerName || 'Customer'}</span>
          {ride.customerPhone && (
            <a href={`tel:${ride.customerPhone}`} className="ml-auto text-blue-600">
              <Phone className="h-5 w-5" />
            </a>
          )}
        </div>
        <div className="flex gap-2 text-sm">
          <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{ride.pickup.address}</span>
        </div>
        <div className="flex gap-2 text-sm">
          <MapPin className="h-4 w-4 text-red-500 shrink-0" />
          <span>{ride.drop.address}</span>
        </div>
        <p className="text-lg font-bold pt-1">₹{ride.fare.total} · {ride.paymentMethod || 'cash'}</p>
      </div>

      {ride.status === 'OTP_VERIFICATION' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <p className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" /> Enter trip OTP from customer
          </p>
          <div className="flex gap-2">
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="4-digit OTP"
              maxLength={4}
              className="text-center text-lg tracking-widest"
            />
            <Button onClick={() => onVerifyOtp(otp)} disabled={otp.length < 4 || otpLoading}>
              {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowChat((v) => !v)}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {showChat ? 'Hide Chat' : 'Show Chat'}
          {showChat ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
        </Button>
        {showChat && <TripChatPanel rideId={ride._id} open={showChat} onClose={() => setShowChat(false)} />}
      </div>

      <div className="flex gap-2">
        {/* <Button variant="outline" className="flex-1" onClick={openNavigation}>
          <Navigation className="h-4 w-4 mr-2" /> Open Maps
        </Button> */}
      </div>

      {nextAction && ride.status !== 'OTP_VERIFICATION' && (
        <Button
          className="w-full h-12"
          onClick={() => handleStatusAction(nextAction.status, nextAction.label)}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : nextAction.label}
        </Button>
      )}

      {ride.status === 'TRIP_STARTED' && (
        <>
          {paymentPendingDuringTrip && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              Customer payment is pending. Trip cannot be completed.
            </p>
          )}
          <Button
            className="w-full h-12 bg-emerald-600 disabled:opacity-60"
            onClick={handleCompleteTrip}
            disabled={loading || !canCompleteTrip}
          >
            Complete Trip · Collect ₹{ride.fare.total}
          </Button>
        </>
      )}

      <Button variant="ghost" className="w-full text-red-600" onClick={handleCancelRide}>
        <AlertTriangle className="h-4 w-4 mr-2" /> Cancel Ride
      </Button>
    </motion.div>
  );
}
