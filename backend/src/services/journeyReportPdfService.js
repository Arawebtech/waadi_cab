/**
 * Generates a professional PayU compliance PDF with complete, untruncated log details.
 */
const PDFDocument = require('pdfkit');
const { serializeValue } = require('./journeyReportService');

const COLORS = {
  primary: '#0f172a',
  accent: '#2563eb',
  text: '#1e293b',
  muted: '#64748b',
  border: '#cbd5e1',
  success: '#15803d',
  warning: '#b45309',
  danger: '#b91c1c',
  white: '#ffffff',
  rowAlt: '#f8fafc',
  moduleHeader: '#1e40af',
  detailsBg: '#f1f5f9',
};

function formatTs(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatDateOnly(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function statusColor(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('success') || s.includes('paid') || s.includes('confirmed') || s.includes('completed')) {
    return COLORS.success;
  }
  if (s.includes('fail') || s.includes('cancel') || s.includes('error')) return COLORS.danger;
  if (s.includes('pending') || s.includes('warn')) return COLORS.warning;
  return COLORS.text;
}

/** Full JSON representation — no field omission or truncation. */
function detailsToFullText(details) {
  try {
    return JSON.stringify(serializeValue(details), null, 2);
  } catch {
    return String(details);
  }
}

function drawPageFooter(doc, pageNum) {
  const bottom = doc.page.height - 40;
  doc
    .moveTo(50, bottom - 8)
    .lineTo(doc.page.width - 50, bottom - 8)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.muted)
    .text(
      'CONFIDENTIAL — Generated from live application logs. For PayU Compliance / Risk review only.',
      50,
      bottom,
      { align: 'center', width: doc.page.width - 100, lineBreak: false }
    );

  doc.text(`Page ${pageNum}`, doc.page.width - 90, bottom, { width: 40, align: 'right', lineBreak: false });
}

function ensureSpace(doc, needed, pageNumRef) {
  if (doc.y + needed > doc.page.height - 55) {
    drawPageFooter(doc, pageNumRef.value);
    doc.addPage({ margin: 50 });
    pageNumRef.value += 1;
    doc.y = 50;
  }
}

/**
 * Draw multi-line / long JSON text with pdfkit auto-wrap and page breaks.
 */
function drawWrappedText(doc, text, x, startY, width, options, pageNumRef) {
  const lineGap = options.lineGap ?? 2;
  const fontSize = options.fontSize ?? 7;
  const font = options.font ?? 'Courier';
  const color = options.color ?? COLORS.text;

  ensureSpace(doc, 24, pageNumRef);

  doc.font(font).fontSize(fontSize).fillColor(color);

  doc.text(String(text), x, startY, {
    width,
    lineGap,
    align: 'left',
  });

  doc.moveDown(0.2);
}

