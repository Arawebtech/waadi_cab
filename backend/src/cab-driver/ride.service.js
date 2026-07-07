const crypto = require('crypto');
const CabRide = require('../models/CabRide');
const DriverLocation = require('../models/DriverLocation');
const locationService = require('./location.service');
const profileService = require('./profile.service');

const ACTIVE_DRIVER_STATUSES = [
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'OTP_VERIFICATION',
  'TRIP_STARTED',
];

function generateTripOtp() {
  return String(crypto.randomInt(1000, 9999));
}

async function broadcastRideRequest(io, ride) {
  if (!io || !ride) return;
  io.emit('cab-ride:request', ride);
}

function generateRideNumber() {
  return `CR${Date.now().toString(36).toUpperCase()}${crypto.randomInt(100, 999)}`;
}

async function assertCanReceiveRides(driverId) {
  const summary = await profileService.getVerificationSummary(driverId);
  if (!summary.canGoOnline) {
    const err = new Error('Not eligible to receive rides');
    err.statusCode = 403;
    throw err;
  }
  const loc = await DriverLocation.findOne({ driverId }).lean();
  if (!loc?.isOnline || !loc.isAvailable) {
    const err = new Error('Go online and set availability to receive rides');
    err.statusCode = 403;
    throw err;
  }
  return { summary, location: loc };
}

