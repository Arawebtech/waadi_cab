/**
 * Detect Capacitor / native app requests so payment return_url can deep-link correctly.
 */
function isAppPlatformRequest(req) {
  if (!req) return false;
  return (
    String(req.query?.platform || '').toLowerCase() === 'app' ||
    String(req.headers?.['x-platform'] || '').toLowerCase() === 'app' ||
    /Capacitor|Waadi Cab/i.test(req.headers?.['user-agent'] || '')
  );
}

module.exports = { isAppPlatformRequest };
