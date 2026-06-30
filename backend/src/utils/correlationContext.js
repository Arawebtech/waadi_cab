const { AsyncLocalStorage } = require('async_hooks');
const { randomUUID } = require('crypto');

const storage = new AsyncLocalStorage();

function runWithContext(context, fn) {
  const parent = storage.getStore() || {};
  return storage.run({ ...parent, ...context }, fn);
}

function getContext() {
  return storage.getStore() || {};
}

function setContext(partial) {
  const store = storage.getStore();
  if (store) {
    Object.assign(store, partial);
  }
}

function generateRequestId() {
  return randomUUID();
}

function extractCorrelationFromRequest(req) {
  const headerId =
    req.headers['x-request-id'] ||
    req.headers['x-correlation-id'] ||
    req.headers['x-trace-id'];

  return {
    requestId: headerId || generateRequestId(),
    bookingId: req.headers['x-booking-id'] || req.query?.bookingId || undefined,
    transactionId:
      req.headers['x-transaction-id'] ||
      req.query?.txnid ||
      req.query?.order_id ||
      req.body?.txnid ||
      req.body?.txnId ||
      undefined,
    userId: req.user?._id?.toString?.() || req.user?.id || undefined,
  };
}

module.exports = {
  storage,
  runWithContext,
  getContext,
  setContext,
  generateRequestId,
  extractCorrelationFromRequest,
};
