'use client';

import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarRating({ value, max = 5, size = 'md', className }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`Rating ${clamped.toFixed(1)} out of ${max}`}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = clamped - index;
        if (starValue >= 1) {
          return <Star key={index} className={cn(iconClass, 'fill-amber-400 text-amber-400')} />;
        }
        if (starValue >= 0.5) {
          return <StarHalf key={index} className={cn(iconClass, 'fill-amber-400 text-amber-400')} />;
        }
        return <Star key={index} className={cn(iconClass, 'text-slate-300')} />;
      })}
    </div>
  );
}
