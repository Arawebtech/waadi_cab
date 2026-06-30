const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');
const SystemLog = require('../models/SystemLog');
const {
  getAuditTrailByBookingId,
  getAuditTrailByTransactionId,
  getAuditTrailByRequestId,
  getAuditTrailByUserId,
} = require('../utils/auditTrail');
const { recordClientJourneyEvent } = require('../utils/bookingLifecycleLogger');
const { maskSensitive } = require('../utils/maskSensitive');
const { AUDIT_EVENT_TYPES } = require('../models/AuditLog');
const { gatherJourneyReportData } = require('../services/journeyReportService');
const { generateJourneyReportPdf } = require('../services/journeyReportPdfService');

class LogController {
  /**
   * POST /api/v1/logs/client — ingest structured logs from Capacitor / web app.
   * Journey events (journeyEventType) are persisted to AuditLog for full timeline.
   */
  async ingestClientLogs(req, res) {
    try {
      const { logs } = req.body;
      if (!Array.isArray(logs) || logs.length === 0) {
        return res.status(400).json({ success: false, message: 'logs array is required' });
      }

      const userId = req.user?._id?.toString();
      let journeyPersisted = 0;

      for (const entry of logs.slice(0, 50)) {
        logger.mobile(entry.message || 'Client log', {
          source: 'frontend',
          sourceFile: entry.sourceFile,
          sourceFunction: entry.sourceFunction,
          level: entry.level || 'info',
          category: entry.category || 'mobile',
          requestId: entry.requestId || req.requestId,
          bookingId: entry.bookingId,
          transactionId: entry.transactionId,
          userId: entry.userId || userId,
          platform: entry.platform,
          journeyEventType: entry.journeyEventType,
          data: maskSensitive(entry.data),
        });

        const eventType = entry.journeyEventType;
        if (eventType && AUDIT_EVENT_TYPES.includes(eventType)) {
          recordClientJourneyEvent({
            eventType,
            userId: entry.userId || userId,
            bookingId: entry.bookingId,
            transactionId: entry.transactionId,
            requestId: entry.requestId || req.requestId,
            metadata: {
              message: entry.message,
              platform: entry.platform,
              data: entry.data,
              sourceFile: entry.sourceFile,
              sourceFunction: entry.sourceFunction,
            },
            sourceFile: entry.sourceFile,
            sourceFunction: entry.sourceFunction,
            req,
          });
          journeyPersisted += 1;
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Logs ingested',
        count: logs.length,
        journeyPersisted,
      });
    } catch (error) {
      logger.error('mobile', 'Client log ingestion failed', {
        sourceFile: 'logController.js',
        sourceFunction: 'ingestClientLogs',
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ success: false, message: 'Failed to ingest logs' });
    }
  }

  /**
   * GET /api/v1/admin/audit-trail — query audit events by bookingId, txnId, requestId, or userId.
   */
  async getAuditTrail(req, res) {
    try {
      const { bookingId, transactionId, requestId, userId, limit = 100 } = req.query;

      if (!bookingId && !transactionId && !requestId && !userId) {
        return res.status(400).json({
          success: false,
          message: 'Provide bookingId, transactionId, requestId, or userId',
        });
      }

      let events = [];
      const lim = Number(limit);

      if (bookingId) {
        events = await getAuditTrailByBookingId(bookingId, lim);
      } else if (transactionId) {
        events = await getAuditTrailByTransactionId(transactionId, lim);
      } else if (requestId) {
        events = await getAuditTrailByRequestId(requestId, lim);
      } else {
        events = await getAuditTrailByUserId(userId, lim);
      }

      events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return res.status(200).json({ success: true, data: { events, count: events.length } });
    } catch (error) {
      logger.error('audit', 'Audit trail query failed', {
        sourceFile: 'logController.js',
        sourceFunction: 'getAuditTrail',
        error: error.message,
      });
      return res.status(500).json({ success: false, message: 'Failed to fetch audit trail' });
    }
  }

  /**
   * GET /api/v1/admin/system-logs — query persisted system logs.
   */
  async getSystemLogs(req, res) {
    try {
      const { bookingId, transactionId, requestId, category, level, limit = 100 } = req.query;
      const filter = {};

      if (bookingId) filter.bookingId = bookingId;
      if (transactionId) filter.transactionId = transactionId;
      if (requestId) filter.requestId = requestId;
      if (category) filter.category = category;
      if (level) filter.level = level;

      const logs = await SystemLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(Math.min(Number(limit) || 100, 500))
        .lean();

      return res.status(200).json({ success: true, data: { logs, count: logs.length } });
    } catch (error) {
      logger.error('api', 'System log query failed', {
        sourceFile: 'logController.js',
        sourceFunction: 'getSystemLogs',
        error: error.message,
      });
      return res.status(500).json({ success: false, message: 'Failed to fetch system logs' });
    }
  }

  /**
   * GET /api/v1/admin/audit-trail/report — downloadable PDF journey report for PayU compliance.
   * Query: bookingId | transactionId | userId (at least one required)
   */
  async downloadJourneyReportPdf(req, res) {
    try {
      const { bookingId, transactionId, userId } = req.query;

      if (!bookingId && !transactionId && !userId) {
        return res.status(400).json({
          success: false,
          message: 'Provide bookingId, transactionId, or userId to generate the report',
        });
      }

      const reportData = await gatherJourneyReportData({ bookingId, transactionId, userId });

      if (!reportData.timeline.length && !reportData.booking) {
        return res.status(404).json({
          success: false,
          message: 'No journey data found for the provided search criteria',
        });
      }

      const ref =
        reportData.summary.bookingId !== '—'
          ? reportData.summary.bookingId
          : transactionId || userId || 'report';

      const filename = `WadiCab_Journey_Report_${ref}_${Date.now()}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const doc = generateJourneyReportPdf(reportData);
      doc.pipe(res);
      doc.end();

      logger.info('audit', 'Journey report PDF generated', {
        sourceFile: 'logController.js',
        sourceFunction: 'downloadJourneyReportPdf',
        bookingId: reportData.summary.bookingId,
        transactionId: reportData.summary.transactionId,
        eventCount: reportData.timeline.length,
      });
    } catch (error) {
      logger.error('audit', 'Journey report PDF generation failed', {
        sourceFile: 'logController.js',
        sourceFunction: 'downloadJourneyReportPdf',
        error: error.message,
        stack: error.stack,
      });
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: 'Failed to generate journey report PDF' });
      }
    }
  }
}

module.exports = new LogController();
