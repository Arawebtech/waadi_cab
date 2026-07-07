import { clsx } from 'clsx';
import type { DocumentStatus, VerificationStatus } from '@/types/vehicle';

const verificationCopy: Record<VerificationStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-[#F2F4F7] text-[#344054]' },
  pending: { label: 'Pending documents', className: 'bg-[#FFF4E5] text-[#B54708]' },
  under_review: { label: 'Under review', className: 'bg-[#FFF4E5] text-[#B54708]' },
  approved: { label: 'Approved', className: 'bg-[#ECFDF3] text-[#027A48]' },
  rejected: { label: 'Rejected', className: 'bg-[#FEF3F2] text-[#B42318]' },
};

const documentCopy: Record<DocumentStatus, { label: string; className: string }> = {
  not_uploaded: { label: 'Not uploaded', className: 'bg-[#F2F4F7] text-[#667085]' },
  pending: { label: 'Awaiting review', className: 'bg-[#FFF4E5] text-[#B54708]' },
  approved: { label: 'Approved', className: 'bg-[#ECFDF3] text-[#027A48]' },
  rejected: { label: 'Rejected', className: 'bg-[#FEF3F2] text-[#B42318]' },
};

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  const copy = verificationCopy[status];
  return (
    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-medium', copy.className)}>
      {copy.label}
    </span>
  );
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const copy = documentCopy[status];
  return (
    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', copy.className)}>
      {copy.label}
    </span>
  );
}
