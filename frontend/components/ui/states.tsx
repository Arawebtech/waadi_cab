interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] px-6 py-14 text-center">
      <p className="text-sm font-semibold text-[#101828]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-[#667085]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-[#FDA29B] bg-[#FEF3F2] px-5 py-4">
      <p className="text-sm font-medium text-[#B42318]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-semibold text-[#B42318] underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#667085]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B5FFF] border-t-transparent" />
      {label && <span>{label}</span>}
    </div>
  );
}
