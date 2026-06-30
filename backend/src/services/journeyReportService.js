/**
 * Aggregates real audit, system, and customer logs for compliance PDF reports.
 * Groups by module/source (max 10) with complete untruncated record details.
 */
const Booking = require('../models/Booking');
const SystemLog = require('../models/SystemLog');
const CustomerLog = require('../models/CustomerLog');
const {
  getAuditTrailByBookingId,
  getAuditTrailByTransactionId,
  getAuditTrailByUserId,
} = require('../utils/auditTrail');

const MAX_MODULES = 10;

/** Maps customer-log keys and system messages to canonical journey event types for dedup. */
const CUSTOMER_EVENT_TO_CANONICAL = {
  login: 'USER_LOGIN',
  logout: 'USER_LOGOUT',
  lastBooking: 'BOOKING_CREATED',
  paymentSuccessBooking: 'PAYMENT_SUCCESS',
  CashfreeVerify: 'PAYMENT_VERIFIED',
};

const SYSTEM_MESSAGE_TO_CANONICAL = [
  { pattern: /payu.*success.*callback|callback.*success.*payu/i, canonical: 'PAYMENT_SUCCESS' },
  { pattern: /payu.*failure.*callback|callback.*failure.*payu/i, canonical: 'PAYMENT_FAILED' },
  { pattern: /payu.*callback/i, canonical: 'PAYU_CALLBACK_RECEIVED' },
  { pattern: /hash verification/i, canonical: 'PAYU_HASH_VERIFICATION' },
  { pattern: /hash generated/i, canonical: 'PAYU_HASH_GENERATED' },
  { pattern: /redirect to payu/i, canonical: 'PAYMENT_REDIRECT_PAYU' },
  { pattern: /^payment success$/i, canonical: 'PAYMENT_SUCCESS' },
  { pattern: /^payment failed$/i, canonical: 'PAYMENT_FAILED' },
  { pattern: /payment initiated/i, canonical: 'PAYMENT_INITIATED' },
  { pattern: /payment pending/i, canonical: 'PAYMENT_PENDING' },
  { pattern: /booking created/i, canonical: 'BOOKING_CREATED' },
];

const APP_NAME = process.env.APP_NAME || 'Wadi Cab';
const APP_FULL_NAME =
  process.env.APP_FULL_NAME || 'Wadi Cab — Border Tax Booking System';

const EVENT_LABELS = {
  USER_LOGIN: 'User Logged In',
  USER_LOGOUT: 'User Logged Out',
  PRODUCT_SELECTED: 'Vehicle / Product Selected',
  VALIDATION_SUCCESS: 'Booking Validation Passed',
  VALIDATION_FAILED: 'Booking Validation Failed',
  BOOKING_CREATED: 'Booking Created',
  BOOKING_UPDATED: 'Booking Updated',
  BOOKING_COMPLETED: 'Booking Completed',
  BOOKING_CANCELLED: 'Booking Cancelled',
  BOOKING_CONFIRMED: 'Booking Confirmed',
  CHECKOUT_OPENED: 'Checkout Opened',
  CHECKOUT_SUBMITTED: 'Checkout Submitted',
  CHECKOUT_PAY_CLICKED: 'Pay Button Clicked',
  PAYMENT_INITIATED: 'Payment Initiated',
  PAYMENT_REDIRECT_PAYU: 'Redirected to PayU',
  PAYMENT_SUCCESS: 'Payment Success',
  PAYMENT_FAILED: 'Payment Failure',
  PAYMENT_PENDING: 'Payment Pending',
  PAYMENT_VERIFIED: 'Payment Verified',
  PAYMENT_DUPLICATE_DETECTED: 'Duplicate Payment Detected',
  PAYMENT_RECONCILIATION: 'Payment Reconciliation',
};

function formatLabel(eventType) {
  if (!eventType) return 'Log Event';
  return EVENT_LABELS[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCustomerEventKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/** Serialize any value for PDF — preserves full structure, no truncation. */
function serializeValue(value) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value._bsontype === 'ObjectId') return String(value);
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '__v') continue;
      out[k] = serializeValue(v);
    }
    return out;
  }
  return value;
}

