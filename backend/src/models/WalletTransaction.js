
const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
  
   walletId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet',
        required: true
    },

    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    ownerType: {
        type: String,
        enum: ['Customer', 'Driver']
    },

    type: {
        type: String,
        enum: [
            'credit',
            'debit'
        ]
    },

    purpose: {
        type: String,
        enum: [
            'subscription_purchase',
            'subscription_renewal',
            'refund',
            'booking',
            'wallet_topup'
        ]
    },

    amount: Number,

    balanceBefore: Number,

    remark: String,
    balanceAfter: Number,
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentOrder', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ driverId: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);

