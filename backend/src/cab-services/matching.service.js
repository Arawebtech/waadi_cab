const { CabBooking, User, DriverLocation, Vehicle } = require('../models');
const subscriptionService = require('./subscription.service');
const redis = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');

const activeSearches = new Map();

async function findEligibleRiders(pickup, vehicleId, radiusKm, excludeRiderIds = []) {
  const requestedVehicle = await Vehicle.findById(vehicleId).lean();

  const locations = await DriverLocation.find({
    driverId: { $nin: excludeRiderIds },
    isOnline: true,
    isAvailable: true,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [pickup.lng, pickup.lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .limit(40)
    .lean();

  const riders = [];
  for (const loc of locations) {
    const canReceive = await subscriptionService.riderCanReceiveRides(loc.driverId, loc);
    if (!canReceive) continue;

    const driverVehicle = loc.vehicleId
      ? await Vehicle.findById(loc.vehicleId).lean()
      : await Vehicle.findOne({ userId: loc.driverId, isActive: true }).lean();
    if (!driverVehicle) continue;

    const exactMatch = driverVehicle._id.toString() === vehicleId.toString();
    const typeMatch =
      requestedVehicle &&
      driverVehicle.vehicleType &&
      requestedVehicle.vehicleType === driverVehicle.vehicleType;
    if (!exactMatch && !typeMatch) continue;

    riders.push({
      driverId: loc.driverId,
      location: loc,
      vehicleId: driverVehicle._id,
      distanceKm: haversineKm(pickup.lat, pickup.lng, loc.location.coordinates[1], loc.location.coordinates[0]),
    });
  }
  return riders.sort((a, b) => a.distanceKm - b.distanceKm);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stopSearch(bookingId) {
  const state = activeSearches.get(bookingId.toString());
  if (!state) return;
  state.timers.forEach(clearTimeout);
  activeSearches.delete(bookingId.toString());
}

async function cancelSearch(bookingId, io, reason) {
  stopSearch(bookingId);
  const booking = await CabBooking.findByIdAndUpdate(
    bookingId,
    { status: 'CANCELLED', cancelledBy: 'system', cancelReason: reason },
    { new: true }
  );
  if (booking && io) {
    io.to(`customer:${booking.customerId}`).emit('booking:cancelled', { bookingId, reason });
    io.to(`booking:${bookingId}`).emit('booking:status', { status: 'CANCELLED', bookingId, reason });
  }
  await redis.del(`trip-otp:${bookingId}`);
}

async function notifyRiders(booking, riders, io, sanitizeBooking) {
  if (!riders.length) return 0;
  const sanitized = await sanitizeBooking(booking);
  let notified = 0;

  for (const r of riders) {
    io.to(`rider:${r.driverId}`).emit('booking:request', {
      ...sanitized,
      distanceToPickupKm: Math.round(r.distanceKm * 10) / 10,
      expiresInSec: Math.floor(env.matching.driverResponseMs / 1000),
    });
    notified += 1;
  }

  return notified;
}

async function startMatching(bookingId, io, { sanitizeBooking, findNearbyRiders }) {
  stopSearch(bookingId);

  const booking = await CabBooking.findById(bookingId).populate('vehicleId');
  if (!booking || booking.status !== 'SEARCHING_DRIVER') return;

  const state = {
    attempt: 0,
    notifiedRiderIds: new Set(),
    timers: [],
  };
  activeSearches.set(bookingId.toString(), state);

  const runAttempt = async () => {
    const current = await CabBooking.findById(bookingId).populate('vehicleId');
    if (!current || current.status !== 'SEARCHING_DRIVER') {
      stopSearch(bookingId);
      return;
    }

    const radiusSteps = env.matching.radiusStepsKm;
    const radiusKm = radiusSteps[Math.min(state.attempt, radiusSteps.length - 1)];
    const exclude = Array.from(state.notifiedRiderIds);

    const requestedVehicleId = current.vehicleId?._id || current.vehicleId;
    const riders = await findEligibleRiders(
      current.pickup,
      requestedVehicleId,
      radiusKm,
      exclude
    );

    const newRiders = riders.filter((r) => !state.notifiedRiderIds.has(r.driverId.toString()));
    newRiders.forEach((r) => state.notifiedRiderIds.add(r.driverId.toString()));

    await notifyRiders(current, newRiders, io, sanitizeBooking);

    io.to(`customer:${current.customerId}`).emit('booking:searching', {
      bookingId: current._id,
      nearbyCount: riders.length,
      radiusKm,
      attempt: state.attempt + 1,
    });

    state.attempt += 1;

    if (state.attempt >= radiusSteps.length && newRiders.length === 0 && state.notifiedRiderIds.size === 0) {
      await cancelSearch(bookingId, io, 'No drivers available in your area');
      return;
    }

    if (Date.now() - new Date(current.createdAt).getTime() >= env.matching.searchTimeoutMs) {
      await cancelSearch(bookingId, io, 'Search timed out — please try again');
      return;
    }

    const timer = setTimeout(runAttempt, env.matching.attemptIntervalMs);
    state.timers.push(timer);
  };

  const timeoutTimer = setTimeout(async () => {
    const current = await CabBooking.findById(bookingId);
    if (current?.status === 'SEARCHING_DRIVER') {
      await cancelSearch(bookingId, io, 'No drivers accepted your request');
    }
  }, env.matching.searchTimeoutMs);
  state.timers.push(timeoutTimer);

  await runAttempt();
}

async function onBookingAccepted(bookingId) {
  stopSearch(bookingId);
}

async function storeTripOtp(bookingId, otp) {
  await redis.set(`trip-otp:${bookingId}`, otp, 24 * 60 * 60);
}

async function getTripOtp(bookingId) {
  return redis.get(`trip-otp:${bookingId}`);
}

async function clearTripOtp(bookingId) {
  await redis.del(`trip-otp:${bookingId}`);
}

async function getOnlineRiderLocations() {
  const locations = await DriverLocation.find({ isOnline: true }).lean();
  const results = [];

  for (const loc of locations) {
    const rider = await User.findById(loc.driverId).select('firstName status').lean();
    if (!rider || rider.status !== 'active') continue;

    const vehicle = await Vehicle.findOne({ userId: loc.driverId, isActive: true }).lean();

    results.push({
      driverId: loc.driverId.toString(),
      coordinates: {
        lat: loc.location.coordinates[1],
        lng: loc.location.coordinates[0],
      },
      heading: loc.heading ?? 0,
      isAvailable: loc.isAvailable,
      isOnline: loc.isOnline,
      bookingId: loc.bookingId,
      vehicleId: loc.vehicleId || vehicle?._id || null,
      lastSeen: loc.lastSeen,
      updatedAt: loc.updatedAt,
      riderName: rider.fullName,
      vehicle: vehicle
        ? {
            id: vehicle._id,
            vehicleNumber: vehicle.vehicleNumber,
            vehicleType: vehicle.vehicleType,
            seatCapacity: vehicle.seatCapacity,
          }
        : null,
    });
  }

  return results;
}

async function getLiveDriversNear(pickup, radiusKm = 5) {
  const locations = await DriverLocation.find({
    isOnline: true,
    isAvailable: true,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [pickup.lng, pickup.lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .limit(50)
    .lean();

  const markers = [];
  const seen = new Set();

  for (const loc of locations) {
    const id = loc.driverId.toString();
    if (seen.has(id)) continue;
    const canShow = await subscriptionService.riderCanReceiveRides(loc.driverId, loc);
    if (!canShow) continue;
    seen.add(id);
    markers.push({
      driverId: id,
      lat: loc.location.coordinates[1],
      lng: loc.location.coordinates[0],
      heading: loc.heading ?? 0,
      updatedAt: loc.updatedAt,
    });
  }
  return markers;
}

module.exports = {
  startMatching,
  stopSearch,
  onBookingAccepted,
  findEligibleRiders,
  storeTripOtp,
  getTripOtp,
  clearTripOtp,
  getOnlineRiderLocations,
  getLiveDriversNear,
};
