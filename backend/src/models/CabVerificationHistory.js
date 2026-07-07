const mongoose = require('mongoose');

const cabVerificationHistorySchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['driver_profile', 'driver_document', 'vehicle_document', 'vehicle', 'subscription'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'submitted',
        'approved',
        'rejected',
        'reupload_requested',
        'deleted',
        'reverified',
        'suspended',
        'activated',
        'expired',
        'pending',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'deleted', 'expired'],
      default: 'pending',
      index: true,
    },
    previousStatus: { type: String, default: null },
    reason: { type: String, default: null },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    performedByName: { type: String, default: 'Admin' },
    metadata: {
      docType: String,
      vehicleNumber: String,
      planName: String,
      documentUrl: String,
      entityLabel: String,
    },
    deleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

cabVerificationHistorySchema.index({ createdAt: -1 });
cabVerificationHistorySchema.index({ entityType: 1, status: 1, createdAt: -1 });
cabVerificationHistorySchema.index({ driverId: 1, createdAt: -1 });

module.exports = mongoose.model('CabVerificationHistory', cabVerificationHistorySchema);
