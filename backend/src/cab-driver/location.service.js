const DriverLocation = require('../models/DriverLocation');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const profileService = require('./profile.service');

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

function serializeDriverLocation(loc) {
  if (!loc) return null;
  const [lng, lat] = loc.location?.coordinates || [];
  return {
    driverId: loc.driverId,
    vehicleId: loc.vehicleId || null,
    location: lat != null && lng != null ? { lat, lng } : null,
    isOnline: Boolean(loc.isOnline),
    isAvailable: Boolean(loc.isAvailable),
    bookingId: loc.bookingId || null,
    heading: loc.heading ?? 0,
    speed: loc.speed ?? 0,
    lastSeen: loc.lastSeen,
  };
}

function broadcastDriverLocation(io, location) {
  if (!io || !location) return;
  const payload = serializeDriverLocation(location);
  if (!payload) return;

  io.emit('driver:status:update', payload);
  io.emit('driver:location:update', payload);

  io.emit('cab-driver:status', {
    driverId: payload.driverId,
    isOnline: payload.isOnline,
    isAvailable: payload.isAvailable,
    vehicleId: payload.vehicleId,
    bookingId: payload.bookingId,
  });

  if (payload.location) {
    io.emit('cab-driver:location', {
      driverId: payload.driverId,
      vehicleId: payload.vehicleId,
      lat: payload.location.lat,
      lng: payload.location.lng,
      heading: payload.heading,
      speed: payload.speed,
      isOnline: payload.isOnline,
      isAvailable: payload.isAvailable,
      bookingId: payload.bookingId,
      lastUpdated: payload.lastSeen,
    });
  }

  const roomId = payload.bookingId;
  if (roomId) {
    io.to(`ride:${roomId}`).emit('driver:location:update', payload);
    io.to(`ride:${roomId}`).emit('driver:status:update', payload);
    io.to(`booking:${roomId}`).emit('driver:location:update', payload);
    io.to(`booking:${roomId}`).emit('driver:status:update', payload);
  }
}

async function assertCanGoOnline(userId) {
  const summary = await profileService.getVerificationSummary(userId);
  if (!summary.canGoOnline) {
    const err = new Error('Complete verification and subscription before going online');
    err.statusCode = 403;
    err.code = 'CAB_NOT_ELIGIBLE';
    throw err;
  }
  return summary;
}

async function resolveVehicleForOnline(userId, vehicleId) {
  const vehicles = await Vehicle.find({ userId, isActive: true }).sort({ isDefault: -1, updatedAt: -1 }).lean();
  if (!vehicles.length) {
    const err = new Error('Add a vehicle before going online');
    err.statusCode = 400;
    err.code = 'NO_VEHICLE';
    throw err;
  }

  if (vehicles.length === 1) {
    const only = vehicles[0];
    if (!only.isDefault) {
      await Vehicle.updateMany({ userId }, { $set: { isDefault: false } });
      await Vehicle.findByIdAndUpdate(only._id, { $set: { isDefault: true } });
    }
    await User.findByIdAndUpdate(userId, { $set: { 'cabBooking.activeVehicleId': only._id } });
    return only._id;
  }

  if (vehicleId) {
    const match = vehicles.find((v) => v._id.toString() === String(vehicleId));
    if (!match) {
      const err = new Error('Vehicle not found');
      err.statusCode = 404;
      throw err;
    }
    return match._id;
  }

  const defaultV = vehicles.find((v) => v.isDefault);
  if (defaultV) return defaultV._id;

  const user = await User.findById(userId).select('cabBooking.activeVehicleId').lean();
  if (user?.cabBooking?.activeVehicleId) {
    const fromProfile = vehicles.find((v) => v._id.toString() === user.cabBooking.activeVehicleId.toString());
    if (fromProfile) return fromProfile._id;
  }

  const err = new Error('Select an active vehicle');
  err.statusCode = 422;
  err.code = 'VEHICLE_SELECTION_REQUIRED';
  throw err;
}

async function getLocation(userId) {
  return DriverLocation.findOne({ driverId: userId }).lean();
}

