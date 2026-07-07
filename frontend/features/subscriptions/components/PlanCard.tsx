import { clsx } from 'clsx';
import type { SubscriptionPlan } from '@/types/subscription';
import { formatCurrency } from '../../../lib/format';
import { Button } from '@/components/ui/cab-button';

interface PlanCardProps {
  plan: SubscriptionPlan;
  onSelect: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
  actionLabel?: string;
}

export function PlanCard({ plan, onSelect, isProcessing, disabled, actionLabel }: PlanCardProps) {
  return (
    <div
      className={clsx(
        'relative flex flex-col rounded-xl border p-4',
        plan.isRecommended ? 'border-[#0B5FFF] shadow-sm' : 'border-[#E4E7EC]'
      )}
    >
      {plan.badge && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-[#0B5FFF] px-2.5 py-0.5 text-xs font-medium text-white">
          {plan.badge}
        </span>
      )}
      <p className="text-sm font-semibold text-[#101828]">{plan.name}</p>
      <p className="mt-1 text-2xl font-semibold text-[#101828]">
        {formatCurrency(plan.amount, plan.currency)}
        <span className="ml-1 text-sm font-normal text-[#667085]">
          / {plan.durationDays} days
        </span>
      </p>
      {plan.description && <p className="mt-2 text-sm text-[#667085]">{plan.description}</p>}

      {plan.features.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm text-[#344054]">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-0.5 text-[#0B5FFF]">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Button
          onClick={onSelect}
          isLoading={isProcessing}
          disabled={disabled}
          className="w-full"
        >
          {actionLabel ?? 'Choose plan'}
        </Button>
      </div>
    </div>
  );
}
