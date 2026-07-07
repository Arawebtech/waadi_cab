// const Subscription = require('../models/Subscription');
// const SubscriptionPlan = require('../models/SubscriptionPlan');
// const PaymentOrder = require('../models/PaymentOrder');
// const gatewayResolver = require('../utils/gatewayResolver');
// const SubscriptionHistory = require('../models/SubscriptionHistory');
// const Wallet = require('../models/Wallet');


// const mongoose = require('mongoose');
// /* =========================================================
//    CREATE PLAN (ADMIN)
// ========================================================= */
// exports.createPlan = async (req, res) => {
//   try {
//     const { name, slug, durationDays, amount, description, sortOrder } = req.body;

//     if (!name || !slug || !durationDays || amount === undefined) {
//       return res.status(400).json({ success: false, message: 'Required fields missing' });
//     }

//     const cleanSlug = slug.toLowerCase().replace(/\s+/g, '-');

//     const exists = await SubscriptionPlan.findOne({
//       $or: [{ slug: cleanSlug }, { name: name.trim() }]
//     });

//     if (exists) {
//       return res.status(409).json({ success: false, message: 'Plan already exists' });
//     }

//     const plan = await SubscriptionPlan.create({
//       name: name.trim(),
//       slug: cleanSlug,
//       durationDays,
//       amount,
//       description: description || '',
//       sortOrder: sortOrder || 0,
//       isActive: true,
//       deleted: false
//     });

//     return res.status(201).json({
//       success: true,
//       message: 'Plan created',
//       data: plan
//     });

//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getPlans = async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;

//     const skip = (page - 1) * limit;

//     const plans = await SubscriptionPlan.find({
//       isActive: true,
//       deleted: false
//     })
//       .sort({ sortOrder: 1 })
//       .skip(skip)
//       .limit(Number(limit));

//     const total = await SubscriptionPlan.countDocuments({
//       isActive: true,
//       deleted: false
//     });

//     return res.json({
//       success: true,
//       pagination: {
//         total,
//         page: Number(page),
//         pages: Math.ceil(total / limit)
//       },
//       data: plans
//     });

//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getAllPlansAdmin = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search, isActive } = req.query;

//     const query = {};

//     if (isActive !== undefined) {
//       query.isActive = isActive === 'true';
//     }

//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { slug: { $regex: search, $options: 'i' } }
//       ];
//     }

//     const skip = (page - 1) * limit;

//     const plans = await SubscriptionPlan.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit));

//     const total = await SubscriptionPlan.countDocuments(query);

//     return res.json({
//       success: true,
//       pagination: {
//         total,
//         page: Number(page),
//         pages: Math.ceil(total / limit)
//       },
//       data: plans
//     });

//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.createSubscriptionPayment = async (req, res) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     const { planId } = req.body;
//     const driverId = req.user._id;

//     // =========================
//     // PLAN VALIDATION
//     // =========================
//     const plan = await SubscriptionPlan.findById(planId);

//     if (!plan || plan.deleted) {
//       return res.status(404).json({
//         success: false,
//         message: 'Plan not found'
//       });
//     }

//     if (!plan.isActive) {
//       return res.status(400).json({
//         success: false,
//         message: 'Plan is inactive'
//       });
//     }

//     // =========================
//     // ACTIVE SUBSCRIPTION CHECK
//     // =========================
//     const active = await Subscription.findOne({
//       driverId,
//       status: 'active',
//       expiryDate: { $gt: new Date() }
//     });

//     if (active) {
//       return res.status(400).json({
//         success: false,
//         message: 'Already have active subscription'
//       });
//     }

//     // =========================
//     // GATEWAY RESOLVE
//     // =========================
//     const gateway = await gatewayResolver.prepareActiveGateway();

//     if (!gateway.isValid) {
//       return res.status(500).json({
//         success: false,
//         message: 'Payment gateway misconfigured',
//         errors: gateway.errors
//       });
//     }

//     // =========================
//     // TRANSACTION ID
//     // =========================
//     const txnid = `SUB_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

//     // =========================
//     // PAYMENT ORDER CREATE
//     // =========================
//     const paymentOrder = await PaymentOrder.create([{
//       orderId: txnid,
//       ownerId: driverId,
//       ownerType: 'Driver',
//       purpose: 'subscription',
//       amount: plan.amount,
//       status: 'created',
//       metadata: {
//         planId: plan._id,
//         durationDays: plan.durationDays
//       }
//     }], { session });

//     // =========================
//     // SUBSCRIPTION CREATE (PENDING)
//     // =========================
//     const subscription = await Subscription.create([{
//       driverId,
//       planId: plan._id,
//       planName: plan.name,
//       durationDays: plan.durationDays,
//       amount: plan.amount,
//       status: 'pending',
//       paymentStatus: 'pending',
//       gateway: gateway.name,
//       paymentOrderId: paymentOrder[0]._id,
//       transactionId: txnid
//     }], { session });

//     await session.commitTransaction();

