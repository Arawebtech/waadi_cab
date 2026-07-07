'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { EmptyState, Spinner } from '@/components/ui/states';
import { useToast } from '@/components/ui/use-toast';
import { VehicleCard } from '@/features/vehicles/components/VehicleCard';
import { useMyVehicles } from '@/features/vehicles/hooks';
import { CabStepper, StatusBadge, StepPanel } from '@/features/cab-booking/components/Stepper';
import {
  useCabPlans,
  useCabProfile,
  useCabSubscription,
  useCabVerification,
  useSaveRegistrationStep,
  useSetActiveVehicle,
  useSubmitVerification,
  useUpdateCabProfile,
} from '@/features/cab-booking/hooks';
import { extractErrorMessage } from '@/lib/client';
import { SubscriptionPanel } from '../subscription/SubscriptionPanel';
import { PremiumOnlineToggle } from '../dashboard/PremiumOnlineToggle';

interface Props {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const profileQ = useCabProfile();
  const verificationQ = useCabVerification();
  const vehiclesQ = useMyVehicles();
  const plansQ = useCabPlans();
  const subQ = useCabSubscription();

  const updateProfile = useUpdateCabProfile();
  const saveStep = useSaveRegistrationStep();
  const setActiveVehicle = useSetActiveVehicle();
  const submitVerification = useSubmitVerification();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });

  useEffect(() => {
    if (profileQ.data?.user) {
      setForm({
        firstName: profileQ.data.user.firstName || '',
        lastName: profileQ.data.user.lastName || '',
        email: profileQ.data.user.email || '',
      });
      const saved = profileQ.data.user.cabBooking?.registrationStep;
      if (saved) setStep(Math.min(saved, 4));
    }
  }, [profileQ.data]);

  const goToStep = useCallback(async (next: number) => {
    const capped = Math.min(4, Math.max(1, next));
    setStep(capped);
    try { await saveStep.mutateAsync(capped); } catch { /* non-blocking */ }
  }, [saveStep]);

  const profileComplete = useMemo(
    () => Boolean(form.firstName.trim() && form.lastName.trim() && form.email.trim()),
    [form]
  );

  const handleSaveProfile = async () => {
    if (!profileComplete) {
      toast({ title: 'Incomplete', description: 'Fill all required fields', variant: 'destructive' });
      return;
    }
    try {
      await updateProfile.mutateAsync(form);
      toast({ title: 'Profile saved' });
      await goToStep(2);
    } catch (e) {
      toast({ title: 'Error', description: extractErrorMessage(e), variant: 'destructive' });
    }
  };

  const canGoOnline = Boolean(verificationQ.data?.canGoOnline);
  const blockReasons = verificationQ.data?.blockReasons ?? [];

  return (
    <div className="space-y-4">
      <CabStepper currentStep={step} onStepClick={goToStep} />

      {step === 1 && (
        <StepPanel stepKey={1}>
          <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 dark:text-white">Driver Profile</h2>
                <StatusBadge status={verificationQ.data?.checks.profile.status || 'pending'} />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Complete your profile first. Documents can be uploaded later from your vehicle page.
              </p>
              <div className="grid gap-3">
                <div><Label>First name *</Label><Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
                <div><Label>Last name *</Label><Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900" onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Continue
              </Button>
            </CardContent>
          </Card>
        </StepPanel>
      )}

      {step === 2 && (
        <StepPanel stepKey={2}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Add Vehicle</h2>
              <p className="text-sm text-slate-500">Register at least one vehicle to continue</p>
            </div>
            <Link href="/vehicles/new"><Button size="sm" variant="outline">Add Vehicle</Button></Link>
          </div>
          {vehiclesQ.isLoading && <Spinner />}
          {vehiclesQ.data?.vehicles.length === 0 && (
            <EmptyState title="No vehicles yet" description="Add a vehicle to continue onboarding" />
          )}
          <div className="space-y-3">
            {vehiclesQ.data?.vehicles.map((v) => (
              <div key={v._id} className="relative">
                <VehicleCard vehicle={v} />
                <Button
                  size="sm"
                  className="absolute right-3 top-3"
                  variant={v.isDefault ? 'default' : 'outline'}
                  onClick={() => setActiveVehicle.mutate(v._id)}
                >
                  {v.isDefault ? 'Active' : 'Set Active'}
                </Button>
              </div>
            ))}
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => goToStep(3)}
            disabled={!vehiclesQ.data?.vehicles.length}
          >
            Continue to Subscription
          </Button>
        </StepPanel>
      )}

      {step === 3 && (
        <StepPanel stepKey={3}>
          <SubscriptionPanel
            subscription={subQ.data}
            plans={plansQ.data}
            loading={plansQ.isLoading}
            onPurchase={() => router.push('/subscriptions')}
          />
          <Button className="mt-4 w-full" onClick={() => goToStep(4)} disabled={!subQ.data}>
            Continue
          </Button>
        </StepPanel>
      )}

      {step === 4 && (
        <StepPanel stepKey={4}>
          <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 dark:text-white">Ready to Go Online</h2>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{verificationQ.data?.percent ?? 0}%</span>
              </div>
              <Progress value={verificationQ.data?.percent ?? 0} />
              {verificationQ.data && Object.entries(verificationQ.data.checks).map(([key, check]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <span className="text-sm capitalize text-slate-700 dark:text-slate-200">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <StatusBadge status={check.status} />
                </div>
              ))}

              {blockReasons.length > 0 && !canGoOnline && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="font-medium mb-1">Complete these to go online:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {blockReasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              )}

              <PremiumOnlineToggle
                isOnline={false}
                disabled={!canGoOnline}
                onToggle={() => {
                  if (canGoOnline) {
                    onComplete();
                  }
                }}
              />

              <Button
                className="w-full"
                variant="outline"
                onClick={async () => {
                  await submitVerification.mutateAsync();
                  toast({ title: 'Submitted for profile verification' });
                  verificationQ.refetch();
                }}
              >
                Submit Profile for Verification
              </Button>

              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={async () => {
                  await goToStep(4);
                  onComplete();
                }}
              >
                Enter Driver Dashboard
              </Button>

              <p className="text-center text-xs text-slate-500">
                Upload vehicle documents anytime from{' '}
                <Link href="/vehicles" className="text-blue-600 hover:underline">Profile → Vehicles</Link>
              </p>
            </CardContent>
          </Card>
        </StepPanel>
      )}
    </div>
  );
}
