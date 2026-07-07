const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const AppError = require('../utils/AppError');

const VALID_INTENTS = ['purchase', 'renew', 'replace'];

function startOfNextDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function planIdString(planOrId) {
  if (!planOrId) return null;
  if (typeof planOrId === 'string') return planOrId;
  if (planOrId._id) return String(planOrId._id);
  return String(planOrId);
}

function normalizeIntent(intent) {
  const value = String(intent || 'purchase').toLowerCase();
  return VALID_INTENTS.includes(value) ? value : 'purchase';
}

async function debitWalletAtomic(ownerId, amount, session) {
  return Wallet.findOneAndUpdate(
    { ownerId, ownerType: 'Driver', balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true, session }
  );
}

async function logWalletTransaction({ wallet, amount, balanceBefore, purpose, remark, session }) {
  await WalletTransaction.create(
    [
      {
        walletId: wallet._id,
        ownerId: wallet.ownerId,
        ownerType: wallet.ownerType,
        type: 'debit',
        purpose,
        amount,
        balanceBefore,
        balanceAfter: wallet.balance,
        remark,
      },
    ],
    { session }
  );
}

async function getActiveSubscriptionDoc(driverId) {
  return Subscription.findOne({
    driverId,
    status: 'active',
    expiryDate: { $gt: new Date() },
  });
}

async function getScheduledSubscription(driverId) {
  return Subscription.findOne({
    driverId,
    status: 'scheduled',
    paymentStatus: 'paid',
  }).sort({ startDate: 1 });
}

async function cancelScheduledSubscriptions(driverId, session, reason = 'Replaced by newer scheduled subscription') {
  await Subscription.updateMany(
    { driverId, status: 'scheduled' },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    },
    { session }
  );
}

async function resolvePurchaseIntent(driverId, planId, requestedIntent) {
  const plan = await SubscriptionPlan.findOne({
    _id: planId,
    isActive: true,
    deleted: { $ne: true },
  });
  if (!plan) throw new AppError('Invalid or inactive plan', 404);

  const intent = normalizeIntent(requestedIntent);
  const activeSub = await getActiveSubscriptionDoc(driverId);

  if (intent === 'renew') {
    if (!activeSub) {
      throw new AppError('No active subscription to renew', 400);
    }
    return { intent: 'renew', plan, activeSub };
  }

  if (activeSub) {
    const samePlan = planIdString(activeSub.planId) === planIdString(plan._id);
    if (samePlan) {
      return { intent: 'renew', plan, activeSub };
    }
    return { intent: 'replace', plan, activeSub };
  }

  return { intent: 'purchase', plan, activeSub: null };
}

async function renewActiveSubscription({
  driverId,
  plan,
  activeSub,
  paymentMethod = 'wallet',
  gateway = 'wallet',
  walletMeta = null,
  transactionId = null,
  session,
}) {
  const now = new Date();
  const oldExpiryDate = activeSub.expiryDate;
  const baseDate = oldExpiryDate && oldExpiryDate > now ? oldExpiryDate : now;
  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + plan.durationDays);

  activeSub.planId = plan._id;
  activeSub.planName = plan.name;
  activeSub.durationDays = plan.durationDays;
  activeSub.amount = (activeSub.amount || 0) + plan.amount;
  activeSub.expiryDate = newExpiry;
  activeSub.status = 'active';
  activeSub.paymentStatus = 'paid';
  activeSub.paymentMethod = paymentMethod;
  activeSub.gateway = gateway;
  activeSub.purchaseIntent = 'renew';
  activeSub.renewalCount = (activeSub.renewalCount || 0) + 1;
  activeSub.lastRenewedAt = now;
  activeSub.renewalDate = now;

  if (walletMeta?.walletUsed) {
    activeSub.walletUsed = true;
    activeSub.walletAmount = (activeSub.walletAmount || 0) + plan.amount;
  }

  await activeSub.save({ session });

  await SubscriptionHistory.create(
    [
      {
        driverId,
        subscriptionId: activeSub._id,
        planId: plan._id,
        planName: plan.name,
        amount: plan.amount,
        action: 'renew',
        paymentMethod,
        walletUsed: Boolean(walletMeta?.walletUsed),
        walletAmount: walletMeta?.walletAmount || 0,
        transactionId,
        startDate: now,
        oldExpiryDate,
        newExpiryDate: newExpiry,
        expiryDate: newExpiry,
      },
    ],
    { session }
  );

  return activeSub;
}