//     // =========================
//     // INIT PAYMENT PAYLOAD
//     // =========================
//     const bookingData = {
//       bookingId: txnid,
//       amount: plan.amount,
//       tax_mode: 'subscription',
//       visiting_state: { name: 'NA' },
//       _id: subscription[0]._id
//     };

//     const userData = {
//       _id: req.user._id,
//       firstName: req.user.firstName,
//       email: req.user.email,
//       phoneNumber: req.user.phoneNumber
//     };

//     const payment = await gateway.service.preparePaymentData(
//       bookingData,
//       userData,
//       { platform: 'app' }
//     );

//     return res.status(201).json({
//       success: true,
//       message: 'Payment initiated',
//       gateway: gateway.name,
//       subscriptionId: subscription[0]._id,
//       payment
//     });

//   } catch (err) {
//     await session.abortTransaction();

//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });

//   } finally {
//     session.endSession();
//   }
// };

// exports.handlePaymentSuccess = async (req, res) => {
//   try {
//     const { txnid, paymentId } = req.body;

//     // =========================
//     // 1. UPDATE PAYMENT ORDER
//     // =========================
//     const order = await PaymentOrder.findOneAndUpdate(
//       { orderId: txnid },
//       {
//         status: 'paid',
//         paymentId
//       },
//       { new: true }
//     );

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'Payment order not found'
//       });
//     }

//     // =========================
//     // 2. FIND SUBSCRIPTION
//     // =========================
//     const subscription = await Subscription.findOne({
//       paymentOrderId: order._id
//     });

//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         message: 'Subscription not found'
//       });
//     }

//     // =========================
//     // 3. ACTIVATE SUBSCRIPTION
//     // =========================
//     const startDate = new Date();

//     const expiryDate = new Date();
//     expiryDate.setDate(startDate.getDate() + subscription.durationDays);

//     subscription.status = 'active';
//     subscription.paymentStatus = 'paid';
//     subscription.startDate = startDate;
//     subscription.expiryDate = expiryDate;

//     await subscription.save();

//     // =========================
//     // 4. HISTORY ENTRY
//     // =========================
//     await SubscriptionHistory.create({
//       driverId: subscription.driverId,
//       subscriptionId: subscription._id,
//       planId: subscription.planId,
//       planName: subscription.planName,
//       amount: subscription.amount,
//       action: 'purchase',
//       transactionId: txnid,
//       startDate,
//       expiryDate
//     });

//     return res.json({
//       success: true,
//       message: 'Subscription activated successfully'
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// exports.handlePaymentFailed = async (req, res) => {
//   try {
//     const { txnid, reason } = req.body;

//     // =========================
//     // 1. UPDATE PAYMENT ORDER
//     // =========================
//     await PaymentOrder.findOneAndUpdate(
//       { orderId: txnid },
//       {
//         status: 'failed',
//         failureReason: reason || 'Payment failed'
//       }
//     );

//     // =========================
//     // 2. UPDATE SUBSCRIPTION
//     // =========================
//     const subscription = await Subscription.findOne({
//       transactionId: txnid
//     });

//     if (subscription) {
//       subscription.status = 'failed';
//       subscription.paymentStatus = 'failed';

//       await subscription.save();

//       // =========================
//       // 3. HISTORY ENTRY
//       // =========================
//       await SubscriptionHistory.create({
//         driverId: subscription.driverId,
//         subscriptionId: subscription._id,
//         planId: subscription.planId,
//         planName: subscription.planName,
//         amount: subscription.amount,
//         action: 'payment_failed',
//         transactionId: txnid
//       });
//     }

//     return res.json({
//       success: true,
//       message: 'Payment failure recorded'
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// exports.purchaseByWallet = async (req, res) => {
//   try {
//     const { planId } = req.body;
//     const driverId = req.user._id;

//     // =========================
//     // PLAN CHECK
//     // =========================
//     const plan = await SubscriptionPlan.findById(planId);

//     if (!plan || !plan.isActive || plan.deleted) {
//       return res.status(404).json({
//         success: false,
//         message: 'Invalid plan'
//       });
//     }

//     // =========================
//     // WALLET CHECK
//     // =========================
//     const wallet = await Wallet.findOne({
//       ownerId: driverId,
//       ownerType: 'Driver'
//     });

//     if (!wallet || wallet.balance < plan.amount) {
//       return res.status(400).json({
//         success: false,
//         message: 'Insufficient wallet balance'
//       });
//     }

//     // =========================
//     // ACTIVE SUB CHECK
//     // =========================
//     const active = await Subscription.findOne({
//       driverId,
//       status: 'active',
//       expiryDate: { $gt: new Date() }
//     });

//     if (active) {
//       return res.status(400).json({
//         success: false,
//         message: 'Already have active subscription'
//       });
//     }

//     // =========================
//     // DEDUCT WALLET
//     // =========================
//     wallet.balance -= plan.amount;
//     await wallet.save();

//     // =========================
//     // CREATE SUBSCRIPTION
//     // =========================
//     const startDate = new Date();
//     const expiryDate = new Date();
//     expiryDate.setDate(startDate.getDate() + plan.durationDays);

