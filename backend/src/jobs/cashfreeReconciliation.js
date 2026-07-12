/**
 * Periodic reconciliation for pending Cashfree payments.
 * Catches cases where webhook/redirect did not update the database.
 */
const Booking = require('../models/Booking');
const cashfreePaymentConfirmation = require('../services/cashfreePaymentConfirmation');
const { logPayment } = require('../utils/paymentLogger');

const DEFAULT_INTERVAL_MS = parseInt(process.env.CASHFREE_RECONCILE_INTERVAL_MS || '300000', 10);
const LOOKBACK_DAYS = parseInt(process.env.CASHFREE_RECONCILE_LOOKBACK_DAYS || '7', 10);
const BATCH_SIZE = parseInt(process.env.CASHFREE_RECONCILE_BATCH_SIZE || '30', 10);

let timer = null;
let running = false;

async function reconcilePendingCashfreePayments() {
  if (running) {
    logPayment('reconciliation_skipped_busy');
    return;
  }

  running = true;
  const startedAt = Date.now();

  try {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const pendingBookings = await Booking.find({
      status: 'pending',
      payment_status: 'pending',
      'payment_details.payment_method': 'cashfree',
      'payment_details.transaction_id': { $exists: true, $ne: '' },
      createdAt: { $gte: since },
    })
      .select('bookingId payment_details.transaction_id amount')
      .sort({ createdAt: -1 })
      .limit(BATCH_SIZE);

    logPayment('reconciliation_start', { count: pendingBookings.length, since: since.toISOString() });

    let confirmed = 0;
    let stillPending = 0;
    let failed = 0;

    for (const booking of pendingBookings) {
      const orderId = booking.payment_details.transaction_id;
      try {
        const result = await cashfreePaymentConfirmation.verifyAndConfirm(orderId, 'reconciliation', {
          useRetry: false,
        });

        if (result.ok && (result.newlyConfirmed || result.alreadyPaid)) {
          confirmed += 1;
        } else if (result.reason === 'PENDING') {
          stillPending += 1;
        } else if (result.ok && result.booking?.payment_status === 'failed') {
          failed += 1;
        }
      } catch (err) {
        logPayment('reconciliation_item_error', {
          orderId,
          bookingId: booking.bookingId,
          error: err.message,
        });
      }
    }

    logPayment('reconciliation_done', {
      checked: pendingBookings.length,
      confirmed,
      stillPending,
      failed,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logPayment('reconciliation_error', { error: error.message });
  } finally {
    running = false;
  }
}

function startCashfreeReconciliationJob() {
  if (process.env.CASHFREE_RECONCILE_ENABLED === 'false') {
    console.log('ℹ️ Cashfree reconciliation job disabled (CASHFREE_RECONCILE_ENABLED=false)');
    return;
  }

  if (timer) return;

  const intervalMs = Number.isFinite(DEFAULT_INTERVAL_MS) ? DEFAULT_INTERVAL_MS : 300000;
  console.log(`🔄 Cashfree reconciliation job every ${intervalMs / 1000}s`);

  setTimeout(() => {
    reconcilePendingCashfreePayments().catch(() => {});
  }, 15000);

  timer = setInterval(() => {
    reconcilePendingCashfreePayments().catch(() => {});
  }, intervalMs);
}

function stopCashfreeReconciliationJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startCashfreeReconciliationJob,
  stopCashfreeReconciliationJob,
  reconcilePendingCashfreePayments,
};