async function getPendingRequests(driverId) {
  await assertCanReceiveRides(driverId);
  const loc = await DriverLocation.findOne({ driverId }).lean();
  if (!loc?.location?.coordinates?.length) return [];

  const now = new Date();
  return CabRide.find({
    status: 'SEARCHING_DRIVER',
    $or: [{ searchExpiresAt: null }, { searchExpiresAt: { $gt: now } }],
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
}

async function acceptRide(driverId, rideId, io) {
  await assertCanReceiveRides(driverId);
  const profile = await profileService.getDriverProfile(driverId);
  const driverLoc = await DriverLocation.findOne({ driverId }).lean();
  const vehicleId = driverLoc?.vehicleId || profile.activeVehicle?._id;

  const ride = await CabRide.findOneAndUpdate(
    {
      _id: rideId,
      status: 'SEARCHING_DRIVER',
    },
    {
      $set: {
        status: 'DRIVER_ARRIVING',
        driverId,
        vehicleId,
        assignedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!ride) {
    const err = new Error('Ride unavailable or already taken');
    err.statusCode = 409;
    throw err;
  }

  await DriverLocation.findOneAndUpdate(
    { driverId },
    { $set: { isAvailable: false, bookingId: ride._id } },
    { new: true }
  );

  const rideObj = ride.toObject();
  const loc = await DriverLocation.findOne({ driverId }).lean();
  locationService.broadcastDriverLocation(io, loc);

  if (io) {
    const customerRideService = require('../cab-customer/ride.service');
    const serialized = await customerRideService.serializeRide(rideObj, true);
    const statusPayload = { rideId: ride._id, status: ride.status, ride: serialized };
    io.emit('cab-ride:assigned', { rideId: ride._id, driverId, status: ride.status });
    io.to(`driver:${driverId}`).emit('cab-ride:accepted', rideObj);
    io.to(`ride:${ride._id}`).emit('cab-ride:status', statusPayload);
    if (ride.customerId) {
      io.to(`customer:${ride.customerId}`).emit('cab-ride:driver_assigned', serialized);
      io.to(`customer:${ride.customerId}`).emit('cab-ride:status', statusPayload);
    }
  }

  return rideObj;
}

async function rejectRide(driverId, rideId) {
  await assertCanReceiveRides(driverId);
  return { rideId, driverId, rejected: true };
}

async function updateRideStatus(driverId, rideId, status) {
  const ride = await CabRide.findOne({ _id: rideId, driverId });
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }

  const allowed = {
    DRIVER_ARRIVING: ['DRIVER_ASSIGNED'],
    DRIVER_ARRIVED: ['DRIVER_ARRIVING'],
    OTP_VERIFICATION: ['DRIVER_ARRIVED'],
    TRIP_STARTED: ['DRIVER_ARRIVED', 'OTP_VERIFICATION'],
    TRIP_COMPLETED: ['TRIP_STARTED'],
    CANCELLED: ACTIVE_DRIVER_STATUSES,
  };

  if (!allowed[status]?.includes(ride.status)) {
    const err = new Error(`Cannot transition from ${ride.status} to ${status}`);
    err.statusCode = 400;
    throw err;
  }

  ride.status = status;
  if (status === 'DRIVER_ARRIVING') ride.assignedAt = ride.assignedAt || new Date();
  if (status === 'DRIVER_ARRIVED') {
    ride.arrivedAt = new Date();
    ride.tripOtp = generateTripOtp();
    ride.status = 'OTP_VERIFICATION';
  }
  if (status === 'OTP_VERIFICATION' && !ride.tripOtp) {
    ride.tripOtp = generateTripOtp();
  }
  if (status === 'TRIP_STARTED') ride.startedAt = new Date();
  if (status === 'TRIP_COMPLETED') {
    const paymentComplete = ['paid', 'paid_by_cash'].includes(ride.paymentStatus);
    if (!paymentComplete) {
      const err = new Error('Customer payment is pending. Trip cannot be completed.');
      err.statusCode = 400;
      throw err;
    }
    ride.completedAt = new Date();
    ride.paymentStatus = ride.paymentStatus || 'pending';
    ride.adminCommission = 0;
    ride.driverEarnings = ride.fare?.total || 0;
    await DriverLocation.findOneAndUpdate(
      { driverId },
      { $set: { isAvailable: true, bookingId: null } }
    );
  }
  if (status === 'CANCELLED') {
    ride.cancelledBy = 'driver';
    await DriverLocation.findOneAndUpdate(
      { driverId },
      { $set: { isAvailable: true, bookingId: null } }
    );
  }

  await ride.save();
  const loc = await DriverLocation.findOne({ driverId }).lean();
  return { ride: ride.toObject(), location: loc };
}

async function verifyTripOtp(driverId, rideId, otp) {
  const ride = await CabRide.findOne({ _id: rideId, driverId });
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  if (ride.status !== 'OTP_VERIFICATION') {
    const err = new Error('OTP verification not required');
    err.statusCode = 400;
    throw err;
  }
  if (String(ride.tripOtp) !== String(otp)) {
    const err = new Error('Invalid OTP');
    err.statusCode = 400;
    throw err;
  }
  ride.status = 'TRIP_STARTED';
  ride.startedAt = new Date();
  await ride.save();
  return ride.toObject();
}

async function getDriverRides(driverId, { status, page = 1, limit = 10 } = {}) {
  const filter = { driverId };
  if (status) filter.status = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    CabRide.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CabRide.countDocuments(filter),
  ]);
  return {
    items,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  };
}

async function getActiveRide(driverId) {
  return CabRide.findOne({
    driverId,
    status: { $in: ACTIVE_DRIVER_STATUSES },
  }).lean();
}

/** Seed demo ride requests for development when pool is empty */
async function seedDemoRequestsIfEmpty() {
  const count = await CabRide.countDocuments({ status: 'SEARCHING_DRIVER' });
  if (count > 0) return;

  const demos = [
    {
      rideNumber: generateRideNumber(),
      pickup: { address: 'Indore Railway Station', lat: 22.7006, lng: 75.8277 },
      drop: { address: 'Vijay Nagar, Indore', lat: 22.7533, lng: 75.8937 },
      fare: { base: 50, distance: 80, total: 130 },
      distanceKm: 8.2,
      durationMin: 22,
      status: 'SEARCHING_DRIVER',
      searchExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
    {
      rideNumber: generateRideNumber(),
      pickup: { address: 'Palasia Square', lat: 22.724, lng: 75.883 },
      drop: { address: 'Airport Road', lat: 22.7218, lng: 75.8015 },
      fare: { base: 60, distance: 120, total: 180 },
      distanceKm: 12.4,
      durationMin: 28,
      status: 'SEARCHING_DRIVER',
      searchExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  ];

  await CabRide.insertMany(demos);
}

module.exports = {
  getPendingRequests,
  acceptRide,
  rejectRide,
  updateRideStatus,
  verifyTripOtp,
  getDriverRides,
  getActiveRide,
  seedDemoRequestsIfEmpty,
  broadcastRideRequest,
  ACTIVE_DRIVER_STATUSES,
};
