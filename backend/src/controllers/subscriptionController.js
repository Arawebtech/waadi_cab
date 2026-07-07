const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const PaymentOrder = require('../models/PaymentOrder');
const gatewayResolver = require('../config/gatewayResolver');
const mongoose = require('mongoose');
const subscriptionLifecycle = require('../cab-services/subscriptionLifecycle.service');

exports.createPlan = async (req, res) => {
  try {

    const {
      name,
      slug,
      durationDays,
      amount,
      description,
      sortOrder
    } = req.body;

    // ==============================
    // BASIC VALIDATION
    // ==============================
    if (!name || !slug || !durationDays || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      });
    }

    if (durationDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be greater than 0'
      });
    }

    if (amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount cannot be negative'
      });
    }

    const cleanSlug = slug
      .toLowerCase()
      .replace(/\s+/g, '-');

    // ==============================
    // DUPLICATE CHECK
    // ==============================
    const existingPlan = await SubscriptionPlan.findOne({
      $or: [
        { slug: cleanSlug },
        { name: name.trim() }
      ]
    });

    if (existingPlan) {
      return res.status(409).json({
        success: false,
        message: 'Plan already exists'
      });
    }

    const plan = await SubscriptionPlan.create({
      name: name.trim(),
      slug: cleanSlug,
      durationDays,
      amount,
      description: description || '',
      sortOrder: sortOrder || 0,
      isActive: true,
      activatedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


exports.getAllPlansAdmin = async (req, res) => {
  try {

    const {
      page = 1,
      limit = 10,
      search,
      isActive
    } = req.query;

    const query = {};

    // filter active/inactive
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // search by name or slug
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const plans = await SubscriptionPlan.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await SubscriptionPlan.countDocuments(query);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data: plans
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


exports.getPlans = async (req, res) => {
  try {

    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const plans = await SubscriptionPlan.find({
      isActive: true,
      deleted: false
    })
    .sort({ sortOrder: 1 })
    .skip(skip)
    .limit(Number(limit));

    const total = await SubscriptionPlan.countDocuments({
      isActive: true,
      deleted: false
    });

    return res.json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data: plans
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {

    const { id } = req.params;

    const plan = await SubscriptionPlan.findOne({
      _id: id,
      deleted: false
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    const updateFields = req.body;

    if (updateFields.slug) {
      updateFields.slug = updateFields.slug.toLowerCase().replace(/\s+/g, '-');
    }

    const updated = await SubscriptionPlan.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Plan updated',
      data: updated
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};








exports.createSubscriptionPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { planId, intent: requestedIntent } = req.body;
    const driverId = req.user._id;

    const { intent, plan, activeSub } = await subscriptionLifecycle.resolvePurchaseIntent(
      driverId,
      planId,
      requestedIntent
    );

    const gateway = await gatewayResolver.prepareActiveGateway();

    if (!gateway.isValid) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: 'Payment gateway misconfigured',
        errors: gateway.errors
      });
    }

    const txnid = `SUB_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

    const paymentOrder = await PaymentOrder.create([{
      orderId: txnid,
      ownerId: driverId,
      ownerType: 'Driver',
      purpose: 'subscription',
      amount: plan.amount,
      status: 'created',
      metadata: {
        planId: plan._id,
        durationDays: plan.durationDays,
        intent,
        activeSubscriptionId: activeSub?._id || null,
      }
    }], { session });

    const subscription = await Subscription.create([{
      driverId,
      planId: plan._id,
      planName: plan.name,
      durationDays: plan.durationDays,
      amount: plan.amount,
      status: 'pending',
      paymentStatus: 'pending',
      purchaseIntent: intent,
      scheduledAfterSubscriptionId: intent === 'replace' && activeSub ? activeSub._id : null,
      gateway: gateway.name,
      paymentOrderId: paymentOrder[0]._id,
      transactionId: txnid
    }], { session });

    await session.commitTransaction();

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

    return res.json({
      success: true,
      message: 'Payment initiated',
      gateway: gateway.name,
      subscriptionId: subscription[0]._id,
      intent,
      payment
    });

  } catch (err) {
    await session.abortTransaction();
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message
    });
  } finally {
    session.endSession();
  }
};

exports.handlePaymentSuccess = async (req, res) => {
  try {

    const { txnid, paymentId } = req.body;

    const order = await PaymentOrder.findOneAndUpdate(
      { orderId: txnid },
      {
        status: 'paid',
        paymentId
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Payment order not found'
      });
    }

    const subscription = await Subscription.findOne({
      paymentOrderId: order._id
    }).populate('planId');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const result = await subscriptionLifecycle.finalizePaidSubscription(subscription, { txnid });

    return res.json({
      success: true,
      message:
        result.status === 'scheduled'
          ? 'New plan scheduled after current subscription expires'
          : result.purchaseIntent === 'renew'
            ? 'Subscription renewed successfully'
            : 'Subscription activated successfully',
      data: result,
    });

  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message
    });
  }
};

exports.getMySubscription = async (req, res) => {
  try {
    const overview = await subscriptionLifecycle.getSubscriptionOverview(req.user._id);

    return res.json({
      success: true,
      data: overview.current,
      active: overview.active,
      scheduled: overview.scheduled,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getMySubscriptionHistory = async (req, res) => {
  try {

    const {
      page = 1,
      limit = 10,
      action
    } = req.query;

    const query = {
      driverId: req.user._id
    };

    // filter by action (purchase, renew, expire, cancel)
    if (action) {
      query.action = action;
    }

    const skip = (page - 1) * limit;

    const history = await SubscriptionHistory.find(query)
      .populate('planId', 'name slug amount durationDays')
      .populate('subscriptionId', 'status expiryDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await SubscriptionHistory.countDocuments(query);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data: history
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getAllSubscriptionHistoryAdmin = async (req, res) => {
  try {

    const {
      page = 1,
      limit = 10,
      driverId,
      action
    } = req.query;

    const query = {};

    if (driverId) query.driverId = driverId;
    if (action) query.action = action;

    const skip = (page - 1) * limit;

    const history = await SubscriptionHistory.find(query)
      .populate('driverId', 'firstName lastName phoneNumber')
      .populate('planId', 'name amount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await SubscriptionHistory.countDocuments(query);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data: history
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {

    const sub = await Subscription.findOne({
      driverId: req.user._id,
      status: 'active'
    });

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription'
      });
    }

    sub.status = 'cancelled';
    await sub.save();

    return res.json({
      success: true,
      message: 'Subscription cancelled'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// exports.payuSuccess = async (req, res) => {
//   try {

//     const { txnid, status, udf1 } = req.body;

//     const subscription = await Subscription.findById(udf1);

//     if (!subscription) {
//       return res.status(404).send('Invalid subscription');
//     }

//     if (status === 'success') {
//       subscription.paymentStatus = 'paid';
//       subscription.status = 'active';
//     } else {
//       subscription.paymentStatus = 'failed';
//       subscription.status = 'cancelled';
//     }

//     await subscription.save();

//     return res.redirect('app://payment-success');

//   } catch (err) {
//     return res.status(500).send(err.message);
//   }
// };

// exports.mySubscription = async (req, res) => {
//   try {

//     const subscription = await Subscription.findOne({
//       driverId: req.user._id
//     })
//     .sort({ createdAt: -1 });

//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         message: 'No subscription found'
//       });
//     }

//     // auto expire check (real-time safety)
//     if (subscription.expiryDate < new Date() &&
//         subscription.status === 'active') {

//       subscription.status = 'expired';
//       await subscription.save();
//     }

//     return res.json({
//       success: true,
//       data: subscription
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };
// exports.initiatePayment = async (req, res) => {
//   try {

//     const { planId } = req.body;

//     const plan = await SubscriptionPlan.findById(planId);

//     if (!plan || !plan.isActive) {
//       return res.status(404).json({
//         success: false,
//         message: 'Plan not found or inactive'
//       });
//     }

//     // active subscription check
//     const active = await Subscription.findOne({
//       driverId: req.user._id,
//       status: 'active',
//       expiryDate: { $gt: new Date() }
//     });

//     if (active) {
//       return res.status(400).json({
//         success: false,
//         message: 'Already have active subscription'
//       });
//     }

//     const config = await PaymentGatewayConfig.getConfig();

//     const txnId =
//       'TXN_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

//     const startDate = new Date();
//     const expiryDate = new Date();
//     expiryDate.setDate(startDate.getDate() + plan.durationDays);

//     // =========================
//     // CREATE SUBSCRIPTION (PENDING)
//     // =========================
//     const subscription = await Subscription.create({
//       driverId: req.user._id,
//       planId: plan._id,
//       planName: plan.name,
//       durationDays: plan.durationDays,
//       amount: plan.amount,
//       startDate,
//       expiryDate,
//       status: 'active',
//       paymentStatus: 'pending',
//       transactionId: txnId
//     });

//     // =========================
//     // PAYU FLOW
//     // =========================
//     if (config.activeGateway === 'payu') {

//       const key = config.payu.merchantKey || process.env.PAYU_KEY;
//       const salt = config.payu.merchantSalt || process.env.PAYU_SALT;

//       const payload = {
//         key,
//         txnid: txnId,
//         amount: plan.amount,
//         productinfo: plan.name,
//         firstname: req.user.firstName,
//         email: req.user.email || 'test@test.com',
//         udf1: subscription._id.toString(),
//         success_url: config.payu.successUrl || 'http://localhost:5000/api/payment/success',
//         failure_url: config.payu.failureUrl || 'http://localhost:5000/api/payment/failure'
//       };

//       const hashString = `${payload.key}|${payload.txnid}|${payload.amount}|${payload.productinfo}|${payload.firstname}|${payload.email}|${payload.udf1}|||||||||||${salt}`;

//       const hash = crypto.createHash('sha512').update(hashString).digest('hex');

//       return res.json({
//         success: true,
//         gateway: 'payu',
//         redirectUrl: 'https://secure.payu.in/_payment',
//         data: {
//           ...payload,
//           hash
//         }
//       });
//     }

//     // =========================
//     // CASHFREE FLOW (SIMPLIFIED)
//     // =========================
//     if (config.activeGateway === 'cashfree') {

//       const orderId = txnId;

//       return res.json({
//         success: true,
//         gateway: 'cashfree',
//         orderId,
//         message: 'Cashfree order created (frontend redirect required)',
//         data: subscription
//       });
//     }

//     return res.status(400).json({
//       success: false,
//       message: 'No payment gateway configured'
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

/** Cab-booking module route aliases */
exports.purchasePlanTesting = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true, deleted: { $ne: true } });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    const start = new Date();
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + plan.durationDays);
    await Subscription.updateMany(
      { driverId: req.user._id, status: 'active' },
      { $set: { status: 'expired', expiredAt: new Date() } }
    );
    const subscription = await Subscription.create({
      driverId: req.user._id,
      planId: plan._id,
      planName: plan.name,
      durationDays: plan.durationDays,
      amount: plan.amount,
      status: 'active',
      paymentStatus: 'paid',
      startDate: start,
      expiryDate: expiry,
      activatedAt: start,
      gateway: 'test',
      transactionId: `TEST-${Date.now()}`,
    });
    await SubscriptionHistory.create({
      driverId: req.user._id,
      subscriptionId: subscription._id,
      planId: plan._id,
      planName: plan.name,
      action: 'purchase',
      amount: plan.amount,
      startDate: start,
      expiryDate: expiry,
      transactionId: subscription.transactionId,
    });
    return res.status(201).json({ success: true, message: 'Subscription activated', data: subscription });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.purchaseByWallet = async (req, res) => {
  try {
    const { planId, intent } = req.body;
    const result = await subscriptionLifecycle.purchaseByWallet(req.user._id, planId, intent);
    return res.json({
      success: true,
      message: result.message,
      intent: result.intent,
      data: result.subscription,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

exports.renewSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    const result = await subscriptionLifecycle.purchaseByWallet(req.user._id, planId, 'renew');
    return res.json({
      success: true,
      message: result.message,
      intent: result.intent,
      data: result.subscription,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};
exports.handlePaymentFailed = async (_req, res) => {
  return res.json({ success: true, message: 'Payment failure recorded' });
};

exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      driverId: req.user._id,
      status: 'active',
      expiryDate: { $gt: new Date() },
    }).populate('planId');
    return res.json({
      success: true,
      data: { active: Boolean(sub), subscription: sub },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.safeDeletePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { $set: { deleted: true, deletedAt: new Date(), isActive: false } },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    return res.json({ success: true, message: 'Plan deleted', data: plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.togglePlanStatus = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    plan.isActive = req.body.isActive !== undefined ? req.body.isActive : !plan.isActive;
    await plan.save();
    return res.json({ success: true, data: plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllSubscriptionsAdmin = async (_req, res) => {
  try {
    const items = await Subscription.find({ deleted: { $ne: true } })
      .populate('planId')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSubscriptionByIdAdmin = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate('planId');
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: sub });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.expireSubscriptionById = async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'expired', expiredAt: new Date() } },
      { new: true }
    );
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: sub });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSubscriptionStats = async (_req, res) => {
  try {
    const [active, expired] = await Promise.all([
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'expired' }),
    ]);
    return res.json({ success: true, data: { active, expired } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
