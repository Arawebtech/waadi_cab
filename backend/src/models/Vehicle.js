const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  url: { type: String, default: null },
  public_id: { type: String, default: null },
  status: {
    type: String,
    enum: {
      values: ['not_uploaded', 'pending', 'approved', 'rejected'],
      message: 'Invalid document status',
    },
    default: 'not_uploaded',
  },
  uploadedAt: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, default: null, trim: true },
}, { _id: false });

const verificationHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: {
      values: [
        'vehicle_created',
        'vehicle_updated',
        'vehicle_approved',
        'vehicle_rejected',
        'document_uploaded',
        'document_approved',
        'document_rejected',
        'document_deleted',
      ],
      message: 'Invalid verification action',
    },
  },
  documentType: {
    type: String,
    enum: {
      values: ['rc', 'insurance', 'aadhaar', 'pan', 'puc', 'license'],
      message: 'Invalid document type',
    },
    default: null,
  },
  remarks: { type: String, default: null, trim: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const vehicleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vehicle owner is required'],
    index: true,
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/, 'Invalid vehicle number format'],
  },
  seatCapacity: {
    type: String,
    enum: {
      values: ['2(1+1)', '5(4+1)', '6(5+1)', '7(6+1)', '8(7+1)', '9(8+1)'],
      message: 'Invalid seat capacity',
    },
    required: [true, 'Seat capacity is required'],
  },
  vehicleType: {
    type: String,
    enum: {
      values: ['sedan', 'suv', 'hatchback', 'tempo', 'bus'],
      message: 'Invalid vehicle type',
    },
    required: [true, 'Vehicle type is required'],
  },
  isDefault: { type: Boolean, default: false },
  serviceTypes: {
    type: [String],
    enum: { values: ['local', 'intercity'], message: 'Service type must be local or intercity' },
    default: ['local'],
  },
  documents: {
    rc: { type: documentSchema, default: () => ({}) },
    aadhaar: { type: documentSchema, default: () => ({}) },
    pan: { type: documentSchema, default: () => ({}) },
    insurance: { type: documentSchema, default: () => ({}) },
    puc: { type: documentSchema, default: () => ({}) },
    license: { type: documentSchema, default: () => ({}) },
  },
  verificationStatus: {
    type: String,
    enum: {
      values: ['draft', 'pending', 'under_review', 'approved', 'rejected'],
      message: 'Invalid verification status',
    },
    default: 'draft',
  },
  verifiedAt: { type: Date, default: null },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, default: null, trim: true },
  verificationHistory: { type: [verificationHistorySchema], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

vehicleSchema.index({ userId: 1 });
vehicleSchema.index({ vehicleNumber: 1 }, { unique: true });
vehicleSchema.index({ verificationStatus: 1, createdAt: -1 });
vehicleSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
