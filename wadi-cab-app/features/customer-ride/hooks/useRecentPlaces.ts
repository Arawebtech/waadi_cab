'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Location } from '../types';

const KEY = 'wadi_cab_recent_places';
const MAX = 8;

export function useRecentPlaces() {
  const [recent, setRecent] = useState<Location[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      setRecent([]);
    }
  }, []);

  const addRecent = useCallback((loc: Location) => {
    setRecent((prev) => {
      const next = [loc, ...prev.filter((p) => p.address !== loc.address)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recent, addRecent };
}

export const POPULAR_DESTINATIONS: Location[] = [
  { address: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
  { address: 'New Delhi Railway Station', lat: 28.6431, lng: 77.2197 },
  { address: 'Indira Gandhi International Airport Terminal 3', lat: 28.5562, lng: 77.1 },
];