async function createScheduledReplacement({
  driverId,
  plan,
  activeSub,
  paymentMethod = 'wallet',
  gateway = 'wallet',
  walletMeta = null,
  transactionId = null,
  paymentOrderId = null,
  session,
}) {
  await cancelScheduledSubscriptions(driverId, session);

  const startDate = startOfNextDay(activeSub.expiryDate);
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

  const [subscription] = await Subscription.create(
    [
      {
        driverId,
        planId: plan._id,
        planName: plan.name,
        durationDays: plan.durationDays,
        amount: plan.amount,
        status: 'scheduled',
        paymentStatus: 'paid',
        paymentMethod,
        gateway,
        purchaseIntent: 'replace',
        scheduledAfterSubscriptionId: activeSub._id,
        startDate,
        expiryDate,
        transactionId,
        paymentOrderId,
        walletUsed: Boolean(walletMeta?.walletUsed),
        walletAmount: walletMeta?.walletAmount || 0,
      },
    ],
    { session }
  );

  activeSub.nextSubscriptionId = subscription._id;
  await activeSub.save({ session });

  await SubscriptionHistory.create(
    [
      {
        driverId,
        subscriptionId: subscription._id,
        planId: plan._id,
        planName: plan.name,
        amount: plan.amount,
        action: 'purchase',
        paymentMethod,
        walletUsed: Boolean(walletMeta?.walletUsed),
        walletAmount: walletMeta?.walletAmount || 0,
        transactionId,
        startDate,
        expiryDate,
        remarks: 'Scheduled to activate after current subscription expires',
      },
    ],
    { session }
  );

  return subscription;
}

async function createImmediateSubscription({
  driverId,
  plan,
  paymentMethod = 'wallet',
  gateway = 'wallet',
  walletMeta = null,
  transactionId = null,
  paymentOrderId = null,
  status = 'active',
  session,
}) {
  const startDate = new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

  const [subscription] = await Subscription.create(
    [
      {
        driverId,
        planId: plan._id,
        planName: plan.name,
        durationDays: plan.durationDays,
        amount: plan.amount,
        status,
        paymentStatus: status === 'pending' ? 'pending' : 'paid',
        paymentMethod,
        gateway,
        purchaseIntent: 'purchase',
        startDate: status === 'pending' ? null : startDate,
        expiryDate: status === 'pending' ? null : expiryDate,
        activatedAt: status === 'pending' ? null : startDate,
        transactionId,
        paymentOrderId,
        walletUsed: Boolean(walletMeta?.walletUsed),
        walletAmount: walletMeta?.walletAmount || 0,
      },
    ],
    { session }
  );

  if (status === 'active') {
    await SubscriptionHistory.create(
      [
        {
          driverId,
          subscriptionId: subscription._id,
          planId: plan._id,
          planName: plan.name,
          amount: plan.amount,
          action: 'purchase',
          paymentMethod,
          walletUsed: Boolean(walletMeta?.walletUsed),
          walletAmount: walletMeta?.walletAmount || 0,
          transactionId,
          startDate,
          expiryDate,
        },
      ],
      { session }
    );
  }

  return subscription;
}

async function finalizePaidSubscription(subscription, { txnid } = {}) {
  const plan = await SubscriptionPlan.findById(subscription.planId);
  if (!plan) throw new AppError('Plan not found', 404);

  const intent = normalizeIntent(subscription.purchaseIntent);
  const activeSub = await getActiveSubscriptionDoc(subscription.driverId);

  if (intent === 'renew') {
    if (!activeSub) {
      throw new AppError('No active subscription to renew', 400);
    }

    subscription.status = 'cancelled';
    subscription.cancelReason = 'Merged into renewal of active subscription';
    subscription.cancelledAt = new Date();
    await subscription.save();

    return renewActiveSubscription({
      driverId: subscription.driverId,
      plan,
      activeSub,
      paymentMethod: subscription.paymentMethod || 'upi',
      gateway: subscription.gateway,
      transactionId: txnid || subscription.transactionId,
    });
  }

  if (intent === 'replace' && activeSub) {
    const startDate = startOfNextDay(activeSub.expiryDate);
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    await cancelScheduledSubscriptions(subscription.driverId, null);

    subscription.status = 'scheduled';
    subscription.paymentStatus = 'paid';
    subscription.startDate = startDate;
    subscription.expiryDate = expiryDate;
    subscription.scheduledAfterSubscriptionId = activeSub._id;
    subscription.activatedAt = null;
    await subscription.save();

    activeSub.nextSubscriptionId = subscription._id;
    await activeSub.save();

    await SubscriptionHistory.create({
      driverId: subscription.driverId,
      subscriptionId: subscription._id,
      planId: plan._id,
      planName: plan.name,
      amount: subscription.amount,
      action: 'purchase',
      transactionId: txnid || subscription.transactionId,
      startDate,
      expiryDate,
      remarks: 'Scheduled to activate after current subscription expires',
    });

    return subscription;
  }

  const startDate = new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

  subscription.status = 'active';
  subscription.paymentStatus = 'paid';
  subscription.startDate = startDate;
  subscription.expiryDate = expiryDate;
  subscription.activatedAt = startDate;
  await subscription.save();

  await SubscriptionHistory.create({
    driverId: subscription.driverId,
    subscriptionId: subscription._id,
    planId: plan._id,
    planName: plan.name,
    amount: subscription.amount,
    action: 'purchase',
    transactionId: txnid || subscription.transactionId,
    startDate,
    expiryDate,
  });

  return subscription;
}

