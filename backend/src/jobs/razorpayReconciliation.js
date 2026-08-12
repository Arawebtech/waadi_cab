const Booking = require('../models/Booking');
const razorpayPaymentConfirmation = require('../services/razorpayPaymentConfirmation');
const { logPayment } = require('../utils/paymentLogger');

const DEFAULT_INTERVAL_MS = parseInt(process.env.RAZORPAY_RECONCILE_INTERVAL_MS || '300000', 10);
const LOOKBACK_DAYS = parseInt(process.env.RAZORPAY_RECONCILE_LOOKBACK_DAYS || '7', 10);
const BATCH_SIZE = parseInt(process.env.RAZORPAY_RECONCILE_BATCH_SIZE || '30', 10);

let timer = null;
let running = false;

async function reconcilePendingRazorpayPayments() {
  if (running) return;
  running = true;

  try {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const pendingBookings = await Booking.find({
      status: 'pending',
      payment_status: 'pending',
      'payment_details.payment_method': 'razorpay',
      'payment_details.transaction_id': { $exists: true, $ne: '' },
      createdAt: { $gte: since },
    })
      .select('bookingId payment_details.transaction_id payment_details.razorpay_order_id amount')
      .sort({ createdAt: -1 })
      .limit(BATCH_SIZE);

    logPayment('razorpay_reconciliation_start', { count: pendingBookings.length });

    for (const booking of pendingBookings) {
      const txnId = booking.payment_details.transaction_id;
      try {
        await razorpayPaymentConfirmation.verifyAndConfirm(txnId, 'reconciliation', {
          useRetry: false,
          booking,
          razorpayOrderId: booking.payment_details.razorpay_order_id,
        });
      } catch (err) {
        logPayment('razorpay_reconciliation_item_error', { txnId, error: err.message });
      }
    }
  } catch (error) {
    logPayment('razorpay_reconciliation_error', { error: error.message });
  } finally {
    running = false;
  }
}

function startRazorpayReconciliationJob() {
  if (process.env.RAZORPAY_RECONCILE_ENABLED === 'false') return;
  if (timer) return;

  const intervalMs = Number.isFinite(DEFAULT_INTERVAL_MS) ? DEFAULT_INTERVAL_MS : 300000;
  console.log(`🔄 Razorpay reconciliation job every ${intervalMs / 1000}s`);

  setTimeout(() => reconcilePendingRazorpayPayments().catch(() => {}), 20000);
  timer = setInterval(() => reconcilePendingRazorpayPayments().catch(() => {}), intervalMs);
}

module.exports = { startRazorpayReconciliationJob, reconcilePendingRazorpayPayments };
