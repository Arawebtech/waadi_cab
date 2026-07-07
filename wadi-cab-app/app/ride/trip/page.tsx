'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Star, Share2, Shield, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { InteractiveRideMap } from '@/features/customer-ride/components/InteractiveRideMap';
import { RideChatPanel } from '@/features/customer-ride/components/RideChatPanel';
import { PaymentSelectionSheet } from '@/features/customer-ride/components/PaymentSelectionSheet';
import { useRideDetail } from '@/features/customer-ride/hooks';
import { useRoutePolyline, haversineKm, estimateEtaMin } from '@/features/customer-ride/hooks/useRoutePolyline';
import { useDriverTracking } from '@/features/customer-ride/hooks/useDriverTracking';
import { connectCustomerSocket, joinRideRoom, onRideStatus } from '@/features/customer-ride/socket';
import { useCustomerRide } from '@/features/customer-ride/context/CustomerRideProvider';
import { RIDE_STATUS_LABELS, type Ride, type RideStatus } from '@/features/customer-ride/types';
import { customerBookingApi } from '@/features/customer-ride/api/booking';
import { customerPaymentApi } from '@/features/customer-ride/api/payment';
import { extractErrorMessage } from '@/features/customer-ride/api/client';
import { formatDriverName, driverInitial } from '@/features/customer-ride/utils/formatDriverName';
import { Share } from '@capacitor/share';
import { useConfirm } from '@/components/confirm';

const TERMINAL: RideStatus[] = ['TRIP_COMPLETED', 'CANCELLED', 'EXPIRED'];
const PRE_TRIP: RideStatus[] = ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'OTP_VERIFICATION'];
const TRIP_ACTIVE: RideStatus[] = ['TRIP_STARTED'];

function TripBackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Go back"
      className="absolute left-4 top-[max(16px,env(safe-area-inset-top))] z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg ring-1 ring-black/5 active:scale-95 transition-transform"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

function cancelledSubtitle(ride: Ride) {
  if (ride.cancelledBy === 'customer') return 'You cancelled this trip';
  if (ride.cancelledBy === 'driver') return 'Your driver cancelled this trip';
  return 'This trip was cancelled';
}

