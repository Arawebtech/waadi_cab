import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL?.replace('/api/v1', '') || 'http://localhost:4001/';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect() {
    if (this.socket) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.isConnected = true;
      
      // Join admin room for real-time updates
      this.socket?.emit('join-admin');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.isConnected = false;
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  onNewBooking(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('new-booking', callback);
    }
  }

  onBookingUpdated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('booking-updated', callback);
    }
  }

  onBookingDeleted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('booking-deleted', callback);
    }
  }

  offNewBooking() {
    if (this.socket) {
      this.socket.off('new-booking');
    }
  }

  offBookingUpdated() {
    if (this.socket) {
      this.socket.off('booking-updated');
    }
  }

  offBookingDeleted() {
    if (this.socket) {
      this.socket.off('booking-deleted');
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export default new SocketService(); 