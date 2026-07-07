const JWTUtils = require('../utils/jwt');
const User = require('../models/User');
const Customer = require('../models/Customer');
const locationService = require('../cab-driver/location.service');
const rideService = require('../cab-driver/ride.service');
const chatService = require('../cab-driver/chat.service');
const logger = require('../utils/logger');

function initCabDriverSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));

      const decoded = JWTUtils.verifyAccessToken(token);

      if (decoded.role === 'customer' || decoded.userType === 'customer') {
        const customer = await Customer.findById(decoded.userId).lean();
        if (!customer || customer.status === 'suspended') {
          return next(new Error('Invalid account'));
        }
        socket.accountType = 'customer';
        socket.customer = customer;
        socket.user = { _id: customer._id, role: 'customer', email: customer.email };
        socket.join(`customer:${customer._id}`);
        socket.join('role:customer');
        return next();
      }

      const user = await User.findById(decoded.userId).lean();
      if (!user?.isActive) return next(new Error('Invalid account'));

      socket.accountType = 'driver';
      socket.user = user;
      socket.join(`driver:${user._id}`);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.accountType === 'customer') {
      socket.on('cab-ride:join', ({ rideId }) => {
        if (rideId) socket.join(`ride:${rideId}`);
      });

      socket.on('cab-ride:leave', ({ rideId }) => {
        if (rideId) socket.leave(`ride:${rideId}`);
      });

      socket.on('cab-ride:chat', async ({ rideId, message }, ack) => {
        try {
          const msg = await chatService.sendCustomerMessage(socket.customer._id, rideId, { message });
          io.to(`ride:${rideId}`).emit('cab-ride:chat', msg);
          ack?.({ success: true, data: msg });
        } catch (err) {
          ack?.({ success: false, message: err.message });
        }
      });

      socket.on('customer:subscribe:nearby', async ({ lat, lng }, ack) => {
        try {
          const rideServiceCustomer = require('../cab-customer/ride.service');
          const drivers = await rideServiceCustomer.getLiveDrivers(lat, lng, 5);
          ack?.({ success: true, data: drivers });
          socket.emit('drivers:nearby', drivers);
        } catch (err) {
          ack?.({ success: false, message: err.message });
        }
      });

      // logger.info(`Customer socket connected: ${socket.customer.email}`);
      return;
    }

    socket.on('cab-driver:online', async (payload, ack) => {
      try {
        const location = await locationService.setOnlineStatus(socket.user._id, payload, io);
        ack?.({ success: true, data: location });
      } catch (err) {
        ack?.({ success: false, message: err.message, code: err.code });
      }
    });

    socket.on('cab-driver:availability', async ({ isAvailable }, ack) => {
      try {
        const location = await locationService.setAvailability(socket.user._id, isAvailable, io);
        ack?.({ success: true, data: location });
      } catch (err) {
        ack?.({ success: false, message: err.message, code: err.code });
      }
    });

    socket.on('cab-driver:location', async (payload, ack) => {
      try {
        const location = await locationService.updateLocation(
          socket.user._id,
          payload.coordinates,
          { isAvailable: payload.isAvailable, bookingId: payload.bookingId },
          io
        );
        ack?.({ success: true, data: location });
      } catch (err) {
        ack?.({ success: false, message: err.message });
      }
    });

    socket.on('cab-driver:ride:accept', async ({ rideId }, ack) => {
      try {
        const ride = await rideService.acceptRide(socket.user._id, rideId, io);
        ack?.({ success: true, data: ride });
      } catch (err) {
        ack?.({ success: false, message: err.message });
      }
    });

    socket.on('cab-ride:join', ({ rideId }) => {
      if (rideId) socket.join(`ride:${rideId}`);
    });

    socket.on('cab-ride:leave', ({ rideId }) => {
      if (rideId) socket.leave(`ride:${rideId}`);
    });

    socket.on('cab-ride:chat', async ({ rideId, message }, ack) => {
      try {
        const msg = await chatService.sendMessage(socket.user._id, rideId, { message });
        io.to(`ride:${rideId}`).emit('cab-ride:chat', msg);
        ack?.({ success: true, data: msg });
      } catch (err) {
        ack?.({ success: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
      // intentional no-op for online persistence
    });
  });

  return io;
}

module.exports = { initCabDriverSocket };