function drawSummarySection(doc, summary, pageNumRef) {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary).text('Transaction Summary', 50, doc.y);
  doc.moveDown(0.5);

  const rows = [
    ['Application', summary.appFullName],
    ['Report Generated', formatTs(summary.generatedAt)],
    ['Booking ID', summary.bookingId],
    ['Transaction ID (PayU Order)', summary.transactionId],
    ['PayU Payment ID (mihpayid)', summary.payuTransactionId],
    ['Customer Name', summary.user.name],
    ['Customer Phone', summary.user.phone],
    ['Customer Email', summary.user.email],
    ['User ID', summary.user.id],
    ['Vehicle Number', summary.vehicle.number],
    ['Vehicle Type / Capacity', summary.vehicle.type],
    ['WhatsApp Number', summary.vehicle.whatsapp],
    ['Entry Border', summary.vehicle.entryBorder],
    ['Visiting State', summary.booking.visitingState],
    ['Tax Plan / Mode', summary.booking.taxMode],
    ['Tax Valid From', formatDateOnly(summary.booking.fromDate)],
    ['Tax Valid Until', formatDateOnly(summary.booking.uptoDate)],
    ['Booking Created', formatTs(summary.booking.createdAt)],
    ['Payment Gateway', summary.booking.gateway],
    ['Payment Amount', summary.payment.amount],
    ['Payment Status', summary.payment.status],
    ['Payment Completed At', formatTs(summary.payment.paidAt)],
    ['Booking Status', summary.bookingStatus],
    ['Unique Journey Events', String(summary.totalEvents || 0)],
    ['Raw Log Records Fetched', String(summary.rawLogCount || summary.totalEvents || 0)],
    ['Duplicate Entries Removed', String(summary.duplicatesRemoved || 0)],
    ['Log Modules Represented', String(summary.totalModules || 0)],
  ];

  if (summary.modulesOmitted > 0) {
    rows.push([
      'Modules Omitted (>10 limit)',
      `${summary.modulesOmitted}: ${(summary.omittedModuleNames || []).join(', ')}`,
    ]);
  }

  const labelX = 50;
  const valueX = 210;
  const contentWidth = doc.page.width - 100;

  for (let i = 0; i < rows.length; i += 1) {
    const [label, value] = rows[i];
    doc.font('Helvetica').fontSize(9);
    const valueHeight = doc.heightOfString(String(value || '—'), { width: contentWidth - valueX + 50 });
    const rowHeight = Math.max(18, valueHeight + 4);

    ensureSpace(doc, rowHeight + 2, pageNumRef);
    const y = doc.y;

    if (i % 2 === 0) {
      doc.rect(50, y - 1, contentWidth, rowHeight).fill(COLORS.rowAlt);
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted).text(label, labelX, y + 2, { width: 155 });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text).text(String(value || '—'), valueX, y + 2, {
      width: contentWidth - valueX + 50,
    });

    doc.y = y + rowHeight;
  }

  doc.moveDown(0.8);
}

function drawLogRecord(doc, record, stepNumber, pageNumRef) {
  const contentWidth = doc.page.width - 100;
  const padding = 10;
  const innerWidth = contentWidth - padding * 2;
  const x = 50 + padding;

  const status =
    record.details?.newState ||
    record.details?.status ||
    record.details?.level ||
    record.details?.payment_status ||
    '—';

  const canonical = record.canonicalEventType || record.details?.eventType || '—';
  const headerLine = `Step ${stepNumber}: ${record.title || record.eventName || 'Log Entry'}`;
  const metaLine = `Source: ${record.module || record.source || '—'}    |    Event: ${canonical}`;
  const idLine = `Record ID: ${record.id || '—'}`;
  const detailsText = detailsToFullText(record.details || {});

  ensureSpace(doc, 50, pageNumRef);

  const boxY = doc.y;

  doc.font('Helvetica-Bold').fontSize(9);
  const hHeader = doc.heightOfString(headerLine, { width: innerWidth });
  doc.font('Helvetica').fontSize(8);
  const hMeta = doc.heightOfString(metaLine, { width: innerWidth });
  doc.font('Helvetica').fontSize(7);
  const hId = doc.heightOfString(idLine, { width: innerWidth });
  const hTs = doc.heightOfString(`Timestamp (IST): ${formatTs(record.timestamp)}`, { width: innerWidth });

  const headerBlockHeight = padding * 2 + hHeader + hMeta + hTs + hId + 8;

  doc
    .roundedRect(50, boxY, contentWidth, headerBlockHeight, 3)
    .lineWidth(0.5)
    .fillAndStroke(stepNumber % 2 === 0 ? COLORS.rowAlt : COLORS.white, COLORS.border);

  let textY = boxY + padding;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary).text(headerLine, x, textY, { width: innerWidth });
  textY += hHeader + 3;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(metaLine, x, textY, { width: innerWidth });
  textY += hMeta + 2;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
  doc.text(`Timestamp (IST): ${formatTs(record.timestamp)}    |    Status: `, x, textY, { continued: true, width: innerWidth });
  doc.fillColor(statusColor(status)).text(String(status), { continued: false });
  textY += hTs + 2;

  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7).text(idLine, x, textY, { width: innerWidth });

  doc.y = boxY + headerBlockHeight + 6;

  ensureSpace(doc, 16, pageNumRef);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.accent).text('Complete Log Details:', 50, doc.y);
  doc.moveDown(0.3);

  drawWrappedText(
    doc,
    detailsText,
    58,
    doc.y,
    contentWidth - 16,
    { font: 'Courier', fontSize: 6.5, color: COLORS.text, lineGap: 1.5 },
    pageNumRef
  );

  doc.moveDown(0.3);
  doc
    .moveTo(50, doc.y)
    .lineTo(50 + contentWidth, doc.y)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.7);
}

