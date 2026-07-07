const env = require('../config/env');
const Coupon = require('../models/Coupon');
const AppError = require('../utils/AppError');

function isNightHour(date = new Date()) {
  const hour = date.getHours();
  const { nightStartHour, nightEndHour } = env.fare;
  if (nightStartHour > nightEndHour) {
    return hour >= nightStartHour || hour < nightEndHour;
  }
  return hour >= nightStartHour && hour < nightEndHour;
}

function calculateSurgeMultiplier(scheduledAt) {
  const date = scheduledAt ? new Date(scheduledAt) : new Date();
  const hour = date.getHours();
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) {
    return env.fare.surgePeakMultiplier;
  }
  return 1;
}

async function applyCoupon(code, fareTotal, tripType) {
  if (!code) return { discount: 0, coupon: null };
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) throw new AppError('Invalid coupon', 400);
  if (coupon.validUntil && coupon.validUntil < new Date()) throw new AppError('Coupon expired', 400);
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError('Coupon limit reached', 400);
  if (coupon.minFare && fareTotal < coupon.minFare) throw new AppError(`Minimum fare ₹${coupon.minFare} required`, 400);
  if (coupon.tripType !== 'all' && coupon.tripType !== tripType) throw new AppError('Coupon not valid for this trip', 400);

  let discount = 0;
  if (coupon.discountType === 'flat') {
    discount = coupon.discountValue;
  } else {
    discount = (fareTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  }
  discount = Math.min(discount, fareTotal);
  return { discount: Math.round(discount * 100) / 100, coupon };
}

function calculateFare({
  vehicleType,
  distanceKm,
  durationMin,
  tripType = 'local',
  intercityBasePrice = 0,
  toll = 0,
  waitingMin = 0,
  scheduledAt,
  couponDiscount = 0,
}) {
  const base = vehicleType.baseFare;
  const distance = Math.round(distanceKm * vehicleType.perKmRate * 100) / 100;
  const time = Math.round(durationMin * vehicleType.perMinRate * 100) / 100;
  const surgeMultiplier = calculateSurgeMultiplier(scheduledAt);
  const surge = surgeMultiplier > 1 ? Math.round((base + distance + time) * (surgeMultiplier - 1) * 100) / 100 : 0;
  const night = isNightHour(scheduledAt ? new Date(scheduledAt) : new Date())
    ? Math.round((base + distance) * (env.fare.nightMultiplier - 1) * 100) / 100
    : 0;
  const waiting = Math.round(waitingMin * env.fare.waitingPerMin * 100) / 100;
  const intercity = tripType === 'intercity' ? intercityBasePrice : 0;

  let subtotal = base + distance + time + surge + night + waiting + toll + intercity;
  if (subtotal < vehicleType.minFare) subtotal = vehicleType.minFare;

  const discount = Math.min(couponDiscount, subtotal);
  const total = Math.round((subtotal - discount) * 100) / 100;

  return {
    base,
    distance,
    time,
    surge,
    night,
    waiting,
    toll,
    intercity,
    discount,
    total,
  };
}

async function estimateFares({ vehicleTypes, distanceKm, durationMin, tripType, intercityBasePrice, couponCode, scheduledAt }) {
  let couponDiscount = 0;
  if (couponCode) {
    const preview = await applyCoupon(couponCode, 99999, tripType);
    couponDiscount = preview.discount;
  }

  return vehicleTypes.map((vt) => ({
    vehicleId: vt._id,
    vehicleType: vt,
    fare: calculateFare({
      vehicleType: vt,
      distanceKm,
      durationMin,
      tripType,
      intercityBasePrice,
      scheduledAt,
      couponDiscount: couponCode ? couponDiscount : 0,
    }),
    etaMin: Math.max(3, Math.ceil(durationMin * 0.1)),
  }));
}

module.exports = { calculateFare, estimateFares, applyCoupon, isNightHour };
