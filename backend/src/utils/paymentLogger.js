/**
 * Structured payment flow logging for production debugging.
 */
function logPayment(event, details = {}) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...details,
  };
  console.log('[PaymentFlow]', JSON.stringify(payload));
}

module.exports = { logPayment };
