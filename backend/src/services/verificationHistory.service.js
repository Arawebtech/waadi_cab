const CabVerificationHistory = require('../models/CabVerificationHistory');

async function logVerification(entry) {
  return CabVerificationHistory.create({
    entityType: entry.entityType,
    entityId: entry.entityId,
    driverId: entry.driverId || null,
    action: entry.action,
    status: entry.status || 'pending',
    previousStatus: entry.previousStatus || null,
    reason: entry.reason || null,
    performedBy: entry.performedBy || null,
    performedByName: entry.performedByName || 'Admin',
    metadata: entry.metadata || {},
  });
}

async function listHistory({
  page = 1,
  limit = 20,
  search = '',
  entityType = '',
  status = '',
  action = '',
  dateFrom = '',
  dateTo = '',
  sort = 'newest',
} = {}) {
  const filter = { deleted: { $ne: true } };
  if (entityType) filter.entityType = entityType;
  if (status) filter.status = status;
  if (action) filter.action = action;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(`${dateTo}T23:59:59.999`);
  }
  if (search) {
    filter.$or = [
      { 'metadata.entityLabel': { $regex: search, $options: 'i' } },
      { 'metadata.vehicleNumber': { $regex: search, $options: 'i' } },
      { 'metadata.docType': { $regex: search, $options: 'i' } },
      { reason: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sortOpt = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    CabVerificationHistory.find(filter)
      .populate('driverId', 'firstName lastName phoneNumber')
      .sort(sortOpt)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    CabVerificationHistory.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

async function softDeleteHistory(id) {
  const record = await CabVerificationHistory.findByIdAndUpdate(
    id,
    { $set: { deleted: true } },
    { new: true }
  );
  if (!record) throw new Error('History record not found');
  return record;
}

module.exports = { logVerification, listHistory, softDeleteHistory };
