const Subscription = require('../models/Subscription');

/**
 * Pure subscription queries — no imports from driverLocation or other domain services.
 * Shared by subscription.service and driverLocation.service to avoid circular deps.
 */
async function isSubscriptionActiveForRider(driverId) {
  const sub = await Subscription.findOne({
    driverId,
    status: 'active',
    paymentStatus: 'paid',
    expiryDate: { $gt: new Date() },
  }).lean();
  return !!sub;
}

async function getActiveSubscription(driverId) {
  return Subscription.findOne({
    driverId,
    status: 'active',
    paymentStatus: 'paid',
    expiryDate: { $gt: new Date() },
  })
    .sort({ expiryDate: -1 })
    .lean();
}

module.exports = {
  isSubscriptionActiveForRider,
  getActiveSubscription,
};