/** Build a complete flat+nested details object from a raw DB document. */
function documentToDetails(doc, extra = {}) {
  const serialized = serializeValue(doc);
  if (!serialized || typeof serialized !== 'object') return { ...extra, value: serialized };
  const { _id, ...rest } = serialized;
  return { recordId: _id != null ? String(_id) : undefined, ...extra, ...rest };
}

function normalizeId(value) {
  if (value == null || value === '' || value === '—') return '';
  return String(value).trim();
}

function mapSystemMessageToCanonical(message) {
  const msg = message || '';
  for (const { pattern, canonical } of SYSTEM_MESSAGE_TO_CANONICAL) {
    if (pattern.test(msg)) return canonical;
  }
  return `SYSTEM:${msg}`;
}

function getCanonicalEventType(record) {
  const d = record.details || {};

  if (d.eventType) return String(d.eventType).toUpperCase();

  if (d.eventKey && CUSTOMER_EVENT_TO_CANONICAL[d.eventKey]) {
    return CUSTOMER_EVENT_TO_CANONICAL[d.eventKey];
  }

  if (d.eventKey) return String(d.eventKey).toUpperCase();

  if (d.logType === 'system' && d.message) {
    return mapSystemMessageToCanonical(d.message);
  }

  if (d.eventName) {
    return String(d.eventName).replace(/\s+/g, '_').toUpperCase();
  }

  return String(record.title || 'UNKNOWN_EVENT').replace(/\s+/g, '_').toUpperCase();
}

/** Unique key for the same journey step across frontend/backend/system/customer sources. */
function getJourneyDedupKey(record) {
  const d = record.details || {};
  const canonical = getCanonicalEventType(record);
  const bookingId = normalizeId(d.bookingId);
  const transactionId = normalizeId(d.transactionId);
  const userId = normalizeId(d.userId || d.customerUserId);

  return [canonical, bookingId, transactionId, userId].join('|');
}

function recordRichnessScore(record) {
  const d = record.details || {};
  let score = JSON.stringify(d).length;

  if (d.logType === 'audit') score += 5000;
  else if (record.module?.includes('Customer Journey')) score += 3000;
  else if (d.logType === 'system') score += 1000;

  if (record.module?.includes('Backend')) score += 500;
  if (d.metadata && Object.keys(d.metadata).length > 0) score += 200;
  if (d.ip) score += 50;
  if (d.userAgent || d.device) score += 50;

  return score;
}

function mergeRecordDetails(winner, other) {
  const mergedSources = [
    ...(winner.details._mergedSources || [winner.module]),
    other.module,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const mergedIds = [
    ...(winner.details._deduplicatedRecordIds || []),
    other.id,
  ].filter(Boolean);

  return {
    ...winner,
    details: {
      ...other.details,
      ...winner.details,
      _mergedSources: mergedSources,
      _deduplicatedRecordIds: mergedIds,
      _deduplicationNote:
        `Merged ${mergedIds.length} duplicate representation(s) of the same journey event ` +
        `(${getCanonicalEventType(winner)}). Full payload preserved from primary source.`,
    },
  };
}

/**
 * Collapse cross-source duplicates (e.g. frontend + backend USER_LOGIN, audit + system payment success).
 * Keeps the richest record and notes merged duplicate IDs in details.
 */
function deduplicateJourneyRecords(records) {
  const groups = new Map();

  for (const record of records) {
    const key = getJourneyDedupKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const unique = [];
  let duplicatesRemoved = 0;

  for (const group of groups.values()) {
    if (group.length === 1) {
      unique.push(group[0]);
      continue;
    }

    const sorted = [...group].sort((a, b) => recordRichnessScore(b) - recordRichnessScore(a));
    let winner = sorted[0];
    let earliestTs = new Date(winner.timestamp).getTime() || Date.now();

    for (let i = 1; i < sorted.length; i += 1) {
      const ts = new Date(sorted[i].timestamp).getTime();
      if (!Number.isNaN(ts)) earliestTs = Math.min(earliestTs, ts);
      winner = mergeRecordDetails(winner, sorted[i]);
      duplicatesRemoved += 1;
    }

    winner.timestamp = new Date(earliestTs);
    unique.push(winner);
  }

  return { records: unique, duplicatesRemoved, rawCount: records.length };
}

function sourceOrderPriority(record) {
  const d = record.details || {};
  if (d.logType === 'audit') return 0;
  if (record.module?.includes('Customer Journey')) return 1;
  if (d.logType === 'booking_record') return 2;
  return 3;
}

/** Sort earliest → latest; stable tie-breaker by source priority then record id. */
function sortChronologically(records) {
  return [...records].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    if (ta !== tb) return ta - tb;

    const pa = sourceOrderPriority(a);
    const pb = sourceOrderPriority(b);
    if (pa !== pb) return pa - pb;

    return String(a.id).localeCompare(String(b.id));
  });
}

