/**
 * Cashfree callback redirects — mirrors paymentController.handlePaymentSuccess / handlePaymentFailure.
 * PayU uses inline HTML in paymentController; Cashfree uses this helper (same output shape).
 */

const { isAppPlatformRequest } = require('./platformRequest');

function getFrontendBase() {
  return (process.env.FRONTEND_URL || 'https://book.waadi.in').trim().replace(/\/+$/, '');
}

function getDeepLinkBase() {
  return process.env.APP_DEEP_LINK_BASE || 'wadicab://payment';
}

function buildPaymentQuery(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

/**
 * Same deep-link HTML as PayU handlePaymentSuccess (Capacitor app + platform=app).
 */
function renderPayUStyleAppRedirect(deepLink) {
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>Completing payment…</title>` +
    `<meta http-equiv="refresh" content="0;url='${deepLink}'"></head>` +
    `<body><script>setTimeout(function(){window.location='${deepLink}';},0);</script>` +
    `<p>Completing payment… If not redirected, <a href="${deepLink}">tap here</a>.</p></body></html>`
  );
}

function redirectAfterPayment(res, outcome, details = {}) {
  const req = res.req;
  const isApp = isAppPlatformRequest(req);
  const frontendBase = getFrontendBase();
  const deepLinkBase = getDeepLinkBase();

  const query = buildPaymentQuery({
    txnid: details.txnId || '',
    status: outcome === 'success' ? 'success' : outcome === 'pending' ? 'pending' : 'failure',
    amount: details.amount ?? '',
    bookingId: details.bookingId || '',
    error: outcome === 'failure' ? (details.error || 'Payment failed') : undefined,
  });

  const webPath =
    outcome === 'success'
      ? '/payment/success'
      : outcome === 'pending'
        ? '/payment/pending'
        : '/payment/failure';

  if (isApp) {
    const deepLinkPath =
      outcome === 'success' ? '/success' : outcome === 'pending' ? '/pending' : '/failure';
    const deepLink = `${deepLinkBase}${deepLinkPath}?${query}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderPayUStyleAppRedirect(deepLink));
  }

  return res.redirect(302, `${frontendBase}${webPath}?${query}`);
}

module.exports = {
  redirectAfterPayment,
  getFrontendBase,
  getDeepLinkBase,
};
