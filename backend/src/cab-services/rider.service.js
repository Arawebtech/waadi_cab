const { User, Vehicle, CabBooking } = require('../models');
const AppError = require('../utils/AppError');
const subscriptionService = require('./subscription.service');
const driverLocationService = require('./driverLocation.service');
const bankDetailService = require('./bankDetail.service');
const kycService = require('./kyc.service');

async function getRiderProfile(driverId) {
  const rider = await User.findById(driverId).lean();
  if (!rider) throw new AppError('Driver profile not found', 404);

  const [kyc, subscription, vehicle, bank, driverLocation] = await Promise.all([
    kycService.getKycStatus(driverId),
    subscriptionService.getSubscriptionSummary(driverId),
    Vehicle.findOne({ userId: driverId, isActive: true }).lean(),
    bankDetailService.getByRiderId(driverId),
    driverLocationService.getLocationRecord(driverId),
  ]);

  const subActive = subscription.subscriptionStatus === 'active';
  const canGoOnline = rider.status === 'active' && subActive;

  return {
    rider,
    kyc,
    subscription,
    vehicle,
    bank,
    driverLocation,
    canGoOnline,
    canReceiveRides: driverLocation
      ? await subscriptionService.riderCanReceiveRides(driverId, driverLocation)
      : false,
    profileCompletion: buildProfileCompletion(rider, kyc, vehicle, bank, subscription),
  };
}

function buildProfileCompletion(rider, kyc, vehicle, bank, subscription) {
  const basicComplete = !!(rider.fullName && rider.email && rider.phone && rider.termsAccepted?.terms);
  const docsComplete = kyc?.documents?.length >= 5 && kyc.missingDocs?.length === 0;
  const vehicleComplete = !!vehicle;
  const bankComplete = !!bank;
  const subscriptionActive = subscription?.subscriptionStatus === 'active';

  return {
    basicProfile: basicComplete,
    documents: docsComplete
      ? rider.verificationStatus === 'approved'
        ? 'approved'
        : rider.verificationStatus === 'rejected'
          ? 'rejected'
          : 'pending'
      : 'pending',
    vehicle: vehicle
      ? vehicle.verificationStatus || 'pending'
      : 'pending',
    bank: bank ? bank.verificationStatus : 'pending',
    subscription: subscriptionActive ? 'active' : subscription?.subscriptionStatus || 'none',
    percent: Math.round(
      ([basicComplete, docsComplete, vehicleComplete, bankComplete, subscriptionActive].filter(Boolean).length /
        5) *
        100
    ),
  };
}

async function setOnlineStatus(driverId, payload) {
  return driverLocationService.setOnlineStatus(driverId, payload);
}

async function updateBankDetails(driverId, bankDetails) {
  return bankDetailService.upsertBankDetails(driverId, bankDetails);
}

async function getEarnings(driverId, { period = 'today' } = {}) {
  const rider = await User.findById(driverId);
  if (!rider) throw new AppError('Driver rofile not found', 404);

  const now = new Date();
  let startDate = new Date();
  switch (period) {
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    default:
      startDate.setHours(0, 0, 0, 0);
  }

  const completedBookings = await CabBooking.find({
    driverId,
    status: 'TRIP_COMPLETED',
    tripCompletedAt: { $gte: startDate },
  }).lean();

  const total = completedBookings.reduce((sum, b) => sum + (b.fare?.total || 0) * 0.8, 0);

  return {
    period,
    total: Math.round(total * 100) / 100,
    rides: completedBookings.length,
    incentives: rider.incentives,
    performance: { rating: rider.rating, totalRides: rider.totalRides, acceptanceRate: 95 },
  };
}

async function getNearbyRequests(driverId) {
  const driverLocation = await driverLocationService.getLocationRecord(driverId);
  if (!(await subscriptionService.riderCanReceiveRides(driverId, driverLocation))) return [];

  const vehicle = await Vehicle.findOne({ userId: driverId, isActive: true }).lean();
  const activeVehicleId = driverLocation?.vehicleId || vehicle?._id;
  if (!activeVehicleId) return [];

  const loc = driverLocation;
  if (!loc?.location?.coordinates) return [];

  const [lng, lat] = loc.location.coordinates;
  const radiusKm = 15;

  const bookings = await CabBooking.find({
    status: 'SEARCHING_DRIVER',
    'pickup.lat': { $gte: lat - 0.15, $lte: lat + 0.15 },
    'pickup.lng': { $gte: lng - 0.15, $lte: lng + 0.15 },
  })
    .populate('vehicleId')
    .populate('customerId', 'fullName phone profileImage')
    .limit(20)
    .lean();

  return bookings.filter((b) => {
    const dLat = (b.pickup.lat - lat) * 111;
    const dLng = (b.pickup.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
    if (Math.sqrt(dLat * dLat + dLng * dLng) > radiusKm) return false;

    const requested = b.vehicleId;
    if (!requested || !vehicle) return false;
    const requestedId = requested._id || requested;
    if (requestedId.toString() === activeVehicleId.toString()) return true;
    if (requested.vehicleType && vehicle.vehicleType === requested.vehicleType) return true;
    return false;
  });
}

module.exports = {
  getRiderProfile,
  buildProfileCompletion,
  setOnlineStatus,
  updateBankDetails,
  getEarnings,
  getNearbyRequests,
};