async function getLocationStatus(userId) {
  const location = await getLocation(userId);
  const rideService = require('./ride.service');
  const activeRide = await rideService.getActiveRide(userId);
  const serialized = serializeDriverLocation(location) || {
    driverId: userId,
    vehicleId: null,
    location: null,
    isOnline: false,
    isAvailable: false,
    bookingId: null,
    heading: 0,
    speed: 0,
    lastSeen: null,
  };
  return {
    ...serialized,
    availabilityStatus: deriveAvailabilityStatus(location, Boolean(activeRide)),
    activeRide,
  };
}

async function setOnlineStatus(userId, { isOnline, isAvailable, coordinates, vehicleId }, io = null) {
  const user = await User.findById(userId);
  if (!user?.isActive) {
    const err = new Error('Account inactive');
    err.statusCode = 403;
    throw err;
  }

  if (!isOnline) {
    const location = await DriverLocation.findOneAndUpdate(
      { driverId: userId },
      {
        $set: {
          isOnline: false,
          isAvailable: false,
          lastSeen: new Date(),
        },
      },
      { new: true }
    ).lean();
    broadcastDriverLocation(io, location);
    return location;
  }

  await assertCanGoOnline(userId);
  const activeVehicleId = await resolveVehicleForOnline(userId, vehicleId);

  const update = {
    isOnline: true,
    isAvailable: isAvailable !== false,
    lastSeen: new Date(),
    vehicleId: activeVehicleId,
  };

  if (isValidCoordinates(coordinates)) {
    update.location = {
      type: 'Point',
      coordinates: [coordinates.lng, coordinates.lat],
    };
    update.heading = coordinates.heading ?? 0;
    update.speed = coordinates.speed ?? 0;
  } else {
    const existing = await DriverLocation.findOne({ driverId: userId }).lean();
    if (!existing?.location?.coordinates?.length) {
      const err = new Error('Location coordinates required to go online');
      err.statusCode = 400;
      throw err;
    }
  }

  const location = await DriverLocation.findOneAndUpdate(
    { driverId: userId },
    { $set: update, $setOnInsert: { driverId: userId } },
    { new: true, upsert: true }
  ).lean();

  broadcastDriverLocation(io, location);
  return location;
}

async function setAvailability(userId, isAvailable, io = null) {
  const loc = await DriverLocation.findOne({ driverId: userId });
  if (!loc?.isOnline) {
    const err = new Error('Go online before changing availability');
    err.statusCode = 400;
    throw err;
  }

  const location = await DriverLocation.findOneAndUpdate(
    { driverId: userId },
    { $set: { isAvailable: Boolean(isAvailable), lastSeen: new Date() } },
    { new: true }
  ).lean();

  broadcastDriverLocation(io, location);
  return location;
}

async function updateLocation(userId, coordinates, extra = {}, io = null) {
  if (!isValidCoordinates(coordinates)) {
    const err = new Error('Invalid coordinates');
    err.statusCode = 400;
    throw err;
  }

  const loc = await DriverLocation.findOne({ driverId: userId });
  if (!loc?.isOnline) {
    const err = new Error('Driver is offline');
    err.statusCode = 400;
    throw err;
  }

  const update = {
    location: { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] },
    heading: coordinates.heading ?? 0,
    speed: coordinates.speed ?? 0,
    lastSeen: new Date(),
  };

  if (extra.isAvailable !== undefined) update.isAvailable = extra.isAvailable;
  if (extra.bookingId !== undefined) update.bookingId = extra.bookingId;

  const location = await DriverLocation.findOneAndUpdate(
    { driverId: userId },
    { $set: update },
    { new: true }
  ).lean();

  broadcastDriverLocation(io, location);
  return location;
}

function deriveAvailabilityStatus(location, hasActiveRide) {
  if (!location?.isOnline) return 'offline';
  if (hasActiveRide || location.bookingId) return 'on_trip';
  if (location.isAvailable) return 'available';
  return 'busy';
}

module.exports = {
  getLocation,
  getLocationStatus,
  setOnlineStatus,
  setAvailability,
  updateLocation,
  resolveVehicleForOnline,
  serializeDriverLocation,
  broadcastDriverLocation,
  isValidCoordinates,
  deriveAvailabilityStatus,
  assertCanGoOnline,
};