function CancelledTripScreen({
  ride,
  routePoints,
  onBack,
  onBookAgain,
}: {
  ride: Ride;
  routePoints: { lat: number; lng: number }[];
  onBack: () => void;
  onBookAgain: () => void;
}) {
  return (
    <div className="relative flex h-[100dvh] flex-col bg-white">
      <TripBackButton onBack={onBack} />

      <InteractiveRideMap
        className="h-[42vh] w-full shrink-0"
        pickup={ride.pickup}
        drop={ride.drop}
        routePoints={routePoints}
        fitRoute
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-9 w-9 text-red-500" strokeWidth={2} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Ride Cancelled</h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">{cancelledSubtitle(ride)}</p>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex gap-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pickup</p>
              <p className="font-medium text-slate-800">{ride.pickup.address}</p>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-800" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Destination</p>
              <p className="font-medium text-slate-800">{ride.drop.address}</p>
            </div>
          </div>
          {ride.fare?.total != null && (
            <div className="border-t border-slate-200 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estimated fare</p>
              <p className="text-xl font-bold text-slate-900">₹{ride.fare.total}</p>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3 pt-6">
          <button
            type="button"
            onClick={onBookAgain}
            className="w-full rounded-2xl bg-black py-4 text-base font-semibold text-white"
          >
            Book Another Ride
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-2xl border border-slate-200 py-4 text-base font-semibold text-slate-700"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripPage() {
  const router = useRouter();
  const params = useSearchParams();
  const rideId = params.get('id');
  const { setActiveRide } = useCustomerRide();
  const { data: ride, refetch } = useRideDetail(rideId);
  const [liveRide, setLiveRide] = useState<Ride | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [paymentDone, setPaymentDone] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [tripOtp, setTripOtp] = useState<string | null>(null);
  const { confirmAction } = useConfirm();

  const current = liveRide ?? ride;
  const isCancelled = current?.status === 'CANCELLED';
  const driverPos = useDriverTracking(
    rideId,
    Boolean(current && !TERMINAL.includes(current.status as RideStatus))
  );

  const { data: wallet } = useQuery({
    queryKey: ['customer', 'wallet'],
    queryFn: () => customerBookingApi.wallet(),
    enabled: current?.status === 'TRIP_STARTED' || current?.status === 'TRIP_COMPLETED',
  });

  const routeOrigin = useMemo(() => {
    if (!current) return null;
    if (TRIP_ACTIVE.includes(current.status as RideStatus) || PRE_TRIP.includes(current.status as RideStatus)) {
      return driverPos ?? current.pickup;
    }
    return current.pickup;
  }, [current, driverPos]);

  const routeDestination = useMemo(() => {
    if (!current) return null;
    if (TRIP_ACTIVE.includes(current.status as RideStatus)) return current.drop;
    if (PRE_TRIP.includes(current.status as RideStatus)) return current.pickup;
    return current.drop;
  }, [current]);

  const { points, distanceKm, durationMin } = useRoutePolyline(routeOrigin, routeDestination);
  const driverDistanceKm = driverPos && current?.pickup ? haversineKm(driverPos, current.pickup) : null;
  const driverEtaMin = driverDistanceKm != null ? estimateEtaMin(driverDistanceKm) : null;

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/ride');
    }
  };

  useEffect(() => {
    if (params.get('paid') === '1') setPaymentDone(true);
  }, [params]);

  useEffect(() => {
    if (current?.paymentStatus === 'paid' || current?.paymentStatus === 'paid_by_cash') setPaymentDone(true);
  }, [current?.paymentStatus]);

  useEffect(() => {
    if (!rideId) return;
    connectCustomerSocket();
    joinRideRoom(rideId);
    return onRideStatus((payload) => {
      if (payload.ride) {
        setLiveRide(payload.ride);
        setActiveRide(payload.ride);
        if (TERMINAL.includes(payload.ride.status as RideStatus)) refetch();
      }
    });
  }, [rideId, refetch, setActiveRide]);

  useEffect(() => {
    if (!rideId || !current) return;
    if (['OTP_VERIFICATION', 'TRIP_STARTED', 'TRIP_COMPLETED'].includes(current.status)) {
      customerBookingApi.getTripOtp(rideId).then(setTripOtp).catch(() => setTripOtp(null));
    }
  }, [rideId, current?.status]);

  async function cancelRide() {
    if (!rideId) return;
    await confirmAction({
      title: 'Cancel ride?',
      description: 'Your driver will be notified. You may be charged a cancellation fee if applicable.',
      confirmLabel: 'Yes, cancel',
      cancelLabel: 'Keep ride',
      variant: 'danger',
      action: async () => {
        await customerBookingApi.cancelBooking(rideId, 'Cancelled by customer');
        router.replace('/ride');
      },
    }).catch((err) => alert(extractErrorMessage(err)));
  }

  async function handlePayment(method: 'cash' | 'upi' | 'wallet') {
    if (!rideId || !current?.fare?.total) return;
    setPayLoading(true);
    try {
      if (method === 'upi') {
        await customerPaymentApi.startOnlinePayment(rideId);
        setPayLoading(false);
        return;
      }
      await customerPaymentApi.payForRide(rideId, method);
      setPaymentDone(true);
      refetch();
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setPayLoading(false);
    }
  }

  async function submitRating() {
    if (!rideId) return;
    await customerBookingApi.rateBooking(rideId, rating, review);
    router.replace('/ride/history');
  }

  async function shareInvoice() {
    if (!rideId) return;
    const invoice = await customerBookingApi.getInvoice(rideId);
    await Share.share({ title: 'Ride Invoice', text: JSON.stringify(invoice, null, 2) }).catch(() => {});
  }

  if (!rideId) return <p className="p-6">Missing ride</p>;
  if (!current) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading trip…</p>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <CancelledTripScreen
        ride={current}
        routePoints={points}
        onBack={goBack}
        onBookAgain={() => router.push('/ride')}
      />
    );
  }

  const canCancel = ['SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING'].includes(current.status);
  const needsPayment = !paymentDone && !current.rating?.score;
  const showPayment =
    needsPayment && (current.status === 'TRIP_STARTED' || current.status === 'TRIP_COMPLETED');
  const showRating = current.status === 'TRIP_COMPLETED' && paymentDone && !current.rating?.score;
  const driverDisplayName = formatDriverName(current.driver);
  const vehicleLabel =
    current.driver?.vehicle?.registrationNumber ||
    current.driver?.vehicle?.vehicleNumber ||
    current.vehicleTypeSlug;

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <div className="relative h-[42vh] min-h-[220px] shrink-0">
        <TripBackButton onBack={goBack} />
        <InteractiveRideMap
          className="h-full w-full"
          pickup={current.pickup}
          drop={current.drop}
          driver={driverPos}
          routePoints={points}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Trip status</p>
        <h1 className="text-2xl font-bold">{RIDE_STATUS_LABELS[current.status as RideStatus]}</h1>

        {(current.status === 'DRIVER_ASSIGNED' || current.status === 'DRIVER_ARRIVING') && (
          <p className="mt-1 text-sm text-emerald-600">
            {current.status === 'DRIVER_ASSIGNED'
              ? 'Your driver accepted the ride'
              : 'Your driver is heading to the pickup point'}
          </p>
        )}

        {PRE_TRIP.includes(current.status as RideStatus) &&
          current.status !== 'DRIVER_ASSIGNED' &&
          current.status !== 'DRIVER_ARRIVING' &&
          driverEtaMin != null && (
            <p className="mt-1 text-sm text-emerald-600">
              Driver {driverDistanceKm?.toFixed(1)} km away · ~{driverEtaMin} min
            </p>
          )}

        {current.status === 'DRIVER_ARRIVING' && driverEtaMin != null && (
          <p className="mt-1 text-sm text-slate-500">
            {driverDistanceKm?.toFixed(1)} km away · ~{driverEtaMin} min to pickup
          </p>
        )}

        {TRIP_ACTIVE.includes(current.status as RideStatus) && (
          <p className="mt-1 text-sm text-slate-500">
            {distanceKm?.toFixed(1) ?? current.distanceKm} km · ~{durationMin ?? current.durationMin} min remaining
          </p>
        )}

        {TRIP_ACTIVE.includes(current.status as RideStatus) && needsPayment && (
          <p className="mt-2 text-sm text-amber-700">
            Please complete payment so your driver can finish the trip.
          </p>
        )}

        {current.status === 'OTP_VERIFICATION' && tripOtp && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Share OTP with driver</p>
            <p className="mt-2 text-4xl font-bold tracking-[0.3em] text-emerald-900">{tripOtp}</p>
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-emerald-700">
              <Shield className="h-3 w-3" /> Do not share until driver arrives
            </p>
          </div>
        )}

        {current.driver && (
          <div className="mt-4 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            {current.driver.avatar ? (
              <img src={current.driver.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-lg text-white">
                {driverInitial(current.driver)}
              </div>
            )}
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Driver</p>
              <p className="font-semibold">{driverDisplayName}</p>
              <p className="text-sm text-slate-500">
                {vehicleLabel} · ★ {current.driver.rating?.toFixed(1) ?? '5.0'}
              </p>
            </div>
            {current.driver.phone && (
              <a href={`tel:${current.driver.phone}`} className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                <Phone className="h-5 w-5" />
              </a>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="text-slate-400">From:</span> {current.pickup.address}
          </p>
          <p>
            <span className="text-slate-400">To:</span> {current.drop.address}
          </p>
          {current.fare && <p className="text-lg font-bold">₹{current.fare.total}</p>}
        </div>

        {showPayment && current.fare?.total && (
          <div className="mt-6">
            <PaymentSelectionSheet
              fareTotal={current.fare.total}
              wallet={wallet}
              loading={payLoading}
              onConfirm={handlePayment}
            />
          </div>
        )}

        {showRating && (
          <div className="mt-6 space-y-3">
            <p className="font-medium">Rate your trip</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star
                    className={`h-8 w-8 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Optional feedback"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm"
            />
            <button
              type="button"
              onClick={submitRating}
              className="w-full rounded-2xl bg-black py-3 font-semibold text-white"
            >
              Submit rating
            </button>
            <button
              type="button"
              onClick={shareInvoice}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-sm"
            >
              <Share2 className="h-4 w-4" />
              Share invoice
            </button>
          </div>
        )}

        {current.driver && current.status !== 'TRIP_COMPLETED' && (
          <button
            type="button"
            onClick={() => setShowChat((v) => !v)}
            className="mt-4 w-full rounded-2xl border border-slate-200 py-3 text-sm font-medium"
          >
            {showChat ? 'Hide Chat' : 'Show Chat'}
          </button>
        )}

        {showChat && rideId && (
          <div className="mt-4">
            <RideChatPanel rideId={rideId} />
          </div>
        )}

        {canCancel && (
          <button type="button" onClick={cancelRide} className="mt-4 w-full py-2 text-sm text-red-600">
            Cancel ride
          </button>
        )}

        {current.status === 'TRIP_COMPLETED' && paymentDone && (
          <button
            type="button"
            onClick={() => router.push('/ride')}
            className="mt-4 w-full rounded-2xl bg-black py-3 font-semibold text-white"
          >
            Book another ride
          </button>
        )}
      </div>
    </div>
  );
}