//     const subscription = await Subscription.create({
//       driverId,
//       planId: plan._id,
//       planName: plan.name,
//       amount: plan.amount,
//       durationDays: plan.durationDays,
//       startDate,
//       expiryDate,
//       status: 'active',
//       paymentStatus: 'paid',
//       paymentMethod: 'wallet'
//     });

//     // =========================
//     // HISTORY
//     // =========================
//     await SubscriptionHistory.create({
//       driverId,
//       subscriptionId: subscription._id,
//       planId: plan._id,
//       planName: plan.name,
//       amount: plan.amount,
//       action: 'purchase',
//       paymentMethod: 'wallet',
//       startDate,
//       expiryDate
//     });

//     return res.json({
//       success: true,
//       message: 'Subscription purchased via wallet',
//       data: subscription
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// exports.renewSubscription = async (req, res) => {
//   try {
//     const { planId } = req.body;
//     const driverId = req.user._id;

//     // =========================
//     // PLAN CHECK
//     // =========================
//     const plan = await SubscriptionPlan.findById(planId);

//     if (!plan || !plan.isActive) {
//       return res.status(404).json({
//         success: false,
//         message: 'Plan not found'
//       });
//     }

//     // =========================
//     // GET CURRENT SUB
//     // =========================
//     const subscription = await Subscription.findOne({
//       driverId,
//       status: 'active'
//     }).sort({ createdAt: -1 });

//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         message: 'No active subscription found'
//       });
//     }

//     // =========================
//     // EXTEND EXPIRY
//     // =========================
//     const currentExpiry = new Date(subscription.expiryDate);
//     const newExpiry = new Date(currentExpiry);
//     newExpiry.setDate(newExpiry.getDate() + plan.durationDays);

//     subscription.expiryDate = newExpiry;
//     subscription.amount += plan.amount;
//     subscription.planId = plan._id;

//     await subscription.save();

//     // =========================
//     // HISTORY
//     // =========================
//     await SubscriptionHistory.create({
//       driverId,
//       subscriptionId: subscription._id,
//       planId: plan._id,
//       planName: plan.name,
//       amount: plan.amount,
//       action: 'renew',
//       startDate: new Date(),
//       expiryDate: newExpiry
//     });

//     return res.json({
//       success: true,
//       message: 'Subscription renewed successfully',
//       data: subscription
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// exports.renewSubscription = async (req, res) => {
//   try {
//     const { planId } = req.body;
//     const driverId = req.user._id;

//     const plan = await SubscriptionPlan.findById(planId);
//     if (!plan || !plan.isActive) {
//       return res.status(404).json({
//         success: false,
//         message: 'Invalid plan'
//       });
//     }

//     const currentSub = await Subscription.findOne({
//       driverId,
//       status: 'active'
//     });

//     if (!currentSub) {
//       return res.status(400).json({
//         success: false,
//         message: 'No active subscription to renew'
//       });
//     }

//     const now = new Date();
//     const baseDate = currentSub.expiryDate > now ? currentSub.expiryDate : now;

//     const newExpiry = new Date(baseDate);
//     newExpiry.setDate(newExpiry.getDate() + plan.durationDays);

//     currentSub.expiryDate = newExpiry;
//     currentSub.status = 'active';
//     currentSub.paymentStatus = 'pending';

//     await currentSub.save();

//     await SubscriptionHistory.create({
//       driverId,
//       subscriptionId: currentSub._id,
//       planId: plan._id,
//       planName: plan.name,
//       amount: plan.amount,
//       action: 'renew',
//       startDate: now,
//       expiryDate: newExpiry
//     });

//     return res.json({
//       success: true,
//       message: 'Subscription renewed successfully',
//       data: currentSub
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// exports.payFromWallet = async (req, res) => {
//   try {
//     const { planId } = req.body;
//     const driverId = req.user._id;

//     const plan = await SubscriptionPlan.findById(planId);
//     if (!plan || !plan.isActive) {
//       return res.status(404).json({ success: false, message: 'Plan not found' });
//     }

//     let wallet = await Wallet.findOne({ ownerId: driverId, ownerType: 'Driver' });

//     if (!wallet || wallet.balance < plan.amount) {
//       return res.status(400).json({
//         success: false,
//         message: 'Insufficient wallet balance'
//       });
//     }

//     const now = new Date();
//     const expiryDate = new Date();
//     expiryDate.setDate(now.getDate() + plan.durationDays);

//     wallet.balance -= plan.amount;
//     await wallet.save();

//     const subscription = await Subscription.create({
//       driverId,
//       planId: plan._id,
//       planName: plan.name,
//       amount: plan.amount,
//       durationDays: plan.durationDays,
//       startDate: now,
//       expiryDate,
//       status: 'active',
//       paymentStatus: 'paid'
//     });

//     await SubscriptionHistory.create({
//       driverId,
//       subscriptionId: subscription._id,
//       planId: plan._id,
//       planName: plan.name,
//       amount: plan.amount,
//       action: 'wallet_payment',
//       startDate: now,
//       expiryDate
//     });

