"use client";

import { useState } from "react";
import AdminAPI from "../services/api";

export interface AuditEvent {
  _id: string;
  eventType: string;
  requestId?: string;
  bookingId?: string;
  bookingObjectId?: string;
  userId?: string;
  transactionId?: string;
  previousState?: string;
  newState?: string;
  gateway?: string;
  source?: string;
  sourceFile?: string;
  sourceFunction?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SystemLogEntry {
  _id: string;
  level: string;
  category: string;
  message: string;
  requestId?: string;
  bookingId?: string;
  transactionId?: string;
  userId?: string;
  data?: Record<string, unknown>;
  source?: string;
  sourceFile?: string;
  sourceFunction?: string;
  createdAt: string;
}

type SearchMode = "bookingId" | "transactionId" | "requestId" | "userId";
type ActiveTab = "audit" | "system";

const EVENT_COLORS: Record<string, string> = {
  USER_LOGIN: "bg-violet-100 text-violet-800",
  USER_LOGOUT: "bg-violet-100 text-violet-700",
  PRODUCT_SELECTED: "bg-sky-100 text-sky-800",
  CHECKOUT_OPENED: "bg-cyan-100 text-cyan-800",
  CHECKOUT_SUBMITTED: "bg-cyan-100 text-cyan-900",
  CHECKOUT_PAY_CLICKED: "bg-blue-100 text-blue-800",
  PAYMENT_REDIRECT_PAYU: "bg-amber-100 text-amber-900",
  BOOKING_CONFIRMED: "bg-emerald-100 text-emerald-900",
  BOOKING_CREATED: "bg-emerald-100 text-emerald-800",
  BOOKING_UPDATED: "bg-blue-100 text-blue-800",
  BOOKING_COMPLETED: "bg-green-100 text-green-800",
  BOOKING_CANCELLED: "bg-orange-100 text-orange-800",
  BOOKING_APPROVED: "bg-teal-100 text-teal-800",
  BOOKING_REJECTED: "bg-red-100 text-red-800",
  PAYMENT_INITIATED: "bg-indigo-100 text-indigo-800",
  PAYMENT_SUCCESS: "bg-green-100 text-green-800",
  PAYMENT_FAILED: "bg-red-100 text-red-800",
  PAYMENT_PENDING: "bg-yellow-100 text-yellow-800",
  PAYMENT_VERIFIED: "bg-cyan-100 text-cyan-800",
  PAYMENT_DUPLICATE_DETECTED: "bg-rose-100 text-rose-800",
  PAYMENT_RECONCILIATION: "bg-purple-100 text-purple-800",
  VALIDATION_SUCCESS: "bg-slate-100 text-slate-800",
  VALIDATION_FAILED: "bg-red-100 text-red-800",
};

function formatEventLabel(type: string) {
  return type.replace(/_/g, " ");
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getEventColor(type: string) {
  return EVENT_COLORS[type] || "bg-slate-100 text-slate-700";
}

function getLevelColor(level: string) {
  if (level === "error") return "bg-red-100 text-red-700";
  if (level === "warn") return "bg-yellow-100 text-yellow-800";
  if (level === "debug") return "bg-slate-100 text-slate-600";
  return "bg-blue-100 text-blue-700";
}

export default function AuditTrailPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("audit");
  const [searchMode, setSearchMode] = useState<SearchMode>("bookingId");
  const [searchValue, setSearchValue] = useState("");
  const [limit, setLimit] = useState(100);

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | SystemLogEntry | null>(null);
  const [detailTab, setDetailTab] = useState<"summary" | "raw">("summary");
  const [lastQuery, setLastQuery] = useState<string>("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const trimmedLabel = (params: Record<string, string | number> | null) => {
    if (!params) return "all recent";
    return Object.entries(params)
      .filter(([k]) => k !== "limit")
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "all recent";
  };

  const buildParams = () => {
    const trimmed = searchValue.trim();
    const params: Record<string, string | number> = { limit };

    if (activeTab === "audit") {
      if (!trimmed) return null;
      params[searchMode] = trimmed;
    } else {
      if (trimmed) params[searchMode] = trimmed;
    }

    return params;
  };

  const fetchData = async () => {
    const params = buildParams();
    if (activeTab === "audit" && !params) {
      setError("Enter a Booking ID, Transaction ID, Request ID, or User ID to search audit trail.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (activeTab === "audit") {
        const data = await AdminAPI.getAuditTrail(params!);
        const events = data?.data?.events || [];
        setAuditEvents(Array.isArray(events) ? events : []);
        setLastQuery(`${searchMode}=${searchValue.trim()}`);
      } else {
        const data = await AdminAPI.getSystemLogs(params || { limit });
        const logs = data?.data?.logs || [];
        setSystemLogs(Array.isArray(logs) ? logs : []);
        setLastQuery(trimmedLabel(params));
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to fetch logs. Please try again.";
      setError(message);
      setAuditEvents([]);
      setSystemLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdfReport = async () => {
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setError("Enter a Booking ID, Transaction ID, or User ID before downloading the PDF report.");
      return;
    }

    if (searchMode === "requestId") {
      setError("PDF reports require Booking ID, Transaction ID, or User ID. Request ID is not supported for PDF export.");
      return;
    }

    try {
      setDownloadingPdf(true);
      setError(null);

      const params: Record<string, string> = {};
      params[searchMode] = trimmed;

      const blob = await AdminAPI.downloadJourneyReportPdf(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WadiCab_Journey_Report_${trimmed}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to generate PDF report. Ensure audit data exists for this ID.";
      setError(message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const resetSearch = () => {
    setSearchValue("");
    setError(null);
    setAuditEvents([]);
    setSystemLogs([]);
    setLastQuery("");
  };

  const sortedAuditEvents = [...auditEvents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Audit Trail</h1>
          <p className="mt-1 text-sm text-slate-500">
            Trace booking & payment lifecycle — booking creation → payment → status updates
          </p>
        </div>

        {activeTab === "audit" && searchValue.trim() && searchMode !== "requestId" && (
          <button
            onClick={downloadPdfReport}
            disabled={downloadingPdf}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {downloadingPdf ? "Generating PDF…" : "Download PDF Report"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-2xl bg-white p-2 shadow">
        <button
          onClick={() => {
            setActiveTab("audit");
            resetSearch();
          }}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
            activeTab === "audit"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Booking Audit Trail
        </button>
        <button
          onClick={() => {
            setActiveTab("system");
            resetSearch();
          }}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
            activeTab === "system"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          System Logs
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Active View</p>
          <h2 className="mt-2 text-lg font-bold text-white capitalize">{activeTab}</h2>
        </div>
        <div className="rounded-2xl bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Results</p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {activeTab === "audit" ? auditEvents.length : systemLogs.length}
          </h2>
        </div>
        <div className="rounded-2xl bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Search By</p>
          <h2 className="mt-2 text-lg font-semibold text-white capitalize">{searchMode}</h2>
        </div>
        <div className="rounded-2xl bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Limit</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{limit}</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow">
        <div className="grid gap-4 md:grid-cols-7">
          <select
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value as SearchMode)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="bookingId">Booking ID</option>
            <option value="transactionId">Transaction ID</option>
            <option value="requestId">Request ID</option>
            <option value="userId">User ID</option>
          </select>

          <input
            type="text"
            placeholder={
              searchMode === "bookingId"
                ? "e.g. WADI-2024-001"
                : searchMode === "transactionId"
                  ? "e.g. ORDER_..."
                  : searchMode === "userId"
                    ? "MongoDB user _id"
                    : "UUID request ID"
            }
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
            className="md:col-span-2 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value={50}>50 results</option>
            <option value={100}>100 results</option>
            <option value={200}>200 results</option>
            <option value={500}>500 results</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search"}
          </button>

          {activeTab === "audit" && searchMode !== "requestId" && (
            <button
              onClick={downloadPdfReport}
              disabled={downloadingPdf || !searchValue.trim()}
              className="rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              title="Download PayU compliance PDF report"
            >
              {downloadingPdf ? "PDF…" : "Download PDF"}
            </button>
          )}

          <button
            onClick={resetSearch}
            className="rounded-xl bg-slate-800 px-4 py-3 font-medium text-white hover:bg-slate-900"
          >
            Reset
          </button>
        </div>

        {activeTab === "audit" && (
          <p className="mt-3 text-xs text-slate-500">
            Required: provide at least one of Booking ID, Transaction ID, Request ID, or User ID.
          </p>
        )}
        {activeTab === "system" && (
          <p className="mt-3 text-xs text-slate-500">
            Optional filters — leave empty and click Search to load recent system logs.
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {lastQuery && !error && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Showing results for: <span className="font-mono font-medium">{lastQuery}</span>
          </div>
        )}
      </div>

      {/* Audit Trail Timeline */}
      {activeTab === "audit" && (
        <div className="rounded-2xl bg-white shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading audit trail…</div>
          ) : sortedAuditEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No audit events found. Search by Booking ID or Transaction ID to trace a journey.
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {sortedAuditEvents.map((event, idx) => (
                <div
                  key={event._id}
                  className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-blue-300 transition cursor-pointer"
                  onClick={() => {
                    setSelectedEvent(event);
                    setDetailTab("summary");
                  }}
                >
                  {idx < sortedAuditEvents.length - 1 && (
                    <div className="absolute left-8 top-full h-4 w-0.5 bg-slate-300" />
                  )}

                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEventColor(event.eventType)}`}
                          >
                            {formatEventLabel(event.eventType)}
                          </span>
                          {event.gateway && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600 uppercase">
                              {event.gateway}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(event.createdAt)}</p>
                        {(event.previousState || event.newState) && (
                          <p className="mt-2 text-sm text-slate-700">
                            <span className="font-medium">{event.previousState || "—"}</span>
                            <span className="mx-2 text-slate-400">→</span>
                            <span className="font-medium">{event.newState || "—"}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="ml-13 md:ml-0 flex flex-wrap gap-3 text-xs text-slate-500 md:text-right">
                      {event.bookingId && (
                        <span>
                          <span className="font-medium">Booking:</span> {event.bookingId}
                        </span>
                      )}
                      {event.transactionId && (
                        <span className="font-mono">
                          <span className="font-medium font-sans">Txn:</span>{" "}
                          {event.transactionId.length > 24
                            ? `${event.transactionId.slice(0, 24)}…`
                            : event.transactionId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Logs Table */}
      {activeTab === "system" && (
        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-4 text-left">Time</th>
                  <th className="px-4 py-4 text-left">Level</th>
                  <th className="px-4 py-4 text-left">Category</th>
                  <th className="px-4 py-4 text-left">Message</th>
                  <th className="px-4 py-4 text-left">Booking ID</th>
                  <th className="px-4 py-4 text-left">Transaction ID</th>
                  <th className="px-4 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading system logs…
                    </td>
                  </tr>
                ) : systemLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No system logs found.
                    </td>
                  </tr>
                ) : (
                  systemLogs.map((log) => (
                    <tr key={log._id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${getLevelColor(log.level)}`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{log.category}</td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">{log.message}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs">
                        {log.bookingId || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-xs max-w-[140px] truncate">
                        {log.transactionId || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedEvent(log);
                            setDetailTab("summary");
                          }}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {"eventType" in selectedEvent
                    ? formatEventLabel(selectedEvent.eventType)
                    : "System Log Detail"}
                </h2>
                <p className="text-sm text-slate-500">{formatDate(selectedEvent.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Close
              </button>
            </div>

            <div className="flex border-b px-5">
              <button
                onClick={() => setDetailTab("summary")}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                  detailTab === "summary"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500"
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setDetailTab("raw")}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                  detailTab === "raw"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500"
                }`}
              >
                Raw JSON
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {detailTab === "summary" ? (
                <div className="grid gap-3 text-sm">
                  {"eventType" in selectedEvent ? (
                    <>
                      <Row label="Event Type" value={selectedEvent.eventType} />
                      <Row label="Booking ID" value={selectedEvent.bookingId} mono />
                      <Row label="Transaction ID" value={selectedEvent.transactionId} mono />
                      <Row label="Request ID" value={selectedEvent.requestId} mono />
                      <Row label="User ID" value={selectedEvent.userId} mono />
                      <Row label="Previous State" value={selectedEvent.previousState} />
                      <Row label="New State" value={selectedEvent.newState} />
                      <Row label="Gateway" value={selectedEvent.gateway} />
                      <Row label="Source" value={selectedEvent.source} />
                      <Row label="Source File" value={selectedEvent.sourceFile} mono />
                      <Row label="IP" value={selectedEvent.ip} />
                      {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                        <div>
                          <p className="mb-2 font-medium text-slate-700">Metadata</p>
                          <pre className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-green-400">
                            {JSON.stringify(selectedEvent.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Row label="Level" value={selectedEvent.level} />
                      <Row label="Category" value={selectedEvent.category} />
                      <Row label="Message" value={selectedEvent.message} />
                      <Row label="Booking ID" value={selectedEvent.bookingId} mono />
                      <Row label="Transaction ID" value={selectedEvent.transactionId} mono />
                      <Row label="Request ID" value={selectedEvent.requestId} mono />
                      <Row label="Source File" value={selectedEvent.sourceFile} mono />
                      {selectedEvent.data && Object.keys(selectedEvent.data).length > 0 && (
                        <div>
                          <p className="mb-2 font-medium text-slate-700">Data</p>
                          <pre className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-green-400">
                            {JSON.stringify(selectedEvent.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <pre className="overflow-auto rounded-xl bg-slate-950 p-5 text-sm text-green-400">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-36 shrink-0 font-medium text-slate-500">{label}</span>
      <span className={`text-slate-800 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
