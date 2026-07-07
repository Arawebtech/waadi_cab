'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { tokenManager } from '@/lib/api';
import { config } from '@/config/env';
import type { CabRideRequest } from '@/types/cab-booking';
import {
  connectCabSocket,
  disconnectCabSocket,
  onCabRideRequest,
  onCabRideStatus,
  onCabRideAccepted,
  cabSendLocation,
  joinRideRoom,
  leaveRideRoom,
} from '../services/cab-socket';
import { useQueryClient } from '@tanstack/react-query';

interface CabDriverContextValue {
  isOnline: boolean;
  isAvailable: boolean;
  coords: { lat: number; lng: number } | null;
  incomingRide: CabRideRequest | null;
  dismissedRideIds: Set<string>;
  dismissIncomingRide: (id: string) => void;
  setIncomingRide: (ride: CabRideRequest | null) => void;
}

const CabDriverContext = createContext<CabDriverContextValue | null>(null);

export function CabDriverProvider({
  children,
  isOnline,
  isAvailable,
  activeBookingId,
}: {
  children: React.ReactNode;
  isOnline: boolean;
  isAvailable: boolean;
  activeBookingId?: string | null;
}) {
  const qc = useQueryClient();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [incomingRide, setIncomingRide] = useState<CabRideRequest | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());

  const dismissIncomingRide = useCallback((id: string) => {
    dismissedRef.current.add(id);
    setIncomingRide((prev) => (prev?._id === id ? null : prev));
  }, []);

  const getPosition = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const perm = await Geolocation.requestPermissions();
      if (perm.location === 'denied') throw new Error('Location permission denied');
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading ?? undefined,
        speed: pos.coords.speed ?? undefined,
      };
    }
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
    );
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading ?? undefined,
      speed: pos.coords.speed ?? undefined,
    };
  }, []);

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (!token) return;
    connectCabSocket(token);
    return () => disconnectCabSocket();
  }, []);

  useEffect(() => {
    const unsubRequest = onCabRideRequest((ride) => {
      if (!isOnline || !isAvailable || dismissedRef.current.has(ride._id)) return;
      setIncomingRide(ride);
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch {
        // optional sound
      }
    });
    const unsubStatus = onCabRideStatus(() => {
      qc.invalidateQueries({ queryKey: ['cab', 'activeRide'] });
      qc.invalidateQueries({ queryKey: ['cab', 'rides'] });
      qc.invalidateQueries({ queryKey: ['cab', 'location'] });
    });
    const unsubAccepted = onCabRideAccepted((ride) => {
      setIncomingRide(null);
      joinRideRoom(ride._id);
      qc.invalidateQueries({ queryKey: ['cab', 'activeRide'] });
    });
    return () => {
      unsubRequest();
      unsubStatus();
      unsubAccepted();
    };
  }, [isOnline, isAvailable, qc]);

  useEffect(() => {
    if (!isOnline) return;
    let timer: ReturnType<typeof setInterval>;
    const tick = async () => {
      try {
        const c = await getPosition();
        setCoords({ lat: c.lat, lng: c.lng });
        cabSendLocation(c, {
          isAvailable,
          bookingId: activeBookingId || undefined,
        });
      } catch {
        // silent
      }
    };
    tick();
    timer = setInterval(tick, config.locationIntervalMs);
    return () => clearInterval(timer);
  }, [isOnline, isAvailable, activeBookingId, getPosition]);

  const value = useMemo(
    () => ({
      isOnline,
      isAvailable,
      coords,
      incomingRide,
      dismissedRideIds: dismissedRef.current,
      dismissIncomingRide,
      setIncomingRide,
    }),
    [isOnline, isAvailable, coords, incomingRide, dismissIncomingRide]
  );

  return <CabDriverContext.Provider value={value}>{children}</CabDriverContext.Provider>;
}

export function useCabDriver() {
  const ctx = useContext(CabDriverContext);
  if (!ctx) throw new Error('useCabDriver must be used within CabDriverProvider');
  return ctx;
}

export { leaveRideRoom, joinRideRoom };