//     return res.json({
//       success: true,
//       message: 'Subscription purchased via wallet',
//       data: subscription
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// exports.expireSubscriptions = async (req, res) => {
//   try {
//     const now = new Date();

//     const expired = await Subscription.updateMany(
//       {
//         status: 'active',
//         expiryDate: { $lt: now }
//       },
//       {
//         $set: {
//           status: 'expired',
//           paymentStatus: 'expired'
//         }
//       }
//     );

//     return res.json({
//       success: true,
//       message: 'Expired subscriptions updated',
//       data: expired
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };
// exports.adminCancelSubscription = async (req, res) => {
//   try {
//     const { subscriptionId } = req.params;

//     const sub = await Subscription.findById(subscriptionId);

//     if (!sub) {
//       return res.status(404).json({
//         success: false,
//         message: 'Subscription not found'
//       });
//     }

//     sub.status = 'cancelled';
//     await sub.save();

//     await SubscriptionHistory.create({
//       driverId: sub.driverId,
//       subscriptionId: sub._id,
//       planId: sub.planId,
//       planName: sub.planName,
//       amount: sub.amount,
//       action: 'admin_cancel'
//     });

//     return res.json({
//       success: true,
//       message: 'Subscription cancelled by admin'
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// exports.getSubscriptionStats = async (req, res) => {
//   try {
//     const total = await Subscription.countDocuments();
//     const active = await Subscription.countDocuments({ status: 'active' });
//     const expired = await Subscription.countDocuments({ status: 'expired' });
//     const cancelled = await Subscription.countDocuments({ status: 'cancelled' });

//     const revenueAgg = await Subscription.aggregate([
//       { $match: { paymentStatus: 'paid' } },
//       { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
//     ]);

//     return res.json({
//       success: true,
//       data: {
//         total,
//         active,
//         expired,
//         cancelled,
//         revenue: revenueAgg[0]?.totalRevenue || 0
//       }
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// exports.safeDeletePlan = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const activeSubs = await Subscription.countDocuments({
//       planId: id,
//       status: 'active'
//     });

//     if (activeSubs > 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Cannot delete plan with active subscriptions'
//       });
//     }

//     await SubscriptionPlan.findByIdAndUpdate(id, {
//       deleted: true,
//       isActive: false
//     });

//     return res.json({
//       success: true,
//       message: 'Plan safely deleted'
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };


const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const PaymentOrder = require('../models/PaymentOrder');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const gatewayResolver = require('../utils/gatewayResolver');

/* =========================================================
   HELPERS
========================================================= */
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const parsePagination = (query) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;
  return { page, limit, skip: (page - 1) * limit };
};

const emitEvent = (req, room, event, payload) => {
  try {
    const io = req.app.get('io');
    if (io) io.to(room).emit(event, payload);
  } catch (e) {
    // socket emission must never break the request lifecycle
  }
};

const emitSubscriptionStatus = (req, subscription, event = 'subscription:status') => {
  const payload = {
    subscriptionId: subscription._id,
    driverId: subscription.driverId,
    status: subscription.status,
    paymentStatus: subscription.paymentStatus,
    expiryDate: subscription.expiryDate,
    planName: subscription.planName
  };
  emitEvent(req, `driver:${subscription.driverId}`, event, payload);
  emitEvent(req, 'admin:dashboard', event, payload);
};

/**
 * Atomically debits a driver's wallet. Returns updated wallet or null if
 * insufficient balance / wallet missing. Avoids read-then-write races.
 */
const debitWalletAtomic = async (ownerId, amount, session) => {
  return Wallet.findOneAndUpdate(
    { ownerId, ownerType: 'Driver', balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true, session }
  );
};

const logWalletTransaction = async ({
  wallet,
  amount,
  balanceBefore,
  purpose,
  paymentId,
  remark,
  session
}) => {
  await WalletTransaction.create(
    [{
      walletId: wallet._id,
      ownerId: wallet.ownerId,
      ownerType: wallet.ownerType,
      type: 'debit',
      purpose,
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      remark,
      paymentId: paymentId || null
    }],
    { session }
  );
};

