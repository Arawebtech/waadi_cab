'use client';

import { useEffect, useRef, useState } from 'react';
import { config } from '@/config/env';
import type { RoutePoint } from '@/hooks/useRoutePolyline';

type MarkerKind = 'pickup' | 'drop' | 'driver';

interface Props {
  className?: string;
  style?: React.CSSProperties;
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

export function InteractiveRideMap({
  className = '',
  style,
  pickup,
  drop,
  driver,
  routePoints = [],
  fitRoute = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const fitKeyRef = useRef('');
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
          draggable: true,
          scrollwheel: true,
          disableDoubleClickZoom: false,
          keyboardShortcuts: true,
        });
        setMapReady(true);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !window.google?.maps) return;

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

    const fitKey = [
      pickup?.lat,
      pickup?.lng,
      drop?.lat,
      drop?.lng,
      routePoints.length,
      routePoints[0]?.lat,
      routePoints[routePoints.length - 1]?.lat,
    ].join('|');

    if (fitRoute && hasBounds && fitKey !== fitKeyRef.current) {
      map.fitBounds(bounds, 48);
      fitKeyRef.current = fitKey;
    } else if (!fitRoute && driver) {
      map.panTo(driver);
    }
  }, [mapReady, pickup, drop, driver, routePoints, fitRoute]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-sm text-slate-500 ${className}`}
        style={style}
      >
        Map unavailable: {error}
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={style} />;
}
