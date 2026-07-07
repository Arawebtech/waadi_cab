import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#0B5FFF] text-white hover:bg-[#0A52DB] disabled:bg-[#93B8FF]',
  secondary:
    'bg-white text-[#101828] border border-[#D0D5DD] hover:bg-[#F9FAFB] disabled:opacity-50',
  ghost: 'bg-transparent text-[#344054] hover:bg-[#F2F4F7] disabled:opacity-50',
  danger: 'bg-[#D92D20] text-white hover:bg-[#B42318] disabled:bg-[#FDA29B]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', isLoading, disabled, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FFF]',
          'disabled:cursor-not-allowed',
          variantClasses[variant],
          className
        )}
        {...rest}
      >
        {isLoading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
