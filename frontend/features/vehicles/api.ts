import { apiClient, ApiEnvelope } from '@/lib/api/client';
import { VEHICLE_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  CreateVehiclePayload,
  DocumentType,
  UpdateVehiclePayload,
  Vehicle,
} from '@/types/vehicle';
import type { Pagination } from '@/types/common';

export async function fetchMyVehicles(params?: { page?: number; limit?: number }) {
  const { data } = await apiClient.get<ApiEnvelope<Vehicle[]>>(VEHICLE_ENDPOINTS.list, {
    params,
  });
  return { vehicles: data.data, pagination: data.pagination as Pagination };
}

export async function fetchVehicleById(id: string) {
  const { data } = await apiClient.get<ApiEnvelope<Vehicle>>(VEHICLE_ENDPOINTS.detail(id));
  return data.data;
}

function buildVehicleFormData(payload: CreateVehiclePayload) {
  const form = new FormData();
  form.append('vehicleNumber', payload.vehicleNumber);
  form.append('seatCapacity', payload.seatCapacity);
  form.append('vehicleType', payload.vehicleType);
  if (payload.isDefault !== undefined) {
    form.append('isDefault', String(payload.isDefault));
  }
  if (payload.files) {
    for (const [type, file] of Object.entries(payload.files)) {
      if (file) form.append(type, file);
    }
  }
  return form;
}

export async function createVehicle(payload: CreateVehiclePayload) {
  const form = buildVehicleFormData(payload);
  const { data } = await apiClient.post<ApiEnvelope<Vehicle>>(VEHICLE_ENDPOINTS.create, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function updateVehicle(id: string, payload: UpdateVehiclePayload) {
  const { data } = await apiClient.put<ApiEnvelope<Vehicle>>(
    VEHICLE_ENDPOINTS.update(id),
    payload
  );
  return data.data;
}

export async function deleteVehicle(id: string) {
  const { data } = await apiClient.delete<ApiEnvelope<null>>(VEHICLE_ENDPOINTS.remove(id));
  return data;
}

export async function uploadVehicleDocument(
  id: string,
  documentType: DocumentType,
  file: File
) {
  const form = new FormData();
  form.append('documentType', documentType);
  form.append('document', file);
  const { data } = await apiClient.post<ApiEnvelope<Vehicle>>(
    VEHICLE_ENDPOINTS.uploadDocument(id),
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.data;
}

export async function deleteVehicleDocument(id: string, documentType: DocumentType) {
  const { data } = await apiClient.delete<ApiEnvelope<Vehicle>>(
    VEHICLE_ENDPOINTS.deleteDocument(id, documentType)
  );
  return data.data;
}
