const IntercityRequest = require('../models/IntercityRequest');
const IntercityBooking = require('../models/IntercityBooking');
const AppError = require('../utils/AppError');

/**
 * STEP 1: CREATE REQUEST (NOT BOOKING)
 */
async function createRequest(data) {
  const request = await IntercityRequest.create({
    customerId: data.customerId,
    fromCity: data.fromCity,
    toCity: data.toCity,
    packageId: data.packageId,
    status: 'pending',
    createdAt: new Date(),
  });

  return request;
}

/**
 * STEP 2: DRIVER ACCEPT → CREATE FINAL BOOKING
 */
async function acceptRequest({ requestId, driverId }) {
  const request = await IntercityRequest.findById(requestId);

  if (!request) throw new AppError('Request not found', 404);

  if (request.status !== 'pending') {
    throw new AppError('Request already processed', 400);
  }

  request.status = 'accepted';
  request.acceptedBy = driverId;
  await request.save();

  const booking = await IntercityBooking.create({
    customerId: request.customerId,
    driverId,
    fromCity: request.fromCity,
    toCity: request.toCity,
    packageId: request.packageId,
    status: 'confirmed',
    createdAt: new Date(),
  });

  return booking;
}

module.exports = {
  createRequest,
  acceptRequest,
};