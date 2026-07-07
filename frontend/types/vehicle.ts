export type SeatCapacity =
  | '2(1+1)'
  | '5(4+1)'
  | '6(5+1)'
  | '7(6+1)'
  | '8(7+1)'
  | '9(8+1)';

export type VehicleType = 'sedan' | 'suv' | 'hatchback' | 'tempo' | 'bus';

export type ServiceType = 'local' | 'intercity';

export type DocumentType =
  | 'rc'
  | 'insurance'
  | 'puc'
  | 'license'
  | 'aadhaar'
  | 'pan';

export type DocumentStatus = 'not_uploaded' | 'pending' | 'approved' | 'rejected';

export interface VehicleDocument {
  url: string | null;
  public_id: string | null;
  status: DocumentStatus;
  uploadedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
}

export type VerificationStatus =
  | 'draft'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected';

export interface VerificationHistoryEntry {
  action:
    | 'vehicle_created'
    | 'vehicle_updated'
    | 'vehicle_approved'
    | 'vehicle_rejected'
    | 'document_uploaded'
    | 'document_approved'
    | 'document_rejected';
  documentType: 'rc' | 'insurance' | 'puc' | 'license' | null;
  remarks: string | null;
  performedBy: string | null;
  createdAt: string;
}

export interface Vehicle {
  _id: string;
  userId: string;
  vehicleNumber: string;
  seatCapacity: SeatCapacity;
  vehicleType: VehicleType;
  isDefault: boolean;
  serviceTypes: ServiceType[];
  documents: Record<DocumentType, VehicleDocument>;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  verificationHistory: VerificationHistoryEntry[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Fields the driver can submit when creating a vehicle. Documents are sent
 * separately as multipart files under the same field names. */
export interface CreateVehiclePayload {
  vehicleNumber: string;
  seatCapacity: SeatCapacity;
  vehicleType: VehicleType;
  isDefault?: boolean;
  files?: Partial<Record<DocumentType, File>>;
}

export interface UpdateVehiclePayload {
  vehicleNumber?: string;
  seatCapacity?: SeatCapacity;
  vehicleType?: VehicleType;
  isDefault?: boolean;
}
