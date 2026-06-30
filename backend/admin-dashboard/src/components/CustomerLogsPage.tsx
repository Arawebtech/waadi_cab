

"use client";

import { useEffect, useState } from "react";
import AdminAPI from "../services/api";

interface JourneyEvent {
  event: string;
  eventKey: string;
  date: string | null;
  timestamp: string;
  ip: string;
  device: string;
  data: Record<string, any>;
}

interface CustomerInfo {
  userId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  userType?: string;
  isActive?: boolean;
  isVerified?: boolean;
  platform?: string;
  appVersion?: string;
  createdAt?: string;
  lastLogin?: string;
}

interface CustomerLog {
  _id?: string;
  customer: CustomerInfo;
  totalEvents: number;
  latestActivity: string | null;
  journey: JourneyEvent[];
}

export default function CustomerLogsPage() {
  const [logs, setLogs] = useState<CustomerLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CustomerLog | null>(null);
  const [activeTab, setActiveTab] = useState<"journey" | "raw">("journey");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [userId, setUserId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

const fetchLogs = async () => {
  try {
    setLoading(true);

    const data = await AdminAPI.getCustomerLogs({
      phoneNumber: phoneNumber || undefined,
      userId: userId || undefined,
    });

    if (data?.data) {
      setLogs(Array.isArray(data.data) ? data.data : [data.data]);
    } else {
      setLogs([]);
    }

  } catch (error) {
    console.error(error);
    setLogs([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchLogs();
  }, []);

  // added by rabil 

  const downloadSingle = (phone: string) => {

    // alert(process.env.NEXT_PUBLIC_API_URL)
    // alert(process.env.REACT_APP_BASE_URL)
    window.open(
      `${process.env.REACT_APP_BASE_URL}/api/v1/admin/customer-logs?phoneNumber=${phone}&download=true`,
      "_blank"
    );
  };

  const downloadAll = () => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/customer-logs?download=true`,
      "_blank"
    );
  };

  const downloadPdfReport = async (params: {
    bookingId?: string;
    transactionId?: string;
    userId?: string;
  }) => {
    if (!params.bookingId && !params.transactionId && !params.userId) {
      alert("Provide a Booking ID, Transaction ID, or User ID to generate the PDF report.");
      return;
    }

    try {
      setDownloadingPdf(true);
      const blob = await AdminAPI.downloadJourneyReportPdf(params);
      const ref = params.bookingId || params.transactionId || params.userId || "report";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WadiCab_Journey_Report_${ref}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to generate PDF report. Ensure audit trail data exists for this ID.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const totalEvents = logs.reduce((sum, log) => sum + (log.totalEvents || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 p-6">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customer Journey Logs</h1>
          <p className="mt-1 text-sm text-slate-500">Search, View & Download Customer Activity</p>
        </div>

        <button
          onClick={downloadAll}
          className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white transition hover:bg-green-700"
        >
          Download All Journeys
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Total Customers</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{logs.length}</h2>
        </div>

        <div className="rounded-2xl bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Total Events</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{totalEvents}</h2>
        </div>

        <div className="rounded-2xl bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Search By Phone</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Active</h2>
        </div>

        <div className="rounded-2xl bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Journey Export</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Enabled</h2>
        </div>
      </div>

      {/* PDF Report Export */}
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-emerald-900">PayU Compliance PDF Report</h2>
        <p className="mt-1 text-sm text-emerald-800">
          Generate a client-ready PDF with the complete customer journey from live audit logs (Booking ID, Transaction ID, or User ID).
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <input
            type="text"
            placeholder="Booking ID (e.g. WC...)"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="rounded-xl border border-emerald-300 px-4 py-3 outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Transaction ID (PayU order)"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="rounded-xl border border-emerald-300 px-4 py-3 outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="User ID (optional override)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-xl border border-emerald-300 px-4 py-3 outline-none focus:border-emerald-500"
          />
          <button
            onClick={() =>
              downloadPdfReport({
                bookingId: bookingId.trim() || undefined,
                transactionId: transactionId.trim() || undefined,
                userId: userId.trim() || undefined,
              })
            }
            disabled={downloadingPdf || (!bookingId.trim() && !transactionId.trim() && !userId.trim())}
            className="md:col-span-2 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {downloadingPdf ? "Generating PDF…" : "Download PDF Report"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow">
        <div className="grid gap-4 md:grid-cols-4">
          <input
            type="text"
            placeholder="Search Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />

          <input
            type="text"
            placeholder="Search User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />

          <button
            onClick={fetchLogs}
            className="rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
          >
            Search
          </button>

          <button
            onClick={() => {
              setPhoneNumber("");
              setUserId("");
              fetchLogs();
            }}
            className="rounded-xl bg-slate-800 px-4 py-3 text-white hover:bg-slate-900"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-4 text-left">#</th>
                <th className="px-4 py-4 text-left">Phone Number</th>
                <th className="px-4 py-4 text-left">Full Name</th>
                <th className="px-4 py-4 text-left">User ID</th>
                <th className="px-4 py-4 text-left">Total Events</th>
                <th className="px-4 py-4 text-left">Latest Activity</th>
                <th className="px-4 py-4 text-left">Last Login</th>
                <th className="px-4 py-4 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr className="bg-slate-900 text-white">
                  <td colSpan={8} className="p-8 text-center">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center bg-slate-900 text-white">
                    No Logs Found
                  </td>
                </tr>
              ) : (
                logs.map((item, index) => (
                  <tr key={item.customer.userId || item.customer.phoneNumber} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-4">{index + 1}</td>

                    <td className="px-4 py-4 font-medium">
                      {item.customer.phoneNumber || "-"}
                    </td>

                    <td className="px-4 py-4">
                      {item.customer.fullName || "-"}
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-500">
                      {item.customer.userId || "-"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                        {item.totalEvents}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {item.latestActivity || "-"}
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {item.customer.lastLogin || "-"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedLog(item);
                            setActiveTab("journey");
                          }}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                        >
                          View
                        </button>

                        <button
                          onClick={() => downloadSingle(item.customer.phoneNumber)}
                          className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                        >
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold">Customer Journey</h2>
                <p className="text-sm text-slate-500">
                  {selectedLog.customer.phoneNumber}
                  {selectedLog.customer.fullName && (
                    <span className="ml-2 text-slate-400">· {selectedLog.customer.fullName}</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  {selectedLog.totalEvents} events
                </span>
                {selectedLog.customer.userId && (
                  <button
                    onClick={() =>
                      downloadPdfReport({ userId: selectedLog.customer.userId })
                    }
                    disabled={downloadingPdf}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {downloadingPdf ? "PDF…" : "Download PDF Report"}
                  </button>
                )}
                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Customer Info Bar */}
            <div className="border-b bg-slate-50 px-5 py-3 flex flex-wrap gap-4 text-sm text-slate-600">
              {selectedLog.customer.userId && (
                <span><span className="font-medium">ID:</span> {selectedLog.customer.userId}</span>
              )}
              {selectedLog.customer.platform && (
                <span><span className="font-medium">Platform:</span> {selectedLog.customer.platform}</span>
              )}
              {selectedLog.customer.appVersion && (
                <span><span className="font-medium">App:</span> {selectedLog.customer.appVersion}</span>
              )}
              {selectedLog.customer.isActive !== undefined && (
                <span>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${selectedLog.customer.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {selectedLog.customer.isActive ? "Active" : "Inactive"}
                  </span>
                </span>
              )}
              {selectedLog.customer.isVerified !== undefined && (
                <span>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${selectedLog.customer.isVerified ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {selectedLog.customer.isVerified ? "Verified" : "Unverified"}
                  </span>
                </span>
              )}
              {selectedLog.latestActivity && (
                <span><span className="font-medium">Latest:</span> {selectedLog.latestActivity}</span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b px-5">
              <button
                onClick={() => setActiveTab("journey")}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition ${activeTab === "journey" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                Journey Timeline
              </button>
              <button
                onClick={() => setActiveTab("raw")}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition ${activeTab === "raw" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                Raw JSON
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-auto flex-1 p-5">

              {activeTab === "journey" ? (
                <div className="space-y-3">
                  {selectedLog.journey.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No journey events found.</p>
                  ) : (
                    selectedLog.journey.map((event, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800">{event.event}</p>
                              <p className="text-xs text-slate-400">{event.date || "-"}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 text-xs text-slate-500 ml-11 md:ml-0">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">IP:</span> {event.ip}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Device:</span> {event.device}
                            </span>
                          </div>
                        </div>

                        {event.data && Object.keys(event.data).length > 0 && (
                          <div className="mt-3 ml-11">
                            <pre className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-green-400">
                              {JSON.stringify(event.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <pre className="overflow-auto rounded-xl bg-slate-950 p-5 text-sm text-green-400">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