async function purchaseByWallet(driverId, planId, requestedIntent = 'purchase') {
  const session = await mongoose.startSession();
  let transactionStarted = false;

  try {
    const { intent, plan, activeSub } = await resolvePurchaseIntent(driverId, planId, requestedIntent);

    const walletBefore = await Wallet.findOne({ ownerId: driverId, ownerType: 'Driver' }).lean();
    if (!walletBefore || walletBefore.balance < plan.amount) {
      throw new AppError('Insufficient wallet balance', 400);
    }

    session.startTransaction();
    transactionStarted = true;

    const wallet = await debitWalletAtomic(driverId, plan.amount, session);
    if (!wallet) {
      throw new AppError('Insufficient wallet balance', 400);
    }

    const walletMeta = { walletUsed: true, walletAmount: plan.amount };
    const transactionId = `WALLET_${Date.now()}`;

    let subscription;
    if (intent === 'renew') {
      subscription = await renewActiveSubscription({
        driverId,
        plan,
        activeSub,
        paymentMethod: 'wallet',
        gateway: 'wallet',
        walletMeta,
        transactionId,
        session,
      });
    } else if (intent === 'replace') {
      subscription = await createScheduledReplacement({
        driverId,
        plan,
        activeSub,
        paymentMethod: 'wallet',
        gateway: 'wallet',
        walletMeta,
        transactionId,
        session,
      });
    } else {
      subscription = await createImmediateSubscription({
        driverId,
        plan,
        paymentMethod: 'wallet',
        gateway: 'wallet',
        walletMeta,
        transactionId,
        session,
      });
    }

    await logWalletTransaction({
      wallet,
      amount: plan.amount,
      balanceBefore: walletBefore.balance,
      purpose: intent === 'renew' ? 'subscription_renewal' : 'subscription_purchase',
      remark:
        intent === 'replace'
          ? `Scheduled subscription: ${plan.name}`
          : intent === 'renew'
            ? `Subscription renewal: ${plan.name}`
            : `Subscription purchase: ${plan.name}`,
      session,
    });

    await session.commitTransaction();
    transactionStarted = false;

    return {
      subscription,
      intent,
      message:
        intent === 'replace'
          ? 'New plan scheduled after current subscription expires'
          : intent === 'renew'
            ? 'Subscription renewed successfully'
            : 'Subscription purchased via wallet',
    };
  } catch (err) {
    if (transactionStarted) {
      await session.abortTransaction().catch(() => {});
    }
    throw err;
  } finally {
    session.endSession();
  }
}

async function activateScheduledSubscriptionsJob() {
  const now = new Date();
  const due = await Subscription.find({
    status: 'scheduled',
    paymentStatus: 'paid',
    startDate: { $lte: now },
  });

  if (!due.length) return 0;

  for (const sub of due) {
    const previous = sub.scheduledAfterSubscriptionId
      ? await Subscription.findById(sub.scheduledAfterSubscriptionId)
      : null;

    if (previous && previous.status === 'active' && previous.expiryDate > now) {
      continue;
    }

    sub.status = 'active';
    sub.activatedAt = now;
    await sub.save();

    if (previous && previous.status === 'active') {
      previous.status = 'expired';
      previous.expiredAt = now;
      previous.nextSubscriptionId = null;
      await previous.save();
    }

    await SubscriptionHistory.create({
      driverId: sub.driverId,
      subscriptionId: sub._id,
      planId: sub.planId,
      planName: sub.planName,
      amount: sub.amount,
      action: 'reactivate',
      startDate: sub.startDate,
      expiryDate: sub.expiryDate,
      remarks: 'Scheduled subscription activated automatically',
    });
  }

  return due.length;
}

async function getSubscriptionOverview(driverId) {
  const [active, scheduled, latest] = await Promise.all([
    Subscription.findOne({
      driverId,
      status: 'active',
      expiryDate: { $gt: new Date() },
    })
      .populate('planId')
      .sort({ expiryDate: -1 }),
    getScheduledSubscription(driverId),
    Subscription.findOne({ driverId }).populate('planId').sort({ createdAt: -1 }),
  ]);

  return {
    active,
    scheduled,
    current: active || scheduled || latest,
  };
}

module.exports = {
  VALID_INTENTS,
  normalizeIntent,
  resolvePurchaseIntent,
  purchaseByWallet,
  finalizePaidSubscription,
  renewActiveSubscription,
  createScheduledReplacement,
  createImmediateSubscription,
  activateScheduledSubscriptionsJob,
  getSubscriptionOverview,
  getScheduledSubscription,
  startOfNextDay,
};
