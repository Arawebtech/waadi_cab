'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ProfileSectionCard } from './ProfileSectionCard';

function SectionSkeleton({ title }: { title: string }) {
  return (
    <ProfileSectionCard title={title}>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </ProfileSectionCard>
  );
}

export function ProfileDataSkeletons() {
  return (
    <div className="space-y-4">
      <SectionSkeleton title="Active Vehicle" />
      <SectionSkeleton title="Active Subscription" />
      <SectionSkeleton title="Driver Rating" />
      <SectionSkeleton title="User Details" />
    </div>
  );
}