function drawChronologicalTimeline(doc, reportData, pageNumRef) {
  const { chronologicalTimeline, timeline, moduleMeta, summary } = reportData;
  const records = chronologicalTimeline || timeline || [];

  ensureSpace(doc, 60, pageNumRef);

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(COLORS.primary)
    .text('Chronological Journey Timeline', 50, doc.y);

  doc.moveDown(0.3);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      `Events are sorted from earliest to latest by actual timestamp (IST). ` +
        `${summary?.duplicatesRemoved ? `${summary.duplicatesRemoved} duplicate entries were merged; ` : ''}` +
        `${records.length} unique journey step(s) shown with complete log payloads.`,
      50,
      doc.y,
      { width: doc.page.width - 100 }
    );

  doc.moveDown(0.8);

  if (records.length === 0) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.muted)
      .text('No log records found in the database for the provided search criteria.', 50, doc.y);
    return;
  }

  records.forEach((record, idx) => {
    const stepNumber = record.step ?? idx + 1;
    drawLogRecord(doc, record, stepNumber, pageNumRef);
  });

  if (moduleMeta?.omitted > 0) {
    ensureSpace(doc, 40, pageNumRef);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.warning)
      .text(
        `Note: ${moduleMeta.omitted} log module(s) excluded from the 10-module limit: ` +
          `${(moduleMeta.omittedNames || []).join(', ')}.`,
        50,
        doc.y,
        { width: doc.page.width - 100 }
      );
  }
}

function drawLogsSection(doc, reportData, pageNumRef) {
  drawChronologicalTimeline(doc, reportData, pageNumRef);
}

function generateJourneyReportPdf(reportData) {
  const { summary, modules } = reportData;
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: false,
    info: {
      Title: `Customer Journey Report — ${summary.bookingId}`,
      Author: summary.appName,
      Subject: 'PayU Compliance Journey Audit Report',
      Creator: summary.appFullName,
    },
  });

  const pageNumRef = { value: 1 };

  doc.rect(0, 0, doc.page.width, 110).fill(COLORS.primary);

  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.white).text(summary.appName, 50, 32);
  doc.font('Helvetica').fontSize(11).fillColor('#94a3b8').text('Customer Journey Audit Report', 50, 60);
  doc.fontSize(9).fillColor('#cbd5e1').text('Prepared for PayU Compliance & Risk Review', 50, 78);
  doc.fontSize(8).text(`Generated: ${formatTs(summary.generatedAt)} (IST)`, 50, 92);

  doc.y = 130;

  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(COLORS.accent)
    .text('Official Transaction Evidence Report', 50, doc.y, { align: 'center', width: doc.page.width - 100 });

  doc.moveDown(1);

  drawSummarySection(doc, summary, pageNumRef);
  drawLogsSection(doc, reportData, pageNumRef);

  ensureSpace(doc, 50, pageNumRef);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary).text('Certification', 50, doc.y);
  doc.moveDown(0.3);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.text)
    .text(
      `This report was automatically generated by ${summary.appFullName} using live stored log records ` +
        `(${summary.totalEvents} unique events; ${summary.rawLogCount || summary.totalEvents} raw records fetched` +
        `${summary.duplicatesRemoved ? `; ${summary.duplicatesRemoved} duplicates merged` : ''}). ` +
        'Events appear in strict chronological order. All timestamps are IST. Complete payloads are included.',
      50,
      doc.y,
      { width: doc.page.width - 100, align: 'justify' }
    );

  drawPageFooter(doc, pageNumRef.value);

  return doc;
}

module.exports = { generateJourneyReportPdf, formatTs, detailsToFullText };
