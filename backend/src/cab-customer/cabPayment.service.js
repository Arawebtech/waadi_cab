const CabRide = require('../models/CabRide');
const Customer = require('../models/Customer');
const gatewayResolver = require('../config/gatewayResolver');
const ridePaymentSettlement = require('../cab-services/ridePaymentSettlement.service');
const AppError = require('../utils/AppError');

const CAB_RIDE_MARKER = 'CAB_RIDE';

function customerAsUser(customer) {
  const name = customer.fullName || 'Customer';
  const parts = name.trim().split(/\s+/);
  return {
    _id: customer._id,
    firstName: parts[0] || 'Customer',
    lastName: parts.slice(1).join(' ') || '',
    email: customer.email,
    phoneNumber: customer.phone,
  };
}

function preparePayuCabRide(gatewayService, ride, customer) {
  const txnid = gatewayService.generateTransactionId(ride.rideNumber);
  const paymentParams = {
    txnid,
    amount: String(ride.fare?.total || 0),
    productinfo: `Wadi Cab Ride - ${ride.rideNumber}`,
    firstname: customerAsUser(customer).firstName,
    email: customer.email || `${customer.phone || 'customer'}@wadisupport.com`,
    phone: customer.phone || '9999999999',
    udf1: String(ride._id),
    udf2: ride.rideNumber,
    udf5: CAB_RIDE_MARKER,
  };
  const hash = gatewayService.generateHash(paymentParams);
  return {
    success: true,
    paymentUrl: gatewayService.paymentUrl,
    paymentData: {
      key: gatewayService.key,
      ...paymentParams,
      udf3: '', udf4: '', udf6: '', udf7: '', udf8: '', udf9: '', udf10: '',
      hash,
      surl: gatewayService.successUrl,
      furl: gatewayService.failureUrl,
      service_provider: 'payu_paisa',
      curl: gatewayService.failureUrl,
      pg: '',
    },
  };
}

async function prepareCashfreeCabRide(gatewayService, ride, customer, options) {
  const bookingAdapter = {
    _id: ride._id,
    bookingId: ride.rideNumber,
    amount: ride.fare?.total,
    tax_mode: 'cab_ride',
    vehicle_number: ride.vehicleTypeSlug || 'cab',
    visiting_state: { name: ride.pickup?.address?.slice(0, 40) || 'Ride' },
  };
  const result = await gatewayService.preparePaymentData(bookingAdapter, customerAsUser(customer), options);
  if (result.success && result.paymentData) {
    result.paymentData.udf5 = CAB_RIDE_MARKER;
    result.paymentData.cab_ride_id = String(ride._id);
  }
  return result;
}

async function initiateRidePayment(customerId, rideId, req) {
  const ride = await CabRide.findOne({
    _id: rideId,
    customerId,
    status: { $in: ['TRIP_STARTED', 'TRIP_COMPLETED'] },
  });
  if (!ride) throw new AppError('Ride not found or payment not available yet', 404);
  if (ride.paymentStatus === 'paid' || ride.paymentStatus === 'paid_by_cash') {
    throw new AppError('Ride is already paid', 400);
  }

  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError('Customer not found', 404);

  const { name: gatewayName, service: gatewayService, isValid, errors } = await gatewayResolver.prepareActiveGateway();
  if (!isValid) throw new AppError(`Payment gateway unavailable: ${errors.join('; ')}`, 500);

  const platform = ['app', 'android', 'ios'].includes(String(req?.headers?.['x-client-platform'] || req?.query?.platform || '').toLowerCase()) ? 'app' : 'web';
  const preparation = gatewayName === 'cashfree'
    ? await prepareCashfreeCabRide(gatewayService, ride, customer, { platform })
    : preparePayuCabRide(gatewayService, ride, customer);

  if (!preparation.success) throw new AppError(preparation.error || 'Failed to prepare payment', 500);

  const txnid = preparation.paymentData.txnid;
  ride.paymentDetails = { ...(ride.paymentDetails || {}), transactionId: txnid, gateway: gatewayName, initiatedAt: new Date() };
  ride.paymentStatus = 'pending';
  await ride.save();

  return {
    gateway: gatewayName,
    paymentUrl: preparation.paymentUrl,
    paymentData: preparation.paymentData,
    ride: { id: ride._id, rideNumber: ride.rideNumber, amount: ride.fare?.total },
  };
}

async function verifyAndSettleRidePayment(customerId, txnId) {
  const ride = await CabRide.findOne({
    customerId,
    'paymentDetails.transactionId': txnId,
    status: { $in: ['TRIP_STARTED', 'TRIP_COMPLETED'] },
  });
  if (!ride) throw new AppError('Ride payment not found for transaction', 404);
  if (ride.paymentStatus === 'paid') return { ride, alreadyPaid: true };

  const { name: gatewayName, service: gatewayService } = await gatewayResolver.getActiveGateway();
  let verified = false;
  let gatewayPaymentId = null;

  if (gatewayName === 'payu') {
    const paymentController = require('../controllers/paymentController');
    try {
      const result = await paymentController.verifyWithPayU(txnId);
      verified = result?.verified;
    } catch { verified = false; }
  } else if (gatewayName === 'cashfree') {
    try {
      const result = await gatewayService.verifyOrder(txnId);
      verified = result?.verified;
      gatewayPaymentId = result?.data?.cf_payment_id?.toString?.() || null;
    } catch { verified = false; }
  }

  if (!verified) throw new AppError('Payment not verified yet', 402);

  const settled = await ridePaymentSettlement.settleOnlinePayment(ride._id, {
    transactionId: txnId, gateway: gatewayName, gatewayPaymentId, amount: ride.fare?.total, customerId,
  });
  return { ride: settled, alreadyPaid: false };
}

async function handlePayUCallback(payuResponse) {
  if (payuResponse.udf5 !== CAB_RIDE_MARKER) return null;
  const ride = await CabRide.findById(payuResponse.udf1);
  if (!ride) throw new AppError('Cab ride not found for payment callback', 404);

  const payuService = require('../services/payuService');
  const normalized = payuService.getPaymentStatus(payuResponse.status);
  if (normalized !== 'paid') {
    ride.paymentStatus = normalized === 'pending' ? 'pending' : 'failed';
    ride.paymentDetails = { ...(ride.paymentDetails || {}), transactionId: payuResponse.txnid, gateway: 'payu', gatewayPaymentId: payuResponse.mihpayid };
    await ride.save();
    return { ride, paymentStatus: ride.paymentStatus };
  }

  const settled = await ridePaymentSettlement.settleOnlinePayment(ride._id, {
    transactionId: payuResponse.txnid, gateway: 'payu', gatewayPaymentId: payuResponse.mihpayid, amount: payuResponse.amount,
  });
  return { ride: settled, paymentStatus: 'paid' };
}

async function getRidePaymentStatus(customerId, txnId) {
  const ride = await CabRide.findOne({ customerId, 'paymentDetails.transactionId': txnId }).lean();
  if (!ride) throw new AppError('Payment transaction not found', 404);
  return { txnId, paymentStatus: ride.paymentStatus, rideId: ride._id, amount: ride.fare?.total };
}

module.exports = { CAB_RIDE_MARKER, initiateRidePayment, verifyAndSettleRidePayment, handlePayUCallback, getRidePaymentStatus };
