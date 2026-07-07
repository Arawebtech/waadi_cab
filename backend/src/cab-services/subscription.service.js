const { Subscription, SubscriptionPlan, SubscriptionHistory, User, Notification } = require('../models');
const AppError = require('../utils/AppError');
const auditService = require('./audit.service');
const {
  isSubscriptionActiveForRider,
  getActiveSubscription,
} = require('./subscriptionEligibility.service');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

async function getSubscriptionSummary(driverId) {
  const active = await getActiveSubscription(driverId);

  if (active) {
    return {
      subscriptionStatus: 'active',
      subscriptionExpiryDate: active.expiryDate,
      activeSubscriptionId: active._id,
      currentPlan: active.planName,
    };
  }

  const latest = await Subscription.findOne({ driverId }).sort({ expiryDate: -1 }).lean();
  return {
    subscriptionStatus: latest ? 'expired' : 'none',
    subscriptionExpiryDate: latest?.expiryDate ?? null,
    activeSubscriptionId: null,
    currentPlan: latest?.planName ?? null,
  };
}

async function riderCanReceiveRides(driverId, driverLocation) {
  const rider = await User.findById(driverId).select(isActive).lean();
  if (!rider || rider.status !== 'active') return false;
  if (!driverLocation?.isOnline || !driverLocation?.isAvailable) return false;
  return isSubscriptionActiveForRider(driverId);
}

function isSubscriptionActive(riderOrSummary) {
  if (!riderOrSummary) return false;
  if (typeof riderOrSummary === 'object' && riderOrSummary.subscriptionStatus !== undefined) {
    return (
      riderOrSummary.subscriptionStatus === 'active' &&
      riderOrSummary.subscriptionExpiryDate &&
      new Date(riderOrSummary.subscriptionExpiryDate) > new Date()
    );
  }
  return false;
}

async function getActivePlans() {
  return SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
}

async function getCurrentSubscription(driverId) {
  return getActiveSubscription(driverId);
}

async function purchasePlan(driverId, planId, paymentMethod = 'upi', paymentId = null) {
  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
  if (!plan) throw new AppError('Plan not found', 404);

  const rider = await User.findById(driverId);
  if (!rider) throw new AppError('Driver not found', 404);

  if (!paymentId && env.nodeEnv === 'production') {
    throw new AppError('Payment verification required. Use /payments/create-order first.', 402);
  }

  return activatePlanAfterPayment(driverId, planId, paymentId || `manual_${uuidv4().slice(0, 8)}`);
}

async function activatePlanAfterPayment(driverId, planId, transactionId) {
  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
  if (!plan) throw new AppError('Plan not found', 404);

  const rider = await User.findById(driverId);
  if (!rider) throw new AppError('Driver not found', 404);

  const current = await getCurrentSubscription(driverId);
  const now = new Date();
  let startDate = now;
  if (current?.expiryDate && new Date(current.expiryDate) > now) {
    startDate = new Date(current.expiryDate);
  }

  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

  const subscription = await Subscription.create({
    driverId,
    planId: plan._id,
    planName: plan.name,
    durationDays: plan.durationDays,
    amount: plan.amount,
    startDate,
    expiryDate,
    status: 'active',
    paymentStatus: 'paid',
    transactionId,
  });

  await SubscriptionHistory.create({
    driverId,
    subscriptionId: subscription._id,
    planId: plan._id,
    planName: plan.name,
    amount: plan.amount,
    action: current ? 'renew' : 'purchase',
    transactionId,
    startDate,
    expiryDate,
  });

  await Notification.create({
    accountId: driverId,
    accountType: 'Driver',
    title: 'Subscription activated',
    body: `${plan.name} active until ${expiryDate.toDateString()}`,
    type: 'subscription',
    data: { subscriptionId: subscription._id },
  });

  await auditService.log({
    actorType: 'rider',
    actorId: driverId,
    action: 'subscription_purchase',
    resource: 'Subscription',
    resourceId: subscription._id,
    metadata: { planName: plan.name, amount: plan.amount },
  });

  return subscription;
}

async function getHistory(driverId) {
  return SubscriptionHistory.find({ driverId }).sort({ createdAt: -1 }).limit(50).lean();
}

async function expireSubscriptionsJob() {
  const lifecycle = require('./subscriptionLifecycle.service');

  const expiredSubs = await Subscription.find({
    status: 'active',
    expiryDate: { $lte: new Date() },
  });

  const driverLocationService = require('./driverLocation.service');

  for (const sub of expiredSubs) {
    sub.status = 'expired';
    sub.expiredAt = new Date();
    await sub.save();

    await SubscriptionHistory.create({
      driverId: sub.driverId,
      subscriptionId: sub._id,
      planName: sub.planName,
      amount: 0,
      action: 'expire',
    });

    await driverLocationService.forceOffline(sub.driverId);

    await Notification.create({
      accountId: sub.driverId,
      accountType: 'Driver',
      title: 'Subscription expired',
      body: 'Your subscription has expired. Renew to go online again.',
      type: 'subscription',
    });
  }

  await lifecycle.activateScheduledSubscriptionsJob();

  return expiredSubs.length;
}

module.exports = {
  isSubscriptionActive,
  isSubscriptionActiveForRider,
  getSubscriptionSummary,
  riderCanReceiveRides,
  getActivePlans,
  getCurrentSubscription,
  purchasePlan,
  activatePlanAfterPayment,
  getHistory,
  expireSubscriptionsJob,
};
