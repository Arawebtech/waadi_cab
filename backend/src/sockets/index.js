const tokenService = require('../services/token.service');
const bookingService = require('../services/booking.service');
const riderService = require('../services/rider.service');
const matchingService = require('../services/matching.service');
const { Customer, User } = require('../models');
const logger = require('../utils/logger');

function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));

      const decoded = tokenService.verifyAccessToken(token);
      let account = null;

      if (decoded.accountType === 'customer' || decoded.role === 'customer') {
        account = await Customer.findById(decoded.sub).lean();
        if (account) account.role = 'customer';
      } else if (decoded.accountType === 'rider' || decoded.role === 'driver') {
        account = await User.findById(decoded.sub).lean();
        if (account) account.role = 'driver';
      } else if (decoded.accountType === 'admin' || decoded.role === 'admin') {
        account = { _id: decoded.sub, email: decoded.email, role: 'admin' };
      }

      if (!account || account.status === 'suspended') return next(new Error('Invalid account'));

      socket.account = account;
      socket.join(`${account.role === 'customer' ? 'customer' : account.role === 'admin' ? 'admin' : 'rider'}:${account._id}`);
      socket.join(`role:${account.role}`);

      if (account.role === 'driver') {
        socket.join(`rider:${account._id}`);
        socket.join(`driver:${account._id}`);
      }
      if (account.role === 'admin') {
        socket.join('admin:dashboard');
      }
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.account.email || socket.account.role} (${socket.account.role})`);

    socket.on('booking:join', ({ bookingId }) => {
      if (bookingId) socket.join(`booking:${bookingId}`);
    });

    socket.on('booking:leave', ({ bookingId }) => {
      if (bookingId) socket.leave(`booking:${bookingId}`);
    });

    socket.on('driver:online', async ({ isOnline, isAvailable, coordinates }) => {
      if (socket.account.role !== 'driver') return;
      try {
        await riderService.setOnlineStatus(socket.account._id, {
          isOnline,
          isAvailable,
          coordinates,
        });
        io.emit('rider:status', { driverId: socket.account._id, isOnline, isAvailable });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('driver:location', async ({ coordinates, bookingId }) => {
      if (socket.account.role !== 'driver' || !coordinates) return;
      try {
        await bookingService.updateRiderLocation(socket.account._id, coordinates, bookingId);

        const payload = {
          driverId: socket.account._id,
          bookingId,
          coordinates,
          timestamp: Date.now(),
        };

        if (bookingId) {
          io.to(`booking:${bookingId}`).emit('driver:location:update', payload);
        }

        io.to('admin:dashboard').emit('rider:location:broadcast', payload);
        io.to('role:customer').emit('riders:nearby:update', payload);
      } catch (err) {
        logger.error('driver:location socket error', { message: err.message, driverId: socket.account._id });
        socket.emit('error', { message: err.message || 'Location update failed' });
      }
    });

    socket.on('admin:subscribe', () => {
      if (socket.account.role === 'admin') {
        socket.join('admin:dashboard');
        matchingService.getOnlineRiderLocations().then((locations) => {
          socket.emit('riders:live', locations);
        });
      }
    });

    socket.on('customer:subscribe:nearby', async ({ lat, lng, vehicleId }) => {
      if (socket.account.role !== 'customer' || !lat || !lng) return;
      const riders = vehicleId
        ? await bookingService.findNearbyRiders({ lat, lng }, vehicleId, 5)
        : await matchingService.getLiveDriversNear({ lat, lng }, 5);
      socket.emit('drivers:nearby', riders);
    });

socket.on('booking:create', async (payload, cb) => {
  try {
    const booking = await bookingService.createBooking(payload, socket.account);

    // notify driver pool
    io.to('role:driver').emit('booking:new', booking);

    // notify customer
    io.to(`customer:${socket.account._id}`).emit('booking:created', booking);

    cb?.(booking);
  } catch (err) {
    socket.emit('error', { message: err.message });
  }
});

socket.on('intercity:request:create', async (payload, cb) => {
  try {
    const request = await intercityService.createRequest({
      customerId: socket.account._id,
      ...payload,
    });

    // notify all eligible drivers
    io.to('role:driver').emit('intercity:request:new', request);

    cb?.(request);
  } catch (err) {
    socket.emit('error', { message: err.message });
  }
});

socket.on('intercity:request:accept', async ({ requestId }, cb) => {
  try {
    const booking = await intercityService.acceptRequest({
      requestId,
      driverId: socket.account._id,
    });

    // notify customer
    io.to(`customer:${booking.customerId}`).emit(
      'intercity:booking:confirmed',
      booking
    );

    // notify other drivers → cancel request
    io.to('role:driver').emit('intercity:request:closed', { requestId });

    cb?.(booking);
  } catch (err) {
    socket.emit('error', { message: err.message });
  }
});

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.account.email || socket.account.role}`);
      if (socket.account.role === 'driver') {
        try {
          await riderService.setOnlineStatus(socket.account._id, { isOnline: false, isAvailable: false });
          io.emit('rider:status', { driverId: socket.account._id, isOnline: false, isAvailable: false });
        } catch {
          // ignore
        }
      }
    });
  });

  return io;
}

module.exports = { initSocket };
