'use client';

import { motion } from 'framer-motion';
import { Car, Loader2 } from 'lucide-react';

interface Props {
  nearbyCount?: number;
  statusText?: string;
}

export function SearchingAnimation({ nearbyCount = 0, statusText = 'Searching nearby drivers…' }: Props) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="relative mb-6 h-28 w-28">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
          <Car className="h-10 w-10" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        {statusText}
      </div>
      {nearbyCount > 0 && (
        <p className="mt-2 text-sm text-slate-500">{nearbyCount} drivers nearby · matching best option</p>
      )}
    </div>
  );
}
