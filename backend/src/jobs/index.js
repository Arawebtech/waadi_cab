const subscriptionService = require('../cab-services/subscription.service');
const logger = require('../utils/logger');

function startJobs() {
  expireSubscriptions();
  dispatchScheduledRides();
  markStaleDriversOffline();

  setInterval(expireSubscriptions, 60 * 60 * 1000);
  setInterval(dispatchScheduledRides, 60 * 1000);
  setInterval(markStaleDriversOffline, 30 * 1000);

  logger.info('Background jobs started');
}

async function markStaleDriversOffline() {
  try {
    const driverLocationService = require('../services/driverLocation.service');
    const count = await driverLocationService.markStaleDriversOffline();
    if (count > 0) logger.info(`Marked ${count} stale drivers offline`);
  } catch (err) {
    logger.error(`Stale driver job failed: ${err.message}`);
  }
}

async function expireSubscriptions() {
  try {
    await subscriptionService.expireSubscriptionsJob();
  } catch (err) {
    logger.error(`Subscription expiry job failed: ${err.message}`);
  }
}

async function dispatchScheduledRides() {
  try {
    const { Booking } = require('../models');
    const matchingService = require('../services/matching.service');
    const bookingService = require('../services/booking.service');

    const due = await Booking.find({
      status: 'REQUESTED',
      scheduledAt: { $lte: new Date() },
    }).limit(20);

    for (const booking of due) {
      await Booking.findByIdAndUpdate(booking._id, { status: 'SEARCHING_DRIVER' });
      const io = global.__cabBookingIo;
      if (io) {
        matchingService.startMatching(booking._id, io, {
          sanitizeBooking: bookingService.sanitizeBooking,
          findNearbyRiders: bookingService.findNearbyRiders,
        });
      }
    }
  } catch (err) {
    logger.error(`Scheduled ride dispatch failed: ${err.message}`);
  }
}

module.exports = { startJobs };
