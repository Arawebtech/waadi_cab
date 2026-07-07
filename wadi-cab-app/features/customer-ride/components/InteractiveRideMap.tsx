'use client';

import { useEffect, useRef, useState } from 'react';
import { config } from '@/config/env';
import type { RoutePoint } from '../hooks/useRoutePolyline';

type MarkerKind = 'pickup' | 'drop' | 'driver';

interface Props {
  className?: string;
  pickup?: { lat: number; lng: number } | null;
  drop?: { lat: number; lng: number } | null;
  driver?: { lat: number; lng: number; heading?: number } | null;
  routePoints?: RoutePoint[];
  fitRoute?: boolean;
}

let mapsLoader: Promise<void> | null = null;

function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise((resolve, reject) => {
    const key = config.googleMapsApiKey;
    if (!key) {
      reject(new Error('Google Maps API key missing'));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return mapsLoader;
}

export function InteractiveRideMap({ className = '', pickup, drop, driver, routePoints = [], fitRoute = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const center = pickup || drop || driver || { lat: 28.6139, lng: 77.209 };
        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });
        setReady(true);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps || !ready) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylineRef.current?.setMap(null);

    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;

    const addMarker = (pos: { lat: number; lng: number }, kind: MarkerKind) => {
      const colors = { pickup: '#10b981', drop: '#0f172a', driver: '#2563eb' };
      const marker = new google.maps.Marker({
        map,
        position: pos,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: kind === 'driver' ? 9 : 8,
          fillColor: colors[kind],
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        zIndex: kind === 'driver' ? 3 : kind === 'pickup' ? 2 : 1,
      });
      markersRef.current.push(marker);
      bounds.extend(pos);
      hasBounds = true;
    };

    if (pickup) addMarker(pickup, 'pickup');
    if (drop) addMarker(drop, 'drop');
    if (driver) addMarker(driver, 'driver');

    if (routePoints.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        map,
        path: routePoints,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });
      routePoints.forEach((p) => {
        bounds.extend(p);
        hasBounds = true;
      });
    }

    if (fitRoute && hasBounds) {
      map.fitBounds(bounds, 48);
    } else if (driver) {
      map.panTo(driver);
    } else if (pickup) {
      map.panTo(pickup);
    }
  }, [pickup, drop, driver, routePoints, fitRoute, ready]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-sm text-slate-500 ${className}`}>
        Map unavailable: {error}
      </div>
    );
  }

  return (
    <div className={`relative bg-slate-100 ${className}`}>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-500">Loading map…</p>
        </div>
      )}
      <div ref={containerRef} className="h-full min-h-[200px] w-full" />
    </div>
  );
}