function mergeUniqueById(primary, secondary) {
  const seen = new Set(primary.map((e) => String(e._id)));
  const merged = [...primary];
  for (const item of secondary) {
    const id = String(item._id);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(item);
    }
  }
  return merged;
}

async function resolveBooking({ bookingId, transactionId, userId }) {
  const populateOpts = [
    { path: 'user', select: 'firstName lastName phoneNumber email createdAt' },
    { path: 'visiting_state', select: 'name code' },
  ];

  if (bookingId) {
    return Booking.findOne({ bookingId }).populate(populateOpts).lean();
  }

  if (transactionId) {
    const byTxn = await Booking.findOne({
      $or: [
        { 'payment_details.transaction_id': transactionId },
        { payment_id: transactionId },
      ],
    })
      .populate(populateOpts)
      .lean();
    if (byTxn) return byTxn;
  }

  if (userId) {
    return Booking.findOne({ user: userId }).sort({ createdAt: -1 }).populate(populateOpts).lean();
  }

  return null;
}

async function fetchAuditEvents({ bookingId, transactionId, userId, booking }) {
  const resolvedBookingId = booking?.bookingId || bookingId;
  const resolvedTxnId = booking?.payment_details?.transaction_id || transactionId;

  let events = [];

  if (resolvedBookingId) {
    events = await getAuditTrailByBookingId(resolvedBookingId, 500);
  } else if (transactionId) {
    events = await getAuditTrailByTransactionId(transactionId, 500);
  } else if (userId) {
    events = await getAuditTrailByUserId(userId, 500);
  }

  if (resolvedBookingId && transactionId) {
    const byTxn = await getAuditTrailByTransactionId(transactionId, 500);
    events = mergeUniqueById(events, byTxn);
  }

  if (userId) {
    const byUser = await getAuditTrailByUserId(userId, 500);
    events = mergeUniqueById(events, byUser);
  }

  return { events, resolvedBookingId, resolvedTxnId };
}

async function fetchSystemLogs({ resolvedBookingId, resolvedTxnId, userId }) {
  const orClauses = [];
  if (resolvedBookingId) orClauses.push({ bookingId: resolvedBookingId });
  if (resolvedTxnId) orClauses.push({ transactionId: resolvedTxnId });
  if (userId) orClauses.push({ userId: String(userId) });

  if (orClauses.length === 0) return [];

  return SystemLog.find({ $or: orClauses }).sort({ createdAt: 1 }).limit(500).lean();
}

async function fetchCustomerLogRecords(userId, phoneNumber) {
  if (!userId && !phoneNumber) return [];

  const query = {};
  if (userId) query.userId = userId;
  else query.phoneNumber = phoneNumber;

  const customer = await CustomerLog.findOne(query).lean();
  if (!customer?.logs || typeof customer.logs !== 'object') return [];

  return Object.entries(customer.logs).map(([eventKey, eventData]) => ({
    id: `customer-log-${eventKey}`,
    module: 'Customer Journey Log',
    timestamp: eventData?.createdAt || customer.updatedAt,
    title: formatCustomerEventKey(eventKey),
    details: documentToDetails(eventData || {}, {
      eventKey,
      eventName: formatCustomerEventKey(eventKey),
      customerPhoneNumber: customer.phoneNumber,
      customerUserId: customer.userId ? String(customer.userId) : undefined,
    }),
  }));
}

