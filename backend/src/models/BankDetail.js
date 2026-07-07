const mongoose = require('mongoose');

const encryptedField = {
  encryptedData: String,
  iv: String,
  tag: String,
};

const bankDetailSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    accountHolderName: encryptedField,
    accountNumber: encryptedField,
    ifsc: encryptedField,
    bankName: { type: String, trim: true },
    branchName: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    verifiedAt: Date,
    rejectReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('BankDetail', bankDetailSchema);
