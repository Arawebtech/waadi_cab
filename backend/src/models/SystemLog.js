const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema(
  {
    level: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    message: { type: String, required: true },
    requestId: { type: String, index: true },
    bookingId: { type: String, index: true },
    transactionId: { type: String, index: true },
    userId: { type: String, index: true },
    data: { type: mongoose.Schema.Types.Mixed },
    source: { type: String },
    sourceFile: { type: String },
    sourceFunction: { type: String },
  },
  { timestamps: true }
);

systemLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90-day TTL

module.exports = mongoose.model('SystemLog', systemLogSchema);
