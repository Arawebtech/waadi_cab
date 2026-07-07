import { io, Socket } from 'socket.io-client';
import { config } from '@/config/env';
import type { BookingRequestEvent, BookingStatusUpdate } from '@/types';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(config.socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function setDriverOnline(
  isOnline: boolean,
  isAvailable = isOnline,
  coordinates?: { lat: number; lng: number; heading?: number; speed?: number }
): void {
  socket?.emit('driver:online', { isOnline, isAvailable, coordinates });
}

export function sendDriverLocation(
  coordinates: { lat: number; lng: number; heading?: number },
  bookingId?: string
): void {
  socket?.emit('driver:location', { coordinates, bookingId });
}

export function joinBookingRoom(bookingId: string): void {
  socket?.emit('booking:join', { bookingId });
}

export function leaveBookingRoom(bookingId: string): void {
  socket?.emit('booking:leave', { bookingId });
}

export function onBookingRequest(handler: (booking: BookingRequestEvent) => void): () => void {
  socket?.on('booking:request', handler);
  return () => socket?.off('booking:request', handler);
}

export function onBookingStatusUpdate(
  handler: (payload: BookingStatusUpdate) => void
): () => void {
  socket?.on('booking:status', handler);
  return () => socket?.off('booking:status', handler);
}

export interface DriverLocationPayload {
  driverId: string;
  vehicleId?: string | null;
  location: { lat: number; lng: number } | null;
  isOnline: boolean;
  isAvailable: boolean;
  bookingId?: string | null;
  heading?: number;
  speed?: number;
  lastSeen?: string;
}

export function onDriverLocationUpdate(
  handler: (payload: DriverLocationPayload) => void
): () => void {
  socket?.on('driver:location:update', handler);
  return () => socket?.off('driver:location:update', handler);
}

export function onDriverStatusUpdate(
  handler: (payload: DriverLocationPayload) => void
): () => void {
  socket?.on('driver:status:update', handler);
  return () => socket?.off('driver:status:update', handler);
}
