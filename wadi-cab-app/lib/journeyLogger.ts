/**
 * Customer journey audit logger — persists real user-action events to backend AuditLog.
 */
import appLogger, { getCorrelationIds, setCorrelationIds } from './logger'
import type { LogEntry } from './logger'

export const JourneyEvent = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PRODUCT_SELECTED: 'PRODUCT_SELECTED',
  VALIDATION_SUCCESS: 'VALIDATION_SUCCESS',
  BOOKING_CREATED: 'BOOKING_CREATED',
  CHECKOUT_OPENED: 'CHECKOUT_OPENED',
  CHECKOUT_SUBMITTED: 'CHECKOUT_SUBMITTED',
  CHECKOUT_PAY_CLICKED: 'CHECKOUT_PAY_CLICKED',
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_REDIRECT_PAYU: 'PAYMENT_REDIRECT_PAYU',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_COMPLETED: 'BOOKING_COMPLETED',
} as const

export type JourneyEventType = (typeof JourneyEvent)[keyof typeof JourneyEvent]

interface JourneyMeta {
  sourceFile?: string
  sourceFunction?: string
  bookingId?: string
  transactionId?: string
  userId?: string
  data?: Record<string, unknown>
}

function emit(eventType: JourneyEventType, message: string, meta: JourneyMeta = {}) {
  if (meta.bookingId || meta.transactionId) {
    setCorrelationIds({
      bookingId: meta.bookingId,
      transactionId: meta.transactionId,
    })
  }

  appLogger.info('journey', message, {
    sourceFile: meta.sourceFile,
    sourceFunction: meta.sourceFunction,
    bookingId: meta.bookingId || getCorrelationIds().bookingId,
    transactionId: meta.transactionId || getCorrelationIds().transactionId,
    userId: meta.userId,
    data: meta.data,
    journeyEventType: eventType,
  } as Partial<LogEntry> & { journeyEventType?: string })

  void appLogger.flush()
}

export const journeyLogger = {
  userLogin: (meta?: JourneyMeta) =>
    emit(JourneyEvent.USER_LOGIN, 'User logged in', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'userLogin',
      ...meta,
    }),

  userLogout: (meta?: JourneyMeta) =>
    emit(JourneyEvent.USER_LOGOUT, 'User logged out', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'userLogout',
      ...meta,
    }),

  productSelected: (meta?: JourneyMeta) =>
    emit(JourneyEvent.PRODUCT_SELECTED, 'Booking product selected', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'productSelected',
      ...meta,
    }),

  checkoutSubmitted: (meta?: JourneyMeta) =>
    emit(JourneyEvent.CHECKOUT_SUBMITTED, 'Checkout form submitted', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'checkoutSubmitted',
      ...meta,
    }),

  checkoutOpened: (meta?: JourneyMeta) =>
    emit(JourneyEvent.CHECKOUT_OPENED, 'Checkout page opened', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'checkoutOpened',
      ...meta,
    }),

  checkoutPayClicked: (meta?: JourneyMeta) =>
    emit(JourneyEvent.CHECKOUT_PAY_CLICKED, 'Pay button clicked on checkout', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'checkoutPayClicked',
      ...meta,
    }),

  paymentRedirectPayU: (meta?: JourneyMeta) =>
    emit(JourneyEvent.PAYMENT_REDIRECT_PAYU, 'Redirecting to PayU', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'paymentRedirectPayU',
      ...meta,
    }),

  paymentSuccess: (meta?: JourneyMeta) =>
    emit(JourneyEvent.PAYMENT_SUCCESS, 'Payment success page viewed', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'paymentSuccess',
      ...meta,
    }),

  paymentFailure: (meta?: JourneyMeta) =>
    emit(JourneyEvent.PAYMENT_FAILED, 'Payment failure page viewed', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'paymentFailure',
      ...meta,
    }),

  paymentPending: (meta?: JourneyMeta) =>
    emit(JourneyEvent.PAYMENT_PENDING, 'Payment pending page viewed', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'paymentPending',
      ...meta,
    }),

  bookingConfirmed: (meta?: JourneyMeta) =>
    emit(JourneyEvent.BOOKING_CONFIRMED, 'Booking confirmed', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'bookingConfirmed',
      ...meta,
    }),

  bookingCompleted: (meta?: JourneyMeta) =>
    emit(JourneyEvent.BOOKING_COMPLETED, 'Booking completed', {
      sourceFile: 'journeyLogger.ts',
      sourceFunction: 'bookingCompleted',
      ...meta,
    }),
}

export default journeyLogger
