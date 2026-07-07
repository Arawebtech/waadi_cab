'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Phone, X, Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CabRideRequest } from '@/types/cab-booking';
import { config } from '@/config/env';

interface Props {
  ride: CabRideRequest | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  accepting?: boolean;
}

export function RideRequestOverlay({ ride, onAccept, onReject, accepting }: Props) {
  const [remaining, setRemaining] = useState(config.requestCountdownSec);

  useEffect(() => {
    if (!ride) return;
    setRemaining(config.requestCountdownSec);
    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timer);
          onReject(ride._id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [ride?._id]);

  return (
    <AnimatePresence>
      {ride && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-full max-w-lg rounded-t-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                <span className="text-2xl font-bold tabular-nums">{remaining}s</span>
              </div>
              <button onClick={() => onReject(ride._id)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="text-xl font-bold mb-1">New Ride Request</h2>
            <p className="text-sm text-muted-foreground mb-4">#{ride.rideNumber}</p>

            <div className="space-y-3 mb-4">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Pickup</p>
                  <p className="font-medium">{ride.pickup.address}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Drop</p>
                  <p className="font-medium">{ride.drop.address}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-center">
              <div>
                <p className="text-lg font-bold">₹{ride.fare.total}</p>
                <p className="text-xs text-muted-foreground">Fare</p>
              </div>
              <div>
                <p className="text-lg font-bold">{ride.distanceKm} km</p>
                <p className="text-xs text-muted-foreground">Distance</p>
              </div>
              <div>
                <p className="text-lg font-bold">{ride.durationMin} min</p>
                <p className="text-xs text-muted-foreground">ETA</p>
              </div>
            </div>

            {(ride.customerName || ride.customerPhone) && (
              <div className="flex items-center gap-2 mb-4 text-sm">
                <Phone className="h-4 w-4" />
                <span>{ride.customerName || 'Customer'}</span>
                {ride.customerPhone && (
                  <a href={`tel:${ride.customerPhone}`} className="text-blue-600 ml-auto">{ride.customerPhone}</a>
                )}
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground mb-4 capitalize">
              Payment: {ride.paymentMethod || 'cash'}
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={() => onReject(ride._id)} disabled={accepting}>
                Reject
              </Button>
              <Button
               variant="success"
               className="flex-1 h-12"
               onClick={() => onAccept(ride._id)} disabled={accepting}>
                {accepting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5 mr-2" /> Accept</>}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
