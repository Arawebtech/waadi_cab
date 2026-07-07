'use client';

import type { DocumentType, Vehicle } from '@/types/vehicle';
import { DocumentUploadCard } from './DocumentUploadCard';

const DOC_LABELS: Record<DocumentType, string> = {
  rc: 'Registration certificate (RC)',
  insurance: 'Insurance',
  puc: 'Pollution certificate (PUC)',
  license: 'Driving licence',
  aadhaar: 'Aadhaar card',
  pan: 'PAN card',
};

export function DocumentGrid({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(Object.keys(DOC_LABELS) as DocumentType[]).map((type) => (
        <DocumentUploadCard
          key={type}
          vehicleId={vehicle._id}
          type={type}
          label={DOC_LABELS[type]}
          doc={vehicle.documents[type]}
        />
      ))}
    </div>
  );
}
