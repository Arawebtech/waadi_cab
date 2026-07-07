const authService = require('../services/auth.service');
const bookingService = require('../services/booking.service');
const { Customer, User } = require('../models');

const resolvers = {
  Query: {
    me: async (_p, _a, ctx) => {
      if (!ctx.user) return null;
      if (ctx.user.role === 'customer') return authService.sanitizeCustomer(ctx.user);
      if (ctx.user.role === 'driver') return authService.sanitizeRider(ctx.user);
      return ctx.user;
    },
    vehicleTypes: async () => {
      const { VehicleType } = require('../models');
      return VehicleType.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    },
    intercityPackages: async (_p, { fromCity, toCity }) => {
      const { IntercityPackage } = require('../models');
      const filter = { isActive: true };
      if (fromCity) filter.fromCity = new RegExp(fromCity, 'i');
      if (toCity) filter.toCity = new RegExp(toCity, 'i');
      return IntercityPackage.find(filter).lean();
    },
    coupons: async () => {
      const { Coupon } = require('../models');
      return Coupon.find({ isActive: true }).lean();
    },
    myBookings: async (_p, { status }, ctx) => {
      if (!ctx.user || ctx.user.role !== 'customer') throw new Error('Unauthorized');
      return bookingService.getCustomerBookings(ctx.user._id, { status });
    },
    booking: async (_p, { id }, ctx) => {
      if (!ctx.user || ctx.user.role !== 'customer') throw new Error('Unauthorized');
      const bookings = await bookingService.getCustomerBookings(ctx.user._id);
      return bookings.find((b) => b.id.toString() === id);
    },
    wallet: async (_p, _a, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      const walletService = require('../services/wallet.service');
      const type = ctx.user.role === 'customer' ? 'Customer' : 'Driver';
      return walletService.getOrCreateWallet(ctx.user._id, type);
    },
    fareEstimate: async (_p, args) => {
      const data = await bookingService.getFareEstimate(args);
      return data.estimates;
    },
  },
  Mutation: {
    requestOtp: async (_p, args) => {
      await authService.requestOtp(args);
      return true;
    },
    register: async (_p, args, ctx) =>
      authService.registerWithOtp({ ...args, ipAddress: ctx.req?.ip, userAgent: ctx.req?.headers?.['user-agent'] }),
    login: async (_p, args, ctx) =>
      authService.loginWithOtp({ ...args, ipAddress: ctx.req?.ip, userAgent: ctx.req?.headers?.['user-agent'] }),
    createBooking: async (_p, args, ctx) => {
      if (!ctx.user || ctx.user.role !== 'customer') throw new Error('Unauthorized');
      return bookingService.createBooking(ctx.user._id, args, ctx.req?.app?.get?.('io'));
    },
    cancelBooking: async (_p, { id, reason }, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return bookingService.cancelBooking(ctx.user._id, ctx.user.role, id, reason, ctx.req?.app?.get?.('io'));
    },
    rateBooking: async (_p, { id, rating, review }, ctx) => {
      if (!ctx.user || ctx.user.role !== 'customer') throw new Error('Unauthorized');
      await bookingService.rateBooking(ctx.user._id, id, { rating, review });
      return true;
    },
    setDriverOnline: async (_p, args, ctx) => {
      if (!ctx.user || ctx.user.role !== 'driver') throw new Error('Forbidden');
      const riderService = require('../services/rider.service');
      await riderService.setOnlineStatus(ctx.user._id, args);
      return true;
    },
    acceptBooking: async (_p, { id }, ctx) => {
      if (!ctx.user || ctx.user.role !== 'driver') throw new Error('Forbidden');
      return bookingService.acceptBooking(ctx.user._id, id, ctx.req?.app?.get?.('io'));
    },
  },
};

module.exports = resolvers;
