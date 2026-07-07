const mongoose = require('mongoose');

const rideChatMessageSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'CabRide', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['driver', 'customer'], required: true },
    message: { type: String, required: true, maxlength: 2000 },
    type: { type: String, enum: ['text', 'location'], default: 'text' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

rideChatMessageSchema.index({ rideId: 1, createdAt: 1 });

module.exports = mongoose.model('RideChatMessage', rideChatMessageSchema);
