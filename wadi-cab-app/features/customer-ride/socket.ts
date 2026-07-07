import { io, Socket } from 'socket.io-client';
import { base_url } from '@/environment';
import { getCustomerToken } from './api/client';
import type { DriverLocationUpdate, Ride } from './types';

function socketOrigin(apiBase: string): string {
  return apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
}

let socket: Socket | null = null;
let activeRideId: string | null = null;

export function connectCustomerSocket(): Socket | null {
  const token = getCustomerToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  socket?.removeAllListeners();
  socket?.disconnect();

  socket = io(socketOrigin(base_url), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    if (activeRideId) socket?.emit('cab-ride:join', { rideId: activeRideId });
  });

  return socket;
}

export function disconnectCustomerSocket() {
  activeRideId = null;
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

export function joinRideRoom(rideId: string) {
  activeRideId = rideId;
  socket?.emit('cab-ride:join', { rideId });
}

export function leaveRideRoom(rideId: string) {
  if (activeRideId === rideId) activeRideId = null;
  socket?.emit('cab-ride:leave', { rideId });
}

export function onRideStatus(handler: (payload: { rideId: string; status: string; ride?: Ride }) => void) {
  const events = ['cab-ride:status', 'cab-ride:driver_assigned', 'cab-ride:cancelled'] as const;
  const listeners = events.map((event) => {
    const listener = (payload: unknown) => handler(payload as { rideId: string; status: string; ride?: Ride });
    socket?.on(event, listener);
    return { event, listener };
  });
  return () => {
    listeners.forEach(({ event, listener }) => socket?.off(event, listener));
  };
}

export function onDriverLocation(handler: (payload: DriverLocationUpdate) => void) {
  const listener = (payload: unknown) => handler(payload as DriverLocationUpdate);
  socket?.on('driver:location:update', listener);
  return () => {
    socket?.off('driver:location:update', listener);
  };
}

export function onRideChat(handler: (msg: unknown) => void) {
  const listener = (msg: unknown) => handler(msg);
  socket?.on('cab-ride:chat', listener);
  return () => {
    socket?.off('cab-ride:chat', listener);
  };
}

export function sendRideChat(rideId: string, message: string) {
  socket?.emit('cab-ride:chat', { rideId, message });
}

export function subscribeNearbyDrivers(lat: number, lng: number) {
  socket?.emit('customer:subscribe:nearby', { lat, lng }, (_res: unknown) => {});
}

export function onNearbyDrivers(handler: (drivers: unknown[]) => void) {
  socket?.on('drivers:nearby', handler);
  return () => socket?.off('drivers:nearby', handler);
}

export function getCustomerSocket() {
  return socket;
}
