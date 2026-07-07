const mongoose = require('mongoose');

const DOC_TYPES = [
  'driving_license',
  'aadhaar',
  'pan',
  'rc',
  'insurance',
  'vehicle_permit',
  'fitness_certificate',
  'police_verification',
  'profile_photo',
  'additional',
];

const DOC_STATUSES = ['not_uploaded', 'pending', 'approved', 'rejected'];

const driverDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    docType: {
      type: String,
      enum: DOC_TYPES,
      required: true,
    },
    url: { type: String, default: null },
    publicId: { type: String, default: null },
    mimeType: { type: String, default: null },
    status: {
      type: String,
      enum: DOC_STATUSES,
      default: 'not_uploaded',
      index: true,
    },
    uploadedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: { type: String, default: null },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

driverDocumentSchema.index({ userId: 1, docType: 1 }, { unique: true });
driverDocumentSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('DriverDocument', driverDocumentSchema);
module.exports.DOC_TYPES = DOC_TYPES;
module.exports.DOC_STATUSES = DOC_STATUSES;
