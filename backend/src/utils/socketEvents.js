/**
 * Centralized Socket.IO emit helpers for admin + mobile clients.
 */
function emitToRoom(room, event, payload) {
  if (!global.io || !room) return;
  global.io.to(room).emit(event, payload);
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
