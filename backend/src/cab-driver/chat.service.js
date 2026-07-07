const RideChatMessage = require('../models/RideChatMessage');
const CabRide = require('../models/CabRide');

async function assertRideParticipant(driverId, rideId) {
  const ride = await CabRide.findOne({ _id: rideId, driverId }).lean();
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  return ride;
}

async function assertCustomerRide(customerId, rideId) {
  const ride = await CabRide.findOne({ _id: rideId, customerId }).lean();
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  return ride;
}

async function listMessages(driverId, rideId, { page = 1, limit = 50 } = {}) {
  await assertRideParticipant(driverId, rideId);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    RideChatMessage.find({ rideId }).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    RideChatMessage.countDocuments({ rideId }),
  ]);
  return { items, pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
}

async function listMessagesForCustomer(customerId, rideId, { page = 1, limit = 50 } = {}) {
  await assertCustomerRide(customerId, rideId);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    RideChatMessage.find({ rideId }).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    RideChatMessage.countDocuments({ rideId }),
  ]);
  return { items, pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
}

async function sendMessage(driverId, rideId, { message, type = 'text' }) {
  await assertRideParticipant(driverId, rideId);
  const doc = await RideChatMessage.create({
    rideId,
    senderId: driverId,
    senderRole: 'driver',
    message: message.trim(),
    type,
  });
  return doc.toObject();
}

async function sendCustomerMessage(customerId, rideId, { message, type = 'text' }) {
  await assertCustomerRide(customerId, rideId);
  const doc = await RideChatMessage.create({
    rideId,
    senderId: customerId,
    senderRole: 'customer',
    message: message.trim(),
    type,
  });
  return doc.toObject();
}

module.exports = {
  listMessages,
  listMessagesForCustomer,
  sendMessage,
  sendCustomerMessage,
};
