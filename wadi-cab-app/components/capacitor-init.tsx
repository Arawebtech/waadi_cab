'use client';

import { useEffect } from 'react';
import { initializeCapacitor } from '@/lib/capacitor';

export default function CapacitorInit() {
  useEffect(() => {
    initializeCapacitor();
  }, []);

  return null;
}
