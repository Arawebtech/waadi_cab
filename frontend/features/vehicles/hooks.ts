import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as vehiclesApi from './api';
import type { CreateVehiclePayload, DocumentType, UpdateVehiclePayload } from '@/types/vehicle';

const KEYS = {
  list: (params?: { page?: number; limit?: number }) => ['vehicles', 'list', params] as const,
  detail: (id: string) => ['vehicles', 'detail', id] as const,
};

export function useMyVehicles(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => vehiclesApi.fetchMyVehicles(params),
  });
}
 

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: () => vehiclesApi.fetchVehicleById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVehiclePayload) => vehiclesApi.createVehicle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'list'] });
    },
  });
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateVehiclePayload) => vehiclesApi.updateVehicle(id, payload),
    onSuccess: (vehicle) => {
      queryClient.setQueryData(KEYS.detail(id), vehicle);
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'list'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesApi.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'list'] });
    },
  });
}

export function useUploadVehicleDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentType, file }: { documentType: DocumentType; file: File }) =>
      vehiclesApi.uploadVehicleDocument(id, documentType, file),
    onSuccess: (vehicle) => {
      queryClient.setQueryData(KEYS.detail(id), vehicle);
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'list'] });
    },
  });
}

export function useDeleteVehicleDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentType: DocumentType) => vehiclesApi.deleteVehicleDocument(id, documentType),
    onSuccess: (vehicle) => {
      queryClient.setQueryData(KEYS.detail(id), vehicle);
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'list'] });
    },
  });
}
