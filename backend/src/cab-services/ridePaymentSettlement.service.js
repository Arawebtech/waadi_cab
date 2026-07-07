const CabRide = require('../models/CabRide');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const AppError = require('../utils/AppError');

const ADMIN_COMMISSION = 0;

const PAYABLE_RIDE_STATUSES = ['TRIP_STARTED', 'TRIP_COMPLETED'];

function assertRidePayable(ride) {
  if (!PAYABLE_RIDE_STATUSES.includes(ride.status)) {
    throw new AppError('Ride payment is only allowed during or after the trip', 400);
  }
}

async function getOrCreateDriverWallet(driverId) {
  let wallet = await Wallet.findOne({ ownerId: driverId, ownerType: 'Driver' });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId: driverId, ownerType: 'Driver', balance: 0 });
  }
  return wallet;
}

async function creditDriverFullFare(driverId, ride, amount, paymentMeta = {}) {
  if (!driverId) throw new AppError('Driver not assigned to ride', 400);
  const fare = Math.round(Number(amount || ride.fare?.total || 0) * 100) / 100;
  if (fare <= 0) throw new AppError('Invalid ride fare amount', 400);

  const wallet = await getOrCreateDriverWallet(driverId);
  const balanceBefore = wallet.balance;
  wallet.balance = Math.round((wallet.balance + fare) * 100) / 100;
  await wallet.save();

  await WalletTransaction.create({
    walletId: wallet._id,
    ownerId: driverId,
    ownerType: 'Driver',
    type: 'credit',
    purpose: 'booking',
    amount: fare,
    balanceBefore,
    balanceAfter: wallet.balance,
    remark: `Online ride payment · ${ride.rideNumber || ride._id}`,
    metadata: { rideId: ride._id, rideNumber: ride.rideNumber, adminCommission: ADMIN_COMMISSION, ...paymentMeta },
  });

  return { wallet, creditedAmount: fare };
}

async function markCashPayment(ride) {
  if (ride.paymentStatus === 'paid_by_cash' || ride.paymentStatus === 'paid') return ride;
  ride.paymentMethod = 'cash';
  ride.paymentStatus = 'paid_by_cash';
  ride.adminCommission = ADMIN_COMMISSION;
  ride.driverEarnings = ride.fare?.total || 0;
  ride.paymentDetails = { ...(ride.paymentDetails || {}), paidAt: new Date(), gateway: 'cash' };
  await ride.save();
  return ride;
}

async function settleOnlinePayment(rideId, { transactionId, gateway, gatewayPaymentId, amount, customerId, paymentMethod = 'upi' }) {
  const ride = await CabRide.findById(rideId);
  if (!ride) throw new AppError('Ride not found', 404);
  if (customerId && String(ride.customerId) !== String(customerId)) throw new AppError('Ride does not belong to customer', 403);
  assertRidePayable(ride);
  if (ride.paymentStatus === 'paid') return ride;

  const { creditedAmount } = await creditDriverFullFare(ride.driverId, ride, amount || ride.fare?.total, {
    transactionId, gateway, gatewayPaymentId,
  });

  ride.paymentMethod = paymentMethod;
  ride.paymentStatus = 'paid';
  ride.adminCommission = ADMIN_COMMISSION;
  ride.driverEarnings = creditedAmount;
  ride.paymentDetails = {
    transactionId: transactionId || ride.paymentDetails?.transactionId,
    gateway: gateway || ride.paymentDetails?.gateway,
    gatewayPaymentId: gatewayPaymentId || ride.paymentDetails?.gatewayPaymentId,
    paidAt: new Date(),
  };
  await ride.save();
  return ride;
}

async function settleCustomerWalletPayment(ride, customerId) {
  if (ride.paymentStatus === 'paid') return ride;
  const walletService = require('./wallet.service');
  const amount = ride.fare?.total || 0;
  await walletService.debit(customerId, 'Customer', amount, ride._id, `Ride ${ride.rideNumber}`);
  return settleOnlinePayment(ride._id, {
    amount, gateway: 'wallet', transactionId: `wallet_${ride._id}`, customerId, paymentMethod: 'wallet',
  });
}

module.exports = { ADMIN_COMMISSION, markCashPayment, settleOnlinePayment, settleCustomerWalletPayment };
