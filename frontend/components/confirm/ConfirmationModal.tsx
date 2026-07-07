'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConfirmVariant } from './types';

const VARIANT_ICON: Record<ConfirmVariant, LucideIcon> = {
  danger: AlertTriangle,
  primary: HelpCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
};

const VARIANT_ICON_BG: Record<ConfirmVariant, string> = {
  danger: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  primary: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
};

export interface ConfirmationModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: LucideIcon;
  loading?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  icon,
  loading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const Icon = icon ?? VARIANT_ICON[variant];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={loading ? undefined : onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95"
          >
            <div className="flex gap-4">
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', VARIANT_ICON_BG[variant])}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {title}
                </h3>
                {description && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
                )}
                {children}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={loading} onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant={
                  variant === 'danger'
                    ? 'destructive'
                    : variant === 'success' || variant === 'warning'
                      ? 'success'
                      : 'default'
                }
                className="w-full sm:w-auto"
                disabled={loading}
                onClick={onConfirm}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
