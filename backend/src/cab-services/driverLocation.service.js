const { DriverLocation, User } = require('../models');
const AppError = require('../utils/AppError');
const { isSubscriptionActiveForRider } = require('./subscriptionEligibility.service');

const OFFLINE_TIMEOUT_MS = Number(process.env.DRIVER_OFFLINE_TIMEOUT_MS) || 120_000;

function isValidCoordinates(coordinates) {
  if (!coordinates || typeof coordinates !== 'object') return false;
  const { lat, lng } = coordinates;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

async function getLocationRecord(driverId) {
  return DriverLocation.findOne({ driverId }).lean();
}

/**
 * Go online / offline.
 * Online: requires valid coordinates (creates DriverLocation if missing).
 * Offline: no GPS or coordinates required.
 */
async function setOnlineStatus(driverId, { isOnline, isAvailable, coordinates }) {
  const rider = await User.findById(driverId);
  if (!rider) throw new AppError('Driver profile not found', 404);

  if (rider.status !== 'active') {
    throw new AppError('Your account is suspended. Contact support.', 403);
  }

  if (!isOnline) {
    return DriverLocation.findOneAndUpdate(
      { driverId },
      {
        $set: {
          isOnline: false,
          isAvailable: false,
          bookingId: null,
          lastSeen: new Date(),
        },
      },
      { new: true }
    );
  }

  const subActive = await isSubscriptionActiveForRider(driverId);
  if (!subActive) {
    throw new AppError('Active subscription required to go online. Purchase or renew a plan.', 403);
  }

  const hasCoordinates = isValidCoordinates(coordinates);
  if (!hasCoordinates) {
    const existing = await DriverLocation.findOne({ driverId }).lean();
    const hasStored = (existing?.location?.coordinates?.length ?? 0) >= 2;
    if (!hasStored) {
      throw new AppError(
        'Location coordinates required to go online. Enable GPS and try again.',
        400
      );
    }
  }

  const update = {
    isOnline: true,
    isAvailable: isAvailable ?? true,
    lastSeen: new Date(),
  };

  if (hasCoordinates) {
    update.location = {
      type: 'Point',
      coordinates: [coordinates.lng, coordinates.lat],
    };
    update.heading = coordinates.heading ?? 0;
    update.speed = coordinates.speed ?? 0;
  }

  return DriverLocation.findOneAndUpdate(
    { driverId },
    { $set: update, $setOnInsert: { driverId } },
    { new: true, upsert: true, runValidators: true }
  );
}

async function updateLocation(driverId, coordinates, bookingId) {
  if (!isValidCoordinates(coordinates)) {
    throw new AppError('Invalid coordinates', 400);
  }

  const update = {
    driverId,
    location: { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] },
    heading: coordinates.heading ?? 0,
    speed: coordinates.speed ?? 0,
    lastSeen: new Date(),
  };

  if (bookingId !== undefined) {
    update.bookingId = bookingId || null;
  }

  return DriverLocation.findOneAndUpdate(
    { driverId },
    { $set: update },
    { upsert: true, new: true, runValidators: true }
  );
}

async function forceOffline(driverId) {
  return DriverLocation.findOneAndUpdate(
    { driverId },
    { $set: { isOnline: false, isAvailable: false, bookingId: null, lastSeen: new Date() } },
    { new: true }
  );
}

async function markStaleDriversOffline() {
  const cutoff = new Date(Date.now() - OFFLINE_TIMEOUT_MS);
  const stale = await DriverLocation.find({
    isOnline: true,
    lastSeen: { $lt: cutoff },
  }).select('driverId');

  if (!stale.length) return 0;

  await DriverLocation.updateMany(
    { driverId: { $in: stale.map((s) => s.driverId) } },
    { $set: { isOnline: false, isAvailable: false, bookingId: null } }
  );

  return stale.length;
}

async function getOnlineLocations(filter = {}) {
  return DriverLocation.find({ isOnline: true, ...filter }).lean();
}

module.exports = {
  getLocationRecord,
  setOnlineStatus,
  updateLocation,
  forceOffline,
  markStaleDriversOffline,
  getOnlineLocations,
  isValidCoordinates,
  OFFLINE_TIMEOUT_MS,
};
