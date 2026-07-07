'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { REGISTRATION_STEPS } from '@/types/cab-booking';
import { cn } from '@/lib/utils';

interface StepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function CabStepper({ currentStep, onStepClick }: StepperProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-2 px-1">
        {REGISTRATION_STEPS.map((step) => {
          const done = currentStep > step.id;
          const active = currentStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick?.(step.id)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active && 'border-blue-600 bg-blue-50 text-blue-700',
                done && !active && 'border-green-200 bg-green-50 text-green-700',
                !active && !done && 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                  active && 'bg-blue-600 text-white',
                  done && !active && 'bg-green-600 text-white',
                  !active && !done && 'bg-gray-100 text-gray-500'
                )}
              >
                {done ? <Check className="h-3 w-3" /> : step.id}
              </span>
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepPanel({ children, stepKey }: { children: React.ReactNode; stepKey: number }) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    active: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
    under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    not_uploaded: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    offline: 'bg-gray-100 text-gray-600',
    available: 'bg-green-100 text-green-800',
    busy: 'bg-orange-100 text-orange-800',
    on_trip: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', colors[status] || colors.pending)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