function auditEventToRecord(event) {
  const source = event.source || 'backend';
  return {
    id: String(event._id),
    module: `Audit Trail — ${source.charAt(0).toUpperCase()}${source.slice(1)}`,
    timestamp: event.createdAt,
    title: formatLabel(event.eventType),
    details: documentToDetails(event, {
      eventLabel: formatLabel(event.eventType),
      logType: 'audit',
    }),
  };
}

function systemLogToRecord(log) {
  const category = log.category || 'general';
  const msg = log.message || '';
  const isPayU = /payu|callback|mihpayid/i.test(msg);
  const moduleName = isPayU
    ? 'System Log — PayU / Payment'
    : `System Log — ${category.charAt(0).toUpperCase()}${category.slice(1)}`;

  return {
    id: String(log._id),
    module: moduleName,
    timestamp: log.createdAt,
    title: msg || `System log (${category})`,
    details: documentToDetails(log, {
      logType: 'system',
      message: log.message,
    }),
  };
}

function bookingReceiptRecord(booking) {
  if (!booking?.tax_slip_pdf?.uploaded_at) return null;
  return {
    id: `receipt-${booking._id}`,
    module: 'Booking Records — Tax Slip',
    timestamp: booking.tax_slip_pdf.uploaded_at,
    title: 'Receipt / Tax Slip Generated',
    details: documentToDetails({
      bookingId: booking.bookingId,
      transactionId: booking.payment_details?.transaction_id,
      tax_slip_pdf: booking.tax_slip_pdf,
      uploaded_at: booking.tax_slip_pdf.uploaded_at,
      logType: 'booking_record',
    }),
  };
}

function moduleRelevanceScore(moduleName, records) {
  let score = records.length;
  const name = moduleName.toLowerCase();
  if (name.includes('audit trail')) score += 200;
  if (name.includes('payu') || name.includes('payment')) score += 180;
  if (name.includes('customer journey')) score += 160;
  if (name.includes('booking')) score += 140;
  if (name.includes('frontend')) score += 120;
  return score;
}

/**
 * Group all records by module, keep max 10 modules by relevance.
 * Within each included module, return ALL records sorted chronologically.
 */
function buildModuleGroups(allRecords) {
  const byModule = new Map();

  for (const record of allRecords) {
    const key = record.module;
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key).push(record);
  }

  const moduleEntries = Array.from(byModule.entries()).map(([name, records]) => {
    const sorted = [...records].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return {
      name,
      records: sorted,
      relevance: moduleRelevanceScore(name, sorted),
    };
  });

  moduleEntries.sort((a, b) => b.relevance - a.relevance);

  const included = moduleEntries.slice(0, MAX_MODULES);
  const omitted = moduleEntries.slice(MAX_MODULES);

  return {
    modules: included.map(({ name, records }) => ({ name, records, recordCount: records.length })),
    modulesIncluded: included.length,
    modulesOmitted: omitted.length,
    omittedModuleNames: omitted.map((m) => m.name),
    totalRecords: allRecords.length,
    includedRecords: included.reduce((sum, m) => sum + m.records.length, 0),
  };
}

function buildSummary(booking, moduleData, query, dedupMeta = {}) {
  const user = booking?.user;
  const paymentStatus =
    booking?.payment_status ||
    (booking?.status === 'paid' ? 'paid' : booking?.status === 'cancelled' ? 'failed' : 'pending');

  return {
    appName: APP_NAME,
    appFullName: APP_FULL_NAME,
    generatedAt: new Date(),
    query,
    bookingId: booking?.bookingId || query.bookingId || '—',
    transactionId:
      booking?.payment_details?.transaction_id || query.transactionId || '—',
    payuTransactionId: booking?.payment_details?.payment_reference || '—',
    paymentReference: booking?.payment_details?.payment_reference || '—',
    user: {
      id: user?._id?.toString() || query.userId || '—',
      name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—',
      phone: user?.phoneNumber || booking?.whatsapp_number || '—',
      email: user?.email || '—',
    },
    vehicle: {
      number: booking?.vehicle_number || '—',
      type: booking?.seat_capacity || '—',
      whatsapp: booking?.whatsapp_number || '—',
      entryBorder: booking?.entry_border || '—',
    },
    booking: {
      visitingState: booking?.visiting_state?.name || '—',
      taxMode: booking?.tax_mode || '—',
      fromDate: booking?.tax_from_date,
      uptoDate: booking?.tax_upto_date,
      createdAt: booking?.createdAt,
      gateway: booking?.payment_details?.payment_method || '—',
    },
    payment: {
      amount: booking?.amount != null ? `₹${booking.amount}` : '—',
      status: paymentStatus,
      paidAt: booking?.payment_details?.paid_at,
    },
    bookingStatus: booking?.status || '—',
    totalEvents: dedupMeta.uniqueCount ?? moduleData.includedRecords,
    rawLogCount: dedupMeta.rawCount ?? moduleData.totalRecords,
    duplicatesRemoved: dedupMeta.duplicatesRemoved ?? 0,
    totalModules: moduleData.modulesIncluded,
    modulesOmitted: moduleData.modulesOmitted,
    omittedModuleNames: moduleData.omittedModuleNames,
  };
}

