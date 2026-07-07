'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import {
  useDeleteVehicle,
  useUpdateVehicle,
  useVehicle,
} from '@/features/vehicles/hooks';
import { DocumentGrid } from '@/features/vehicles/components/DocumentGrid';
import { VerificationStatusBadge } from '@/features/vehicles/components/StatusBadge';
import { PageBackButton } from '@/features/vehicles/components/PageBackButton';
import { Button } from '@/components/ui/cab-button';
import { ErrorState, Spinner } from '@/components/ui/states';
import { StatusBadge } from '@/features/cab-booking/components/Stepper';
import { VEHICLE_DOC_LABELS } from '@/types/cab-booking';
import type { SeatCapacity, VehicleType } from '@/types/vehicle';
import { extractErrorMessage } from '@/lib/client';
import { useConfirm } from '@/components/confirm';
import { formatDate } from '@/lib/format';

const SEAT_OPTIONS: SeatCapacity[] = ['2(1+1)', '5(4+1)', '6(5+1)', '7(6+1)', '8(7+1)', '9(8+1)'];
const VEHICLE_TYPES: VehicleType[] = ['sedan', 'suv', 'hatchback', 'tempo', 'bus'];

function VehicleViewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const router = useRouter();
  const { confirmAction } = useConfirm();
  const { data: vehicle, isLoading, isError, error, refetch } = useVehicle(id || undefined);
  const deleteVehicle = useDeleteVehicle();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'info' | 'documents' | 'verification' | 'history'>('info');

  if (!id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <PageBackButton href="/vehicles" label="Back to vehicles" />
        <ErrorState message="No vehicle selected" onRetry={() => router.push('/vehicles')} />
      </div>
    );
  }

  if (isLoading) return <Spinner label="Loading vehicle…" />;

  if (isError || !vehicle) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <PageBackButton href="/vehicles" label="Back to vehicles" />
        <ErrorState
          message={extractErrorMessage(error, 'Vehicle not found')}
          onRetry={refetch}
        />
      </div>
    );
  }

  const handleDelete = async () => {
    await confirmAction({
      title: 'Remove this vehicle?',
      description: 'This can be undone by support if needed.',
      confirmLabel: 'Remove vehicle',
      cancelLabel: 'Keep vehicle',
      variant: 'danger',
      action: async () => {
        await deleteVehicle.mutateAsync(vehicle._id);
        router.push('/vehicles');
      },
    });
  };

  const uploadedDocs = Object.entries(vehicle.documents).filter(([, d]) => d.url);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <PageBackButton href="/vehicles" label="Back to vehicles" />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xl font-bold">{vehicle.vehicleNumber}</p>
            <p className="mt-1 text-sm capitalize text-slate-300">
              {vehicle.vehicleType} · {vehicle.seatCapacity} seats
              {vehicle.isDefault && ' · Active vehicle'}
            </p>
          </div>
          <VerificationStatusBadge status={vehicle.verificationStatus} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {vehicle.serviceTypes?.map((s) => (
            <span key={s} className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">{s}</span>
          ))}
        </div>
      </motion.div>

      {vehicle.verificationStatus === 'rejected' && vehicle.rejectionReason && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {vehicle.rejectionReason}
        </div>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
        {(['info', 'documents', 'verification', 'history'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium capitalize whitespace-nowrap ${
              tab === t
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Vehicle Info</h2>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <EditForm
              vehicleId={vehicle._id}
              defaults={{
                vehicleNumber: vehicle.vehicleNumber,
                vehicleType: vehicle.vehicleType,
                seatCapacity: vehicle.seatCapacity,
                isDefault: vehicle.isDefault,
              }}
              onSaved={() => setEditing(false)}
            />
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Type</dt><dd className="capitalize text-slate-900 dark:text-white">{vehicle.vehicleType}</dd></div>
              <div><dt className="text-slate-500">Seats</dt><dd className="text-slate-900 dark:text-white">{vehicle.seatCapacity}</dd></div>
              <div><dt className="text-slate-500">Default</dt><dd className="text-slate-900 dark:text-white">{vehicle.isDefault ? 'Yes' : 'No'}</dd></div>
              <div><dt className="text-slate-500">Added</dt><dd className="text-slate-900 dark:text-white">{formatDate(vehicle.createdAt)}</dd></div>
            </dl>
          )}
        </section>
      )}

      {tab === 'documents' && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Documents</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Select a file to preview first, then submit to upload. Documents are reviewed by admin.
          </p>
          <DocumentGrid vehicle={vehicle} />
        </section>
      )}

      {tab === 'verification' && (
        <section className="mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Verification Status</h2>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">Vehicle</span>
              <VerificationStatusBadge status={vehicle.verificationStatus} />
            </div>
          </div>
          {uploadedDocs.map(([type, doc]) => (
            <div key={type} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <span className="text-sm text-slate-700 dark:text-slate-200">{VEHICLE_DOC_LABELS[type] || type}</span>
              <StatusBadge status={doc.status} />
            </div>
          ))}
        </section>
      )}

      {tab === 'history' && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <History className="h-4 w-4" /> Verification History
          </h2>
          {vehicle.verificationHistory?.length ? (
            <div className="space-y-2">
              {vehicle.verificationHistory.slice().reverse().map((h, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <p className="font-medium capitalize text-slate-900 dark:text-white">{h.action.replace(/_/g, ' ')}</p>
                  {h.documentType && <p className="text-slate-500">{VEHICLE_DOC_LABELS[h.documentType] || h.documentType}</p>}
                  {h.remarks && <p className="text-slate-600 dark:text-slate-400">{h.remarks}</p>}
                  <p className="mt-1 text-xs text-slate-400">{formatDate(h.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No history yet</p>
          )}
        </section>
      )}

      <Button variant="danger" onClick={handleDelete} isLoading={deleteVehicle.isPending}>
        Remove vehicle
      </Button>
    </div>
  );
}

function EditForm({
  vehicleId,
  defaults,
  onSaved,
}: {
  vehicleId: string;
  defaults: {
    vehicleNumber: string;
    vehicleType: VehicleType;
    seatCapacity: SeatCapacity;
    isDefault: boolean;
  };
  onSaved: () => void;
}) {
  const update = useUpdateVehicle(vehicleId);
  const [form, setForm] = useState(defaults);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync(form);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={form.vehicleNumber}
        onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value }))}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm uppercase text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          value={form.vehicleType}
          onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value as VehicleType }))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={form.seatCapacity}
          onChange={(e) => setForm((f) => ({ ...f, seatCapacity: e.target.value as SeatCapacity }))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          {SEAT_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
        />
        Set as default vehicle
      </label>
      {update.isError && (
        <p className="text-xs text-red-600">{extractErrorMessage(update.error, 'Could not save changes')}</p>
      )}
      <Button type="submit" isLoading={update.isPending}>Save changes</Button>
    </form>
  );
}

export default function VehicleViewPage() {
  return (
    <Suspense fallback={<Spinner label="Loading vehicle…" />}>
      <VehicleViewContent />
    </Suspense>
  );
}
