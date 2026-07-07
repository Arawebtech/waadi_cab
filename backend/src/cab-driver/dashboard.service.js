const CabRide = require('../models/CabRide');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function getOrCreateWallet(driverId) {
  let wallet = await Wallet.findOne({ ownerId: driverId, ownerType: 'Driver' });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId: driverId, ownerType: 'Driver', balance: 0 });
  }
  return wallet;
}

async function getDriverDashboard(driverId) {
  const oid = driverId;
  const todayStart = startOfDay();
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);

  const completedMatch = { driverId: oid, status: 'TRIP_COMPLETED' };

  const [
    todayTrips,
    weekTrips,
    monthTrips,
    totalTrips,
    cancelledTrips,
    todayEarningsAgg,
    weekEarningsAgg,
    monthEarningsAgg,
    totalEarningsAgg,
    wallet,
  ] = await Promise.all([
    CabRide.countDocuments({ ...completedMatch, completedAt: { $gte: todayStart } }),
    CabRide.countDocuments({ ...completedMatch, completedAt: { $gte: weekStart } }),
    CabRide.countDocuments({ ...completedMatch, completedAt: { $gte: monthStart } }),
    CabRide.countDocuments(completedMatch),
    CabRide.countDocuments({ driverId: oid, status: 'CANCELLED' }),
    CabRide.aggregate([
      { $match: { ...completedMatch, completedAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$fare.total' } } },
    ]),
    CabRide.aggregate([
      { $match: { ...completedMatch, completedAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$fare.total' } } },
    ]),
    CabRide.aggregate([
      { $match: { ...completedMatch, completedAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$fare.total' } } },
    ]),
    CabRide.aggregate([
      { $match: completedMatch },
      { $group: { _id: null, total: { $sum: '$fare.total' } } },
    ]),
    getOrCreateWallet(oid),
  ]);

  const assigned = totalTrips + cancelledTrips;
  const acceptanceRate = assigned > 0 ? Math.round((totalTrips / assigned) * 100) : 100;
  const cancellationRate = assigned > 0 ? Math.round((cancelledTrips / assigned) * 100) : 0;

  return {
    stats: {
      todayTrips,
      weekTrips,
      monthTrips,
      totalTrips,
      cancelledTrips,
      acceptanceRate,
      cancellationRate,
      rating: 4.8,
    },
    earnings: {
      today: todayEarningsAgg[0]?.total || 0,
      week: weekEarningsAgg[0]?.total || 0,
      month: monthEarningsAgg[0]?.total || 0,
      total: totalEarningsAgg[0]?.total || 0,
    },
    wallet: {
      balance: wallet.balance,
      currency: wallet.currency || 'INR',
    },
  };
}

async function getWalletTransactions(driverId, query = {}) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;
  const filter = { ownerId: driverId, ownerType: 'Driver' };
  const [items, total] = await Promise.all([
    WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WalletTransaction.countDocuments(filter),
  ]);
  return {
    items,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  };
}

module.exports = { getDriverDashboard, getWalletTransactions };
