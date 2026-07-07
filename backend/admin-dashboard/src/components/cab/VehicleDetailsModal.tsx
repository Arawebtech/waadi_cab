import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import PremiumModal from './PremiumModal';
import DocumentViewer from './DocumentViewer';
import StatusBadge from './StatusBadge';
import { SkeletonRows, ErrorState } from './PageStates';
import AdminAPI from '../../services/api';

interface Props {
  vehicleId: string | null;
  open: boolean;
  onClose: () => void;
}

const DOC_LABELS: Record<string, string> = {
  rc: 'Registration Certificate',
  insurance: 'Insurance',
  puc: 'PUC Certificate',
  license: 'Driving License',
  aadhaar: 'Aadhaar',
  pan: 'PAN',
};

const VehicleDetailsModal: React.FC<Props> = ({ vehicleId, open, onClose }) => {
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<string>('rc');

  useEffect(() => {
    if (!open || !vehicleId) return;
    setLoading(true);
    AdminAPI.getCabVehicleDetails(vehicleId)
      .then(setVehicle)
      .catch(() => setError('Failed to load vehicle'))
      .finally(() => setLoading(false));
  }, [open, vehicleId]);

  const docKeys = vehicle?.documents ? Object.keys(vehicle.documents).filter((k) => vehicle.documents[k]?.url) : [];
  const currentDoc = vehicle?.documents?.[selectedDoc];

  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      title={vehicle?.vehicleNumber || 'Vehicle Details'}
      subtitle={vehicle?.userId ? `${vehicle.userId.firstName} ${vehicle.userId.lastName}` : undefined}
      size="xl"
    >
      {loading ? <SkeletonRows /> : error ? <ErrorState message={error} /> : vehicle ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Vehicle Number" value={vehicle.vehicleNumber} />
              <Field label="Type" value={vehicle.vehicleType} />
              <Field label="Seats" value={vehicle.seatCapacity} />
              <Field label="Service" value={vehicle.serviceTypes?.join(', ')} />
              <Field label="Status" value={<StatusBadge status={vehicle.verificationStatus} />} />
              <Field label="Verified" value={vehicle.verifiedAt ? format(new Date(vehicle.verifiedAt), 'dd MMM yyyy') : '—'} />
            </div>
            {vehicle.rejectionReason && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{vehicle.rejectionReason}</p>
            )}
            <div>
              <p className="font-semibold text-sm mb-2">Documents</p>
              <div className="flex flex-wrap gap-2">
                {docKeys.map((k) => (
                  <button
                    key={k}
                    onClick={() => setSelectedDoc(k)}
                    className={`px-3 py-1 rounded-lg text-xs capitalize ${selectedDoc === k ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
                  >
                    {DOC_LABELS[k] || k}
                  </button>
                ))}
              </div>
            </div>
            <DocumentViewer url={currentDoc?.url} title={selectedDoc} />
          </div>
          <div>
            <p className="font-semibold text-sm mb-3">Verification History</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {vehicle.verificationHistory?.length ? vehicle.verificationHistory.map((h: any, i: number) => (
                <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm">
                  <p className="font-medium capitalize">{h.action?.replace(/_/g, ' ')}</p>
                  {h.documentType && <p className="text-slate-500">Doc: {h.documentType}</p>}
                  {h.remarks && <p className="text-slate-500">{h.remarks}</p>}
                  <p className="text-xs text-slate-400 mt-1">{h.createdAt ? format(new Date(h.createdAt), 'dd MMM yyyy HH:mm') : ''}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No history</p>}
            </div>
          </div>
        </div>
      ) : null}
    </PremiumModal>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs text-slate-500">{label}</p>
    <div className="font-medium capitalize">{value}</div>
  </div>
);

export default VehicleDetailsModal;
