'use client';

import { User } from 'lucide-react';

import type { ProfileUser } from '@/lib/api';
import type { Subscription } from '@/types/subscription';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { StatusPill, subscriptionTone } from './StatusPill';

interface UserDetailsSectionProps {
  profile: ProfileUser;
  email?: string | null;
  subscriptionStatus?: Subscription['status'] | null;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-sm text-gray-600">
        {label}
      </dt>

      <dd className="text-sm font-medium text-slate-900 text-right max-w-[60%] break-all">
        {value}
      </dd>
    </div>
  );
}

function formatJoinedDate(dateString?: string | null): string {
  if (!dateString) return '—';

  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function UserDetailsSection({
  profile,
  email,
  subscriptionStatus,
}: UserDetailsSectionProps) {

  const accountTone = profile.isActive ? 'active' : 'danger';

  return (
    <Card className="mobile-card overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">

      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <User className="h-5 w-5 mr-2" />
          User Details
        </CardTitle>
      </CardHeader>


      <CardContent>

        <dl className="divide-y divide-slate-100">

          <DetailRow
            label="First Name"
            value={profile.firstName || '—'}
          />


          <DetailRow
            label="Last Name"
            value={profile.lastName || '—'}
          />


          <DetailRow
            label="Phone Number"
            value={profile.phoneNumber || '—'}
          />


          <DetailRow
            label="Email"
            value={email?.trim() || 'Not provided'}
          />


          <DetailRow
            label="Driver ID"
            value={profile._id || '—'}
          />


          <DetailRow
            label="Joined Date"
            value={formatJoinedDate(profile.createdAt)}
          />


          <DetailRow
            label="Account Status"
            value={
              <StatusPill
                label={profile.isActive ? 'Active' : 'Suspended'}
                tone={accountTone}
              />
            }
          />


          <DetailRow
            label="Subscription Status"
            value={
              subscriptionStatus ? (
                <StatusPill
                  label={subscriptionStatus}
                  tone={subscriptionTone(subscriptionStatus)}
                />
              ) : (
                <span className="text-gray-500">
                  Not subscribed
                </span>
              )
            }
          />

        </dl>

      </CardContent>

    </Card>
  );
}