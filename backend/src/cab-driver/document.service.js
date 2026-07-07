const DriverDocument = require('../models/DriverDocument');
const { uploadDriverFile, deleteDriverFile } = require('./upload.service');

async function listDocuments(userId) {
  return DriverDocument.find({ userId, isActive: true }).sort({ docType: 1 }).lean();
}

async function getDocument(userId, docType) {
  return DriverDocument.findOne({ userId, docType, isActive: true }).lean();
}

async function upsertDocument(userId, docType, file, vehicleId = null) {
  const uploaded = await uploadDriverFile(file, docType, userId);
  const existing = await DriverDocument.findOne({ userId, docType });

  if (existing?.publicId) {
    await deleteDriverFile(existing.publicId);
  }

  const payload = {
    userId,
    docType,
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    mimeType: file.mimetype,
    status: 'pending',
    uploadedAt: new Date(),
    rejectionReason: null,
    vehicleId,
    isActive: true,
  };

  const doc = existing
    ? await DriverDocument.findByIdAndUpdate(existing._id, { $set: payload }, { new: true })
    : await DriverDocument.create(payload);

  return doc.toObject();
}

async function removeDocument(userId, docType) {
  const doc = await DriverDocument.findOne({ userId, docType, isActive: true });
  if (!doc) {
    const err = new Error('Document not found');
    err.statusCode = 404;
    throw err;
  }
  if (doc.publicId) await deleteDriverFile(doc.publicId);
  doc.url = null;
  doc.publicId = null;
  doc.status = 'not_uploaded';
  doc.uploadedAt = null;
  doc.rejectionReason = null;
  await doc.save();
  return doc.toObject();
}

module.exports = {
  listDocuments,
  getDocument,
  upsertDocument,
  removeDocument,
};
