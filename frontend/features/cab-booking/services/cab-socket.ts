import { io, Socket } from 'socket.io-client';
import { config } from '@/config/env';
import type { CabRideRequest } from '@/types/cab-booking';

let socket: Socket | null = null;

export function connectCabSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(config.socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectCabSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getCabSocket(): Socket | null {
  return socket;
}

export function cabSetOnline(
  isOnline: boolean,
  isAvailable = isOnline,
  coordinates?: { lat: number; lng: number; heading?: number; speed?: number },
  vehicleId?: string
): Promise<{ success: boolean; data?: unknown; message?: string; code?: string }> {
  return new Promise((resolve) => {
    socket?.emit('cab-driver:online', { isOnline, isAvailable, coordinates, vehicleId }, resolve);
  });
}

export function cabSetAvailability(isAvailable: boolean): Promise<{ success: boolean; data?: unknown; message?: string }> {
  return new Promise((resolve) => {
    socket?.emit('cab-driver:availability', { isAvailable }, resolve);
  });
}

export function cabSendLocation(
  coordinates: { lat: number; lng: number; heading?: number; speed?: number },
  opts?: { isAvailable?: boolean; bookingId?: string }
): void {
  socket?.emit('cab-driver:location', { coordinates, ...opts });
}

export function cabAcceptRide(rideId: string): Promise<{ success: boolean; data?: CabRideRequest; message?: string }> {
  return new Promise((resolve) => {
    socket?.emit('cab-driver:ride:accept', { rideId }, resolve);
  });
}

export function joinRideRoom(rideId: string): void {
  socket?.emit('cab-ride:join', { rideId });
}

export function leaveRideRoom(rideId: string): void {
  socket?.emit('cab-ride:leave', { rideId });
}

export function sendCabChat(rideId: string, message: string): Promise<{ success: boolean; data?: unknown }> {
  return new Promise((resolve) => {
    socket?.emit('cab-ride:chat', { rideId, message }, resolve);
  });
}

export function onCabRideRequest(handler: (ride: CabRideRequest) => void): () => void {
  const fn = (ride: CabRideRequest) => handler(ride);
  socket?.on('cab-ride:request', fn);
  return () => socket?.off('cab-ride:request', fn);
}

export function onCabRideStatus(handler: (payload: { rideId: string; status: string; ride?: CabRideRequest }) => void): () => void {
  const fn = (payload: { rideId: string; status: string; ride?: CabRideRequest }) => handler(payload);
  socket?.on('cab-ride:status', fn);
  return () => socket?.off('cab-ride:status', fn);
}

export function onCabRideAccepted(handler: (ride: CabRideRequest) => void): () => void {
  const fn = (ride: CabRideRequest) => handler(ride);
  socket?.on('cab-ride:accepted', fn);
  return () => socket?.off('cab-ride:accepted', fn);
}

export function onCabChat(handler: (msg: RideChatMessage) => void): () => void {
  const fn = (msg: RideChatMessage) => handler(msg);
  socket?.on('cab-ride:chat', fn);
  return () => socket?.off('cab-ride:chat', fn);
}

export interface RideChatMessage {
  _id: string;
  rideId: string;
  senderId: string;
  senderRole: 'driver' | 'customer';
  message: string;
  type: string;
  createdAt: string;
}
