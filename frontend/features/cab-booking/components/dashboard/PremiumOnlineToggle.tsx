'use client';

import { motion } from 'framer-motion';
import { Loader2, Power } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  isOnline: boolean;
  loading?: boolean;
  disabled?: boolean;
  blockReasons?: string[];
  onToggle: () => void;
}

export function PremiumOnlineToggle({ isOnline, loading, disabled, blockReasons = [], onToggle }: Props) {
  return (
    <motion.button
      type="button"
      disabled={disabled || loading}
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300',
        isOnline
          ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 shadow-emerald-500/20 shadow-lg'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
        (disabled || loading) && 'opacity-60 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-4">
        <motion.div
          animate={isOnline ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ repeat: isOnline ? Infinity : 0, duration: 2 }}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full',
            isOnline ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700'
          )}
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Power className="h-6 w-6" />}
        </motion.div>
        <div className="flex-1">
          <p className="text-lg font-bold text-foreground">
            {isOnline ? 'You\'re Online' : 'Go Online'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {disabled && blockReasons.length
              ? blockReasons[0]
              : isOnline
                ? 'Receiving ride requests nearby'
                : 'Tap to start accepting rides'}
          </p>
        </div>
        <div
          className={cn(
            'h-8 w-14 rounded-full p-1 transition-colors',
            isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
          )}
        >
          <motion.div
            layout
            className="h-6 w-6 rounded-full bg-white shadow"
            style={{ marginLeft: isOnline ? 'auto' : 0 }}
          />
        </div>
      </div>
      {isOnline && (
        <motion.div
          className="absolute inset-0 -z-10 bg-emerald-400/10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        />
      )}
    </motion.button>
  );
}