async function gatherJourneyReportData({ bookingId, transactionId, userId }) {
  const query = {
    bookingId: bookingId || undefined,
    transactionId: transactionId || undefined,
    userId: userId || undefined,
  };

  let booking = await resolveBooking({ bookingId, transactionId, userId });

  const { events, resolvedBookingId, resolvedTxnId } = await fetchAuditEvents({
    bookingId,
    transactionId,
    userId,
    booking,
  });

  if (!booking && resolvedBookingId) {
    booking = await resolveBooking({ bookingId: resolvedBookingId });
  }

  const resolvedUserId = userId || booking?.user?._id?.toString();
  const resolvedPhone = booking?.user?.phoneNumber || booking?.whatsapp_number;

  const systemLogs = await fetchSystemLogs({
    resolvedBookingId: booking?.bookingId || resolvedBookingId,
    resolvedTxnId: booking?.payment_details?.transaction_id || resolvedTxnId,
    userId: resolvedUserId,
  });

  const customerRecords = await fetchCustomerLogRecords(resolvedUserId, resolvedPhone);

  const allRecords = [
    ...events.map(auditEventToRecord),
    ...systemLogs.map(systemLogToRecord),
    ...customerRecords,
  ];

  const receipt = bookingReceiptRecord(booking);
  if (receipt) allRecords.push(receipt);

  const { records: dedupedRecords, duplicatesRemoved, rawCount } =
    deduplicateJourneyRecords(allRecords);

  const chronologicalTimeline = sortChronologically(dedupedRecords).map((r, index) => ({
    step: index + 1,
    id: r.id,
    module: r.module,
    timestamp: r.timestamp,
    title: r.title,
    canonicalEventType: getCanonicalEventType(r),
    eventName: r.title,
    source: r.module,
    status: r.details?.newState || r.details?.level || r.details?.status || '—',
    bookingId: r.details?.bookingId || booking?.bookingId || '—',
    transactionId: r.details?.transactionId || booking?.payment_details?.transaction_id || '—',
    details: r.details,
  }));

  const moduleData = buildModuleGroups(dedupedRecords);
  const summary = buildSummary(booking, moduleData, query, {
    duplicatesRemoved,
    rawCount,
    uniqueCount: dedupedRecords.length,
  });

  return {
    summary,
    booking,
    modules: moduleData.modules,
    chronologicalTimeline,
    moduleMeta: {
      included: moduleData.modulesIncluded,
      omitted: moduleData.modulesOmitted,
      omittedNames: moduleData.omittedModuleNames,
      totalRecords: rawCount,
      includedRecords: dedupedRecords.length,
      duplicatesRemoved,
    },
    timeline: chronologicalTimeline,
    auditCount: events.length,
    systemLogCount: systemLogs.length,
    customerLogCount: customerRecords.length,
  };
}

module.exports = {
  gatherJourneyReportData,
  formatLabel,
  serializeValue,
  documentToDetails,
  deduplicateJourneyRecords,
  sortChronologically,
  getCanonicalEventType,
  getJourneyDedupKey,
  APP_NAME,
  APP_FULL_NAME,
  MAX_MODULES,
};
