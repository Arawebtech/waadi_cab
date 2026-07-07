/**
 * Frontend structured JSON logger with correlation IDs.
 * Logs to console; batches to backend on native / production.
 */

import { Capacitor } from '@capacitor/core'
import { base_url } from '../environment'
import { tokenManager } from './api'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  requestId?: string
  bookingId?: string
  transactionId?: string
  userId?: string
  platform?: string
  sourceFile?: string
  sourceFunction?: string
  journeyEventType?: string
  data?: Record<string, unknown>
}

const REQUEST_ID_KEY = 'wadi_request_id'
const BOOKING_ID_KEY = 'wadi_booking_id'
const TXN_ID_KEY = 'wadi_transaction_id'

const logQueue: LogEntry[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function getOrCreateRequestId(): string {
  if (typeof window === 'undefined') return `srv_${Date.now()}`
  let id = sessionStorage.getItem(REQUEST_ID_KEY)
  if (!id) {
    id = crypto.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(REQUEST_ID_KEY, id)
  }
  return id
}

export function setCorrelationIds(ids: {
  requestId?: string
  bookingId?: string
  transactionId?: string
}) {
  if (typeof window === 'undefined') return
  if (ids.requestId) sessionStorage.setItem(REQUEST_ID_KEY, ids.requestId)
  if (ids.bookingId) sessionStorage.setItem(BOOKING_ID_KEY, ids.bookingId)
  if (ids.transactionId) sessionStorage.setItem(TXN_ID_KEY, ids.transactionId)
}

export function getCorrelationIds() {
  if (typeof window === 'undefined') {
    return { requestId: undefined, bookingId: undefined, transactionId: undefined }
  }
  return {
    requestId: sessionStorage.getItem(REQUEST_ID_KEY) || undefined,
    bookingId: sessionStorage.getItem(BOOKING_ID_KEY) || undefined,
    transactionId: sessionStorage.getItem(TXN_ID_KEY) || undefined,
  }
}

function maskClientData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return data
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    const lower = key.toLowerCase()
    if (lower.includes('token') || lower.includes('password') || lower === 'hash' || lower.includes('secret')) {
      out[key] = '[REDACTED]'
    } else {
      out[key] = value
    }
  }
  return out
}

function write(level: LogLevel, category: string, message: string, meta: Partial<LogEntry> = {}) {
  const correlation = getCorrelationIds()
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    requestId: meta.requestId || correlation.requestId || getOrCreateRequestId(),
    bookingId: meta.bookingId || correlation.bookingId,
    transactionId: meta.transactionId || correlation.transactionId,
    userId: meta.userId || tokenManager.getUserData()?._id,
    platform: Capacitor.getPlatform(),
    sourceFile: meta.sourceFile,
    sourceFunction: meta.sourceFunction,
    journeyEventType: meta.journeyEventType,
    data: maskClientData(meta.data),
  }

  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)

  logQueue.push(entry)
  scheduleFlush()
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flushLogs, 5000)
}

async function flushLogs() {
  flushTimer = null
  if (logQueue.length === 0) return

  const batch = logQueue.splice(0, 20)
  const token = tokenManager.getAccessToken()
  if (!token) return

  try {
    await fetch(`${base_url}/logs/client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Request-ID': getOrCreateRequestId(),
        ...(Capacitor.isNativePlatform() ? { 'X-Platform': 'app' } : {}),
      },
      body: JSON.stringify({ logs: batch.map(({ journeyEventType, ...rest }) => ({ ...rest, journeyEventType })) }),
    })
  } catch {
    // Re-queue on network failure
    logQueue.unshift(...batch)
  }
}

export const appLogger = {
  debug: (category: string, message: string, meta?: Partial<LogEntry>) =>
    write('debug', category, message, meta),
  info: (category: string, message: string, meta?: Partial<LogEntry>) =>
    write('info', category, message, meta),
  warn: (category: string, message: string, meta?: Partial<LogEntry>) =>
    write('warn', category, message, meta),
  error: (category: string, message: string, meta?: Partial<LogEntry>) =>
    write('error', category, message, meta),

  booking: (message: string, meta?: Partial<LogEntry>) =>
    write('info', 'booking', message, meta),
  payment: (message: string, meta?: Partial<LogEntry>) =>
    write('info', 'payment', message, meta),
  mobile: (message: string, meta?: Partial<LogEntry>) =>
    write('info', 'mobile', message, meta),
  api: (message: string, meta?: Partial<LogEntry>) =>
    write('info', 'api', message, meta),
  network: (message: string, meta?: Partial<LogEntry>) =>
    write('warn', 'network', message, meta),

  setCorrelationIds,
  getCorrelationIds,
  flush: flushLogs,
}

export default appLogger