/* =========================================================
   PLAN MANAGEMENT (ADMIN)
========================================================= */
exports.createPlan = async (req, res) => {
  try {
    const { name, slug, durationDays, amount, description, sortOrder } = req.body;

    if (!name || !slug || !durationDays || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    if (Number(durationDays) <= 0 || Number(amount) < 0) {
      return res.status(400).json({ success: false, message: 'Invalid durationDays or amount' });
    }

    const cleanSlug = String(slug).toLowerCase().trim().replace(/\s+/g, '-');

    const exists = await SubscriptionPlan.findOne({
      $or: [{ slug: cleanSlug }, { name: name.trim() }]
    }).lean();

    if (exists) {
      return res.status(409).json({ success: false, message: 'Plan already exists' });
    }

    const plan = await SubscriptionPlan.create({
      name: name.trim(),
      slug: cleanSlug,
      durationDays,
      amount,
      description: description || '',
      sortOrder: sortOrder || 0,
      isActive: true,
      deleted: false,
      createdBy: req.user?._id || null
    });

    return res.status(201).json({ success: true, message: 'Plan created', data: plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid plan id' });
    }

    const plan = await SubscriptionPlan.findOne({ _id: id, deleted: false });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    return res.json({ success: true, data: plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid plan id' });
    }

    const allowedFields = [
      'name', 'description', 'amount', 'durationDays', 'badge', 'color',
      'sortOrder', 'features', 'bookingLimitPerDay', 'prioritySupport',
      'instantApproval', 'commissionDiscount', 'isPopular', 'isRecommended',
      'isTrial', 'isActive'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.amount !== undefined && Number(updates.amount) < 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (updates.durationDays !== undefined && Number(updates.durationDays) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid durationDays' });
    }

    if (req.body.name) {
      const dup = await SubscriptionPlan.findOne({
        _id: { $ne: id },
        name: req.body.name.trim(),
        deleted: false
      }).lean();
      if (dup) {
        return res.status(409).json({ success: false, message: 'Another plan with this name exists' });
      }
    }

    updates.updatedBy = req.user?._id || null;

    if (updates.isActive === true) updates.activatedAt = new Date();
    if (updates.isActive === false) updates.deactivatedAt = new Date();

    const plan = await SubscriptionPlan.findOneAndUpdate(
      { _id: id, deleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    return res.json({ success: true, message: 'Plan updated', data: plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { isActive: true, deleted: false };

    const [plans, total] = await Promise.all([
      SubscriptionPlan.find(filter).sort({ sortOrder: 1 }).skip(skip).limit(limit).lean(),
      SubscriptionPlan.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: plans
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllPlansAdmin = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, isActive } = req.query;

    const query = { deleted: false };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { slug: { $regex: safe, $options: 'i' } }
      ];
    }

    const [plans, total] = await Promise.all([
      SubscriptionPlan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SubscriptionPlan.countDocuments(query)
    ]);

    return res.json({
      success: true,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: plans
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.safeDeletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid plan id' });
    }

    const activeSubs = await Subscription.countDocuments({ planId: id, status: 'active' });

    if (activeSubs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan with active subscriptions'
      });
    }

    const plan = await SubscriptionPlan.findByIdAndUpdate(
      id,
      { deleted: true, isActive: false, deletedAt: new Date(), deletedBy: req.user?._id || null },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    return res.json({ success: true, message: 'Plan safely deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   PURCHASE VIA PAYMENT GATEWAY
========================================================= */
exports.createSubscriptionPayment = async (req, res) => {
  const session = await mongoose.startSession();
  let transactionStarted = false;

  try {
    const { planId } = req.body;
    const driverId = req.user._id;

    if (!isValidId(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid plan id' });
    }

    const plan = await SubscriptionPlan.findById(planId);

    if (!plan || plan.deleted) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    if (!plan.isActive) {
      return res.status(400).json({ success: false, message: 'Plan is inactive' });
    }

    const active = await Subscription.findOne({
      driverId,
      status: 'active',
      expiryDate: { $gt: new Date() }
    }).lean();

    if (active) {
      return res.status(400).json({ success: false, message: 'Already have active subscription' });
    }

    const gateway = await gatewayResolver.prepareActiveGateway();

    if (!gateway.isValid) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway misconfigured',
        errors: gateway.errors
      });
    }

    const txnid = `SUB_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

    session.startTransaction();
    transactionStarted = true;

    const paymentOrder = await PaymentOrder.create([{
      orderId: txnid,
      ownerId: driverId,
      ownerType: 'Driver',
      purpose: 'subscription',
      amount: plan.amount,
      status: 'created',
      metadata: { planId: plan._id, durationDays: plan.durationDays }
    }], { session });

    const subscription = await Subscription.create([{
      driverId,
      planId: plan._id,
      planName: plan.name,
      durationDays: plan.durationDays,
      amount: plan.amount,
      status: 'pending',
      paymentStatus: 'pending',
      gateway: gateway.name,
      paymentOrderId: paymentOrder[0]._id,
      transactionId: txnid
    }], { session });

    await session.commitTransaction();
    transactionStarted = false;

    const bookingData = {
      bookingId: txnid,
      amount: plan.amount,
      tax_mode: 'subscription',
      visiting_state: { name: 'NA' },
      _id: subscription[0]._id
    };

    const userData = {
      _id: req.user._id,
      firstName: req.user.firstName,
      email: req.user.email,
      phoneNumber: req.user.phoneNumber
    };

    const payment = await gateway.service.preparePaymentData(
      bookingData,
      userData,
      { platform: 'app' }
    );

    return res.status(201).json({
      success: true,
      message: 'Payment initiated',
      gateway: gateway.name,
      subscriptionId: subscription[0]._id,
      payment
    });
  } catch (err) {
    if (transactionStarted) {
      await session.abortTransaction().catch(() => {});
    }
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

exports.handlePaymentSuccess = async (req, res) => {
  try {
    const { txnid, paymentId } = req.body;

    if (!txnid) {
      return res.status(400).json({ success: false, message: 'txnid is required' });
    }

    const order = await PaymentOrder.findOne({ orderId: txnid });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Payment order not found' });
    }

    const subscription = await Subscription.findOne({ paymentOrderId: order._id });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Idempotency guard: don't reprocess a payment already marked paid
    if (order.status === 'paid' && subscription.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'Payment already processed' });
    }

    order.status = 'paid';
    order.paymentId = paymentId;
    await order.save();

    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(startDate.getDate() + subscription.durationDays);

    subscription.status = 'active';
    subscription.paymentStatus = 'paid';
    subscription.startDate = startDate;
    subscription.expiryDate = expiryDate;
    subscription.activatedAt = startDate;

    await subscription.save();

    await SubscriptionHistory.create({
      driverId: subscription.driverId,
      subscriptionId: subscription._id,
      planId: subscription.planId,
      planName: subscription.planName,
      amount: subscription.amount,
      action: 'purchase',
      transactionId: txnid,
      startDate,
      expiryDate
    });

    emitSubscriptionStatus(req, subscription, 'subscription:activated');

    return res.json({ success: true, message: 'Subscription activated successfully', data: subscription });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.handlePaymentFailed = async (req, res) => {
  try {
    const { txnid, reason } = req.body;

    if (!txnid) {
      return res.status(400).json({ success: false, message: 'txnid is required' });
    }

    await PaymentOrder.findOneAndUpdate(
      { orderId: txnid },
      { status: 'failed', failureReason: reason || 'Payment failed' }
    );

    const subscription = await Subscription.findOne({ transactionId: txnid });

    if (subscription) {
      // NOTE: 'failed' is not a valid Subscription.status enum value —
      // a failed payment simply cancels the pending subscription attempt.
      subscription.status = 'cancelled';
      subscription.paymentStatus = 'failed';
      subscription.cancelledAt = new Date();
      subscription.cancelReason = reason || 'Payment failed';

      await subscription.save();

      await SubscriptionHistory.create({
        driverId: subscription.driverId,
        subscriptionId: subscription._id,
        planId: subscription.planId,
        planName: subscription.planName,
        amount: subscription.amount,
        action: 'payment_failed',
        transactionId: txnid,
        remarks: reason || 'Payment failed'
      });

      emitSubscriptionStatus(req, subscription, 'subscription:payment_failed');
    }

    return res.json({ success: true, message: 'Payment failure recorded' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   PURCHASE VIA WALLET
========================================================= */
exports.purchaseByWallet = async (req, res) => {
  const session = await mongoose.startSession();
  let transactionStarted = false;

  try {
    const { planId } = req.body;
    const driverId = req.user._id;

    if (!isValidId(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid plan id' });
    }

    const plan = await SubscriptionPlan.findById(planId);

    if (!plan || !plan.isActive || plan.deleted) {
      return res.status(404).json({ success: false, message: 'Invalid plan' });
    }

    const active = await Subscription.findOne({
      driverId,
      status: 'active',
      expiryDate: { $gt: new Date() }
    }).lean();

    if (active) {
      return res.status(400).json({ success: false, message: 'Already have active subscription' });
    }

    const walletBefore = await Wallet.findOne({ ownerId: driverId, ownerType: 'Driver' }).lean();

    if (!walletBefore || walletBefore.balance < plan.amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    session.startTransaction();
    transactionStarted = true;

    const wallet = await debitWalletAtomic(driverId, plan.amount, session);

    if (!wallet) {
      await session.abortTransaction();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(startDate.getDate() + plan.durationDays);

    const subscription = await Subscription.create([{
      driverId,
      planId: plan._id,
      planName: plan.name,
      amount: plan.amount,
      durationDays: plan.durationDays,
      startDate,
      expiryDate,
      activatedAt: startDate,
      status: 'active',
      paymentStatus: 'paid',
      paymentMethod: 'wallet',
      gateway: 'wallet',
      walletUsed: true,
      walletAmount: plan.amount
    }], { session });

    await logWalletTransaction({
      wallet,
      amount: plan.amount,
      balanceBefore: walletBefore.balance,
      purpose: 'subscription_purchase',
      remark: `Subscription purchase: ${plan.name}`,
      session
    });

    await SubscriptionHistory.create([{
      driverId,
      subscriptionId: subscription[0]._id,
      planId: plan._id,
      planName: plan.name,
      amount: plan.amount,
      action: 'purchase',
      paymentMethod: 'wallet',
      walletUsed: true,
      walletAmount: plan.amount,
      startDate,
      expiryDate
    }], { session });

    await session.commitTransaction();
    transactionStarted = false;

    emitSubscriptionStatus(req, subscription[0], 'subscription:activated');

    return res.json({
      success: true,
      message: 'Subscription purchased via wallet',
      data: subscription[0]
    });
  } catch (err) {
    if (transactionStarted) {
      await session.abortTransaction().catch(() => {});
    }
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// Backward-compatible alias — kept for existing routes, no duplicated logic.
exports.payFromWallet = exports.purchaseByWallet;

/* =========================================================
   RENEWAL (WALLET-BASED)
========================================================= */
exports.renewSubscription = async (req, res) => {
  const session = await mongoose.startSession();
  let transactionStarted = false;

  try {
    const { planId } = req.body;
    const driverId = req.user._id;

    if (!isValidId(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid plan id' });
    }

    const plan = await SubscriptionPlan.findById(planId);

    if (!plan || !plan.isActive || plan.deleted) {
      return res.status(404).json({ success: false, message: 'Invalid plan' });
    }

    const currentSub = await Subscription.findOne({ driverId })
      .sort({ createdAt: -1 });

    if (!currentSub || !['active', 'expired'].includes(currentSub.status)) {
      return res.status(400).json({
        success: false,
        message: 'No renewable subscription found. Please purchase a new plan.'
      });
    }

    const walletBefore = await Wallet.findOne({ ownerId: driverId, ownerType: 'Driver' }).lean();

    if (!walletBefore || walletBefore.balance < plan.amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    session.startTransaction();
    transactionStarted = true;

    const wallet = await debitWalletAtomic(driverId, plan.amount, session);

    if (!wallet) {
      await session.abortTransaction();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    const now = new Date();
    const oldExpiryDate = currentSub.expiryDate;
    const baseDate = oldExpiryDate && oldExpiryDate > now ? oldExpiryDate : now;

    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + plan.durationDays);

    currentSub.planId = plan._id;
    currentSub.planName = plan.name;
    currentSub.durationDays = plan.durationDays;
    currentSub.amount = (currentSub.amount || 0) + plan.amount;
    currentSub.expiryDate = newExpiry;
    currentSub.status = 'active';
    currentSub.paymentStatus = 'paid';
    currentSub.paymentMethod = 'wallet';
    currentSub.walletUsed = true;
    currentSub.walletAmount = (currentSub.walletAmount || 0) + plan.amount;
    currentSub.renewalCount = (currentSub.renewalCount || 0) + 1;
    currentSub.lastRenewedAt = now;
    currentSub.renewalDate = now;

    await currentSub.save({ session });

    await logWalletTransaction({
      wallet,
      amount: plan.amount,
      balanceBefore: walletBefore.balance,
      purpose: 'subscription_renewal',
      remark: `Subscription renewal: ${plan.name}`,
      session
    });

    await SubscriptionHistory.create([{
      driverId,
      subscriptionId: currentSub._id,
      planId: plan._id,
      planName: plan.name,
      amount: plan.amount,
      action: 'renew',
      paymentMethod: 'wallet',
      walletUsed: true,
      walletAmount: plan.amount,
      startDate: now,
      oldExpiryDate,
      newExpiryDate: newExpiry,
      expiryDate: newExpiry
    }], { session });

    await session.commitTransaction();
    transactionStarted = false;

    emitSubscriptionStatus(req, currentSub, 'subscription:renewed');

    return res.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: currentSub
    });
  } catch (err) {
    if (transactionStarted) {
      await session.abortTransaction().catch(() => {});
    }
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/* =========================================================
   DRIVER — READ / SELF-SERVICE
========================================================= */
exports.getMySubscription = async (req, res) => {
  try {
    const driverId = req.user._id;

    const subscription = await Subscription.findOne({ driverId })
      .sort({ createdAt: -1 })
      .populate('planId', 'name slug features badge color');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No subscription found' });
    }

    return res.json({ success: true, data: subscription });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMySubscriptions = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { page, limit, skip } = parsePagination(req.query);
    const { status } = req.query;

    const filter = { driverId };
    if (status) filter.status = status;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Subscription.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: subscriptions
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { page, limit, skip } = parsePagination(req.query);
    const { action } = req.query;

    const filter = { driverId, deleted: false };
    if (action) filter.action = action;

    const [history, total] = await Promise.all([
      SubscriptionHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SubscriptionHistory.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: history
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { reason } = req.body;

    const subscription = await Subscription.findOne({
      driverId,
      status: { $in: ['active', 'pending'] }
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No active subscription to cancel' });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason || 'Cancelled by user';

    await subscription.save();

    await SubscriptionHistory.create({
      driverId,
      subscriptionId: subscription._id,
      planId: subscription.planId,
      planName: subscription.planName,
      amount: subscription.amount,
      action: 'cancel',
      remarks: reason || 'Cancelled by user'
    });

    emitSubscriptionStatus(req, subscription, 'subscription:cancelled');

    return res.json({ success: true, message: 'Subscription cancelled', data: subscription });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   ADMIN — SUBSCRIPTION MANAGEMENT
========================================================= */
exports.getAllSubscriptionsAdmin = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, paymentStatus, driverId, search } = req.query;

    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (driverId && isValidId(driverId)) query.driverId = driverId;

    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { planName: { $regex: safe, $options: 'i' } },
        { transactionId: { $regex: safe, $options: 'i' } }
      ];
    }

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate('driverId', 'firstName lastName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(query)
    ]);

    return res.json({
      success: true,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: subscriptions
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSubscriptionByIdAdmin = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!isValidId(subscriptionId)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription id' });
    }

    const subscription = await Subscription.findById(subscriptionId)
      .populate('driverId', 'firstName lastName email phoneNumber')
      .populate('planId', 'name slug');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    return res.json({ success: true, data: subscription });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminCancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    if (!isValidId(subscriptionId)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription id' });
    }

    const sub = await Subscription.findById(subscriptionId);

    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (sub.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Subscription already cancelled' });
    }

    sub.status = 'cancelled';
    sub.cancelledAt = new Date();
    sub.cancelReason = reason || 'Cancelled by admin';

    await sub.save();

    await SubscriptionHistory.create({
      driverId: sub.driverId,
      subscriptionId: sub._id,
      planId: sub.planId,
      planName: sub.planName,
      amount: sub.amount,
      action: 'cancel',
      adminId: req.user?._id || null,
      remarks: reason || 'Cancelled by admin'
    });

    emitSubscriptionStatus(req, sub, 'subscription:cancelled');

    return res.json({ success: true, message: 'Subscription cancelled by admin', data: sub });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   EXPIRY SWEEP (CRON / ADMIN TRIGGERED)
========================================================= */
exports.expireSubscriptions = async (req, res) => {
  try {
    const now = new Date();

    const expiringSubs = await Subscription.find({
      status: 'active',
      expiryDate: { $lt: now }
    }).select('_id driverId planId planName amount expiryDate');

    if (expiringSubs.length === 0) {
      return res.json({ success: true, message: 'No subscriptions to expire', data: { matched: 0, modified: 0 } });
    }

    const ids = expiringSubs.map((s) => s._id);

    const result = await Subscription.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'expired', expiredAt: now } }
    );

    const historyDocs = expiringSubs.map((s) => ({
      driverId: s.driverId,
      subscriptionId: s._id,
      planId: s.planId,
      planName: s.planName,
      amount: s.amount,
      action: 'expire',
      expiryDate: s.expiryDate
    }));

    await SubscriptionHistory.insertMany(historyDocs);

    for (const s of expiringSubs) {
      emitEvent(req, `driver:${s.driverId}`, 'subscription:expired', {
        subscriptionId: s._id,
        driverId: s.driverId,
        status: 'expired'
      });
    }
    emitEvent(req, 'admin:dashboard', 'subscription:expired:bulk', { count: expiringSubs.length });

    return res.json({
      success: true,
      message: 'Expired subscriptions updated',
      data: { matched: result.matchedCount, modified: result.modifiedCount }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   ADMIN — DASHBOARD STATS
========================================================= */
exports.getSubscriptionStats = async (req, res) => {
  try {
    const [total, active, expired, cancelled, pending, revenueAgg] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      Subscription.countDocuments({ status: 'pending' }),
      Subscription.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ])
    ]);

    return res.json({
      success: true,
      data: {
        total,
        active,
        expired,
        cancelled,
        pending,
        revenue: revenueAgg[0]?.totalRevenue || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.purchasePlanTesting = async (req, res) => {
  try {

    const { planId } = req.body;

    // ==============================
    // PLAN VALIDATION
    // ==============================
    const plan = await SubscriptionPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Plan is inactive'
      });
    }

    // ==============================
    // CHECK EXISTING ACTIVE SUBSCRIPTION
    // ==============================
    const activeSub = await Subscription.findOne({
      driverId: req.user._id,
      status: 'active',
      expiryDate: { $gt: new Date() }
    });

    if (activeSub) {
      return res.status(400).json({
        success: false,
        message: 'Active subscription already exists'
      });
    }

    // ==============================
    // DATE SAFETY CHECK
    // ==============================
    const now = new Date();

    const startDate = new Date(now);

    const expiryDate = new Date(now);
    expiryDate.setDate(
      expiryDate.getDate() + Number(plan.durationDays)
    );

    if (expiryDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expiry calculation'
      });
    }

    // ==============================
    // CREATE SUBSCRIPTION
    // ==============================
    const subscription = await Subscription.create({
      driverId: req.user._id,
      planId: plan._id,
      planName: plan.name,
      durationDays: plan.durationDays,
      amount: plan.amount,
      startDate,
      expiryDate,
      status: 'active',
      paymentStatus: 'pending'
    });

    // ==============================
    // HISTORY LOG
    // ==============================
    await SubscriptionHistory.create({
      driverId: req.user._id,
      planId: plan._id,
      planName: plan.name,
      amount: plan.amount,
      action: 'purchase',
      startDate,
      expiryDate
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription initiated successfully',
      data: subscription
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.deletePlan = async (req, res) => {
  try {

    const { id } = req.params;

    const plan = await SubscriptionPlan.findById(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // soft delete
    plan.deleted = true;
    plan.isActive = false;

    await plan.save();

    return res.json({
      success: true,
      message: 'Plan deleted (soft delete)'
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};




exports.togglePlanStatus = async (req, res) => {
  try {

    const { id } = req.params;

    const plan = await SubscriptionPlan.findById(id);

    if (!plan || plan.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    plan.isActive = !plan.isActive;

    await plan.save();

    return res.json({
      success: true,
      message: 'Plan status updated',
      data: plan
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};