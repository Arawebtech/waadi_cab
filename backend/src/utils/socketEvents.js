/**
 * Centralized Socket.IO emit helpers for admin + mobile clients.
 */
function toPlain(value) {
  if (value == null) return value;
  const obj = typeof value.toJSON === 'function' ? value.toJSON() : value;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

function emitToRoom(room, event, payload) {
  if (!global.io || !room) {
    console.warn('📡 Socket emit skipped — io not ready', { room, event });
    return;
  }
  const plainPayload =
    payload && typeof payload === 'object' && payload.booking
      ? { ...payload, booking: toPlain(payload.booking) }
      : payload;
  try {
    global.io.to(room).emit(event, plainPayload);
  } catch (err) {
    console.warn('📡 Socket emit failed', { room, event, error: err.message });
  }
}

function getUserId(booking) {
  if (!booking?.user) return null;
  return String(booking.user._id || booking.user);
}

function emitToAdmin(event, payload) {
  emitToRoom('admin-room', event, payload);
}

function emitToUser(userId, event, payload) {
  if (!userId) return;
  emitToRoom(`user-${userId}`, event, payload);
}

function emitBookingUpdated(booking, extra = {}) {
  if (!booking) return;

  const payload = {
    type: 'booking-updated',
    booking,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  emitToAdmin('booking-updated', payload);

  const userId = getUserId(booking);
  emitToUser(userId, 'booking-updated', payload);
}

function emitNewBooking(booking) {
  if (!booking) return;

  const payload = {
    type: 'new-booking',
    booking,
    timestamp: new Date().toISOString(),
  };

  emitToAdmin('new-booking', payload);
}

function emitPaymentVerified(booking, extra = {}) {
  if (!booking) return;

  const timestamp = new Date().toISOString();
  const paymentPayload = {
    type: 'payment-verified',
    booking,
    timestamp,
    ...extra,
  };

  emitToAdmin('payment-verified', paymentPayload);
  // Admin UI listens to booking-updated — emit both for compatibility
  emitBookingUpdated(booking, { source: extra.source || 'payment' });
}

function emitTaxSlipReady(booking) {
  if (!booking) return;

  const payload = {
    type: 'tax-slip-ready',
    booking,
    timestamp: new Date().toISOString(),
  };

  emitToAdmin('booking-updated', {
    type: 'booking-updated',
    booking,
    timestamp: payload.timestamp,
    source: 'tax-slip-upload',
  });

  const userId = getUserId(booking);
  emitToUser(userId, 'tax-slip-ready', payload);
  emitToUser(userId, 'booking-updated', {
    type: 'booking-updated',
    booking,
    timestamp: payload.timestamp,
    source: 'tax-slip-upload',
  });
}

module.exports = {
  emitToAdmin,
  emitToUser,
  emitBookingUpdated,
  emitNewBooking,
  emitPaymentVerified,
  emitTaxSlipReady,
};
