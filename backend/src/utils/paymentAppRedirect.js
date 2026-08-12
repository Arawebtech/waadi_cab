/**
 * Cashfree callback redirects — mirrors paymentController.handlePaymentSuccess / handlePaymentFailure.
 * PayU uses inline HTML in paymentController; Cashfree uses this helper (same output shape).
 *
 * Native app: deep-link back into Capacitor (wadicab://payment/...).
 * Web browser: HTTP redirect to FRONTEND_URL payment pages.
 */

const { isAppPlatformRequest } = require('./platformRequest');

function getFrontendBase() {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.CUSTOMER_APP_URL ||
    'http://192.168.1.8:3000';
  return raw.trim().replace(/\/+$/, '');
}

function getDeepLinkBase() {
  return (process.env.APP_DEEP_LINK_BASE || 'wadicab://payment').replace(/\/+$/, '');
}

function buildPaymentQuery(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

function renderHtmlRedirect(targetUrl) {
  const escaped = targetUrl.replace(/'/g, '%27');
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>Completing payment…</title>` +
    `<meta http-equiv="refresh" content="0;url=${encodeURI(targetUrl)}"></head>` +
    `<body><script>window.location.replace(${JSON.stringify(targetUrl)});</script>` +
    `<p>Completing payment… If not redirected, <a href="${escaped}">tap here</a>.</p></body></html>`
  );
}

/**
 * Opens the installed app via custom URL scheme (Capacitor appUrlOpen).
 * Includes a manual browser fallback link for edge cases.
 */
function renderAppDeepLinkRedirect(deepLink, webFallbackUrl) {
  const escapedDeep = deepLink.replace(/"/g, '&quot;');
  const escapedWeb = webFallbackUrl.replace(/"/g, '&quot;');
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>Returning to app…</title>` +
    `<meta http-equiv="refresh" content="0;url=${encodeURI(deepLink)}"></head>` +
    `<body style="font-family:system-ui;padding:24px;text-align:center">` +
    `<p>Returning to Waadi Cab…</p>` +
    `<script>` +
    `(function(){var d=${JSON.stringify(deepLink)};` +
    `try{window.location.href=d;}catch(e){}` +
    `setTimeout(function(){try{window.location.replace(d);}catch(e2){}},300);})();` +
    `</script>` +
    `<p style="margin-top:16px;font-size:14px;color:#6b7280">` +
    `<a href="${escapedDeep}">Open app</a> · ` +
    `<a href="${escapedWeb}">Continue in browser</a>` +
    `</p></body></html>`
  );
}

function redirectAfterPayment(res, outcome, details = {}) {
  const req = res.req;
  const isApp = isAppPlatformRequest(req);
  const frontendBase = getFrontendBase();

  const status =
    outcome === 'success' ? 'success' : outcome === 'pending' ? 'pending' : 'failure';

  const query = buildPaymentQuery({
    txnid: details.txnId || '',
    txnId: details.txnId || '',
    orderId: details.txnId || details.orderId || '',
    order_id: details.txnId || details.orderId || '',
    status,
    amount: details.amount ?? '',
    bookingId: details.bookingId || '',
    gateway: details.gateway || 'cashfree',
    error: outcome === 'failure' ? (details.error || 'Payment failed') : undefined,
  });

  const webPath =
    outcome === 'success'
      ? '/payment/success'
      : outcome === 'pending'
        ? '/payment/pending'
        : '/payment/failure';

  const targetUrl = `${frontendBase}${webPath}?${query}`;

  // Capacitor / native app — deep-link into installed app (same pattern as PayU app callback)
  if (isApp) {
    const deepLinkBase = getDeepLinkBase();
    const deepLinkPath =
      outcome === 'success' ? '/success' : outcome === 'pending' ? '/pending' : '/failure';
    const deepLink = `${deepLinkBase}${deepLinkPath}?${query}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(renderAppDeepLinkRedirect(deepLink, targetUrl));
  }

  return res.redirect(302, targetUrl);
}

module.exports = {
  redirectAfterPayment,
  getFrontendBase,
  getDeepLinkBase,
};
