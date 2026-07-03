/**
 * Generates a professional PayU compliance PDF with complete, untruncated log details.
 * Uses manual line-by-line rendering to prevent PDFKit auto-overflow blank pages.
 */
const PDFDocument = require('pdfkit');
const { serializeValue } = require('./journeyReportService');

const PAGE_MARGIN_TOP = 50;
const PAGE_MARGIN_BOTTOM = 55;

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

function detailsToFullText(details) {
  try {
    return JSON.stringify(serializeValue(details), null, 2);
  } catch {
    return String(details);
  }
}

function getContentBottom(doc) {
  return doc.page.height - PAGE_MARGIN_BOTTOM;
}

function syncDocY(doc, y) {
  doc.y = y;
  return y;
}

function drawPageFooter(doc, pageNum) {
  const savedY = doc.y;
  const savedBottomMargin = doc.page.margins.bottom;

  // Footer sits in the bottom margin band — temporarily lift maxY so PDFKit won't auto addPage.
  doc.page.margins.bottom = 0;

  const footerY = doc.page.height - 38;
  const ruleY = footerY - 8;

  doc
    .moveTo(50, ruleY)
    .lineTo(doc.page.width - 50, ruleY)
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
      footerY,
      { align: 'center', width: doc.page.width - 100, lineBreak: false }
    );

  doc.text(`Page ${pageNum}`, doc.page.width - 90, footerY, {
    width: 40,
    align: 'right',
    lineBreak: false,
  });

  doc.page.margins.bottom = savedBottomMargin;
  syncDocY(doc, savedY);
}

/** Add a new page only when the current Y cannot fit `needed` pixels of content. */
function startNewPage(doc, pageNumRef) {
  drawPageFooter(doc, pageNumRef.value);
  doc.addPage({ margin: PAGE_MARGIN_TOP });
  pageNumRef.value += 1;
  return syncDocY(doc, PAGE_MARGIN_TOP);
}

/**
 * Ensure `y + needed` fits on the current page; return the Y to use (may be on a new page).
 * Never calls addPage unless content truly will not fit.
 */
function ensureY(doc, y, needed, pageNumRef) {
  const safeNeeded = Math.max(needed, 1);
  if (y + safeNeeded <= getContentBottom(doc)) {
    return syncDocY(doc, y);
  }
  startNewPage(doc, pageNumRef);
  return PAGE_MARGIN_TOP;
}

function normalizeCursorY(doc, y, pageNumRef) {
  const bottom = getContentBottom(doc);
  if (y > bottom - 8 || y < PAGE_MARGIN_TOP) {
    return ensureY(doc, PAGE_MARGIN_TOP, 1, pageNumRef);
  }
  return syncDocY(doc, y);
}

function ensureSpace(doc, needed, pageNumRef) {
  let y = normalizeCursorY(doc, doc.y, pageNumRef);
  y = ensureY(doc, y, needed, pageNumRef);
  syncDocY(doc, y);
}

/**
 * Split text into visual lines that fit within `width` (respects existing newlines in JSON).
 */
function splitIntoWrappedLines(doc, text, width) {
  const lines = [];
  const paragraphs = String(text).split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (let i = 0; i < paragraph.length; i += 1) {
      const candidate = current + paragraph[i];
      if (doc.widthOfString(candidate) <= width || current.length === 0) {
        current = candidate;
      } else {
        lines.push(current);
        current = paragraph[i];
      }
    }
    if (current.length > 0) {
      lines.push(current);
    }
  }

  return lines;
}

function measureLineHeight(doc, lineGap) {
  return doc.currentLineHeight(false) + (lineGap ?? 0);
}

/**
 * Render pre-wrapped or single-line text at absolute coordinates without PDFKit auto page breaks.
 */
function drawAbsoluteText(doc, text, x, y, options = {}) {
  doc.text(String(text), x, y, { lineBreak: false, ...options });
  return y + measureLineHeight(doc, options.lineGap);
}

/**
 * Render text manually line-by-line with explicit page breaks.
 * Never uses PDFKit automatic overflow (no doc.text large block with flow).
 */
function drawWrappedText(doc, text, x, startY, width, options, pageNumRef) {
  const lineGap = options.lineGap ?? 2;
  const fontSize = options.fontSize ?? 7;
  const font = options.font ?? 'Courier';
  const color = options.color ?? COLORS.text;

  doc.font(font).fontSize(fontSize).fillColor(color);

  const lines = splitIntoWrappedLines(doc, text, width);
  const lineStep = doc.currentLineHeight(false) + lineGap;
  let y = startY;

  for (const line of lines) {
    y = ensureY(doc, y, lineStep, pageNumRef);
    // Lines are pre-wrapped — do not pass width (avoids PDFKit re-flow pushing doc.y to page bottom).
    doc.text(line.length > 0 ? line : ' ', x, y, { lineBreak: false });
    y += lineStep;
  }

  return syncDocY(doc, y);
}

function drawSummarySection(doc, summary, pageNumRef) {
  ensureSpace(doc, 20, pageNumRef);
  const titleY = doc.y;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary);
  drawAbsoluteText(doc, 'Transaction Summary', 50, titleY);
  syncDocY(doc, titleY + 18);

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
    const valueText = String(value || '—');
    const valueLines = splitIntoWrappedLines(doc, valueText, contentWidth - valueX + 50);
    const valueLineStep = measureLineHeight(doc, 1);
    const valueHeight = valueLines.length * valueLineStep;
    const rowHeight = Math.max(18, valueHeight + 4);

    ensureSpace(doc, rowHeight + 2, pageNumRef);
    const y = doc.y;

    if (i % 2 === 0) {
      doc.rect(50, y - 1, contentWidth, rowHeight).fill(COLORS.rowAlt);
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted);
    drawAbsoluteText(doc, label, labelX, y + 2, { width: 155 });

    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
    let valueY = y + 2;
    for (const valueLine of valueLines) {
      drawAbsoluteText(doc, valueLine, valueX, valueY);
      valueY += valueLineStep;
    }

    syncDocY(doc, y + rowHeight);
  }

  syncDocY(doc, doc.y + 6);
}

function drawLogRecord(doc, record, stepNumber, pageNumRef) {
  const contentWidth = doc.page.width - 100;
  const padding = 10;
  const innerWidth = contentWidth - padding * 2;
  const x = 50 + padding;
  const detailsWidth = contentWidth - 16;
  const detailsX = 58;

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
  const tsLine = `Timestamp (IST): ${formatTs(record.timestamp)}    |    Status: ${status}`;
  const detailsText = detailsToFullText(record.details || {});

  doc.font('Helvetica-Bold').fontSize(9);
  const hHeader = doc.heightOfString(headerLine, { width: innerWidth });
  doc.font('Helvetica').fontSize(8);
  const hMeta = doc.heightOfString(metaLine, { width: innerWidth });
  doc.font('Helvetica').fontSize(8);
  const hTs = doc.heightOfString(tsLine, { width: innerWidth });
  doc.font('Helvetica').fontSize(7);
  const hId = doc.heightOfString(idLine, { width: innerWidth });

  const headerBlockHeight = padding * 2 + hHeader + hMeta + hTs + hId + 8;

  doc.font('Helvetica-Bold').fontSize(8);
  const detailsLabelHeight = doc.heightOfString('Complete Log Details:', { width: contentWidth });

  const detailLineGap = 1.5;
  const separatorHeight = 8;

  let y = normalizeCursorY(doc, doc.y, pageNumRef);
  y = ensureY(doc, y, headerBlockHeight + 6, pageNumRef);

  const boxY = y;

  doc
    .roundedRect(50, boxY, contentWidth, headerBlockHeight, 3)
    .lineWidth(0.5)
    .fillAndStroke(stepNumber % 2 === 0 ? COLORS.rowAlt : COLORS.white, COLORS.border);

  let textY = boxY + padding;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary);
  drawAbsoluteText(doc, headerLine, x, textY, { width: innerWidth });
  textY += hHeader + 3;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
  drawAbsoluteText(doc, metaLine, x, textY, { width: innerWidth });
  textY += hMeta + 2;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
  drawAbsoluteText(doc, tsLine, x, textY, { width: innerWidth });
  textY += hTs + 2;

  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7);
  drawAbsoluteText(doc, idLine, x, textY, { width: innerWidth });

  y = boxY + headerBlockHeight + 6;
  syncDocY(doc, y);

  y = ensureY(doc, y, detailsLabelHeight + 4, pageNumRef);

  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.accent);
  drawAbsoluteText(doc, 'Complete Log Details:', 50, y);
  y += detailsLabelHeight + 4;

  y = drawWrappedText(
    doc,
    detailsText,
    detailsX,
    y,
    detailsWidth,
    { font: 'Courier', fontSize: 6.5, color: COLORS.text, lineGap: detailLineGap },
    pageNumRef
  );

  y = ensureY(doc, y, separatorHeight, pageNumRef);
  doc
    .moveTo(50, y)
    .lineTo(50 + contentWidth, y)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  syncDocY(doc, y + separatorHeight);
}

function drawChronologicalTimeline(doc, reportData, pageNumRef) {
  const { chronologicalTimeline, timeline, moduleMeta, summary } = reportData;
  const records = chronologicalTimeline || timeline || [];

  ensureSpace(doc, 60, pageNumRef);

  const sectionTitleY = doc.y;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary);
  drawAbsoluteText(doc, 'Chronological Journey Timeline', 50, sectionTitleY);
  syncDocY(doc, sectionTitleY + 18);

  const introText =
    `Events are sorted from earliest to latest by actual timestamp (IST). ` +
    `${summary?.duplicatesRemoved ? `${summary.duplicatesRemoved} duplicate entries were merged; ` : ''}` +
    `${records.length} unique journey step(s) shown with complete log payloads.`;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
  const introWidth = doc.page.width - 100;
  syncDocY(
    doc,
    drawWrappedText(doc, introText, 50, doc.y, introWidth, { font: 'Helvetica', fontSize: 8, color: COLORS.muted, lineGap: 1 }, pageNumRef) + 4
  );

  if (records.length === 0) {
    ensureSpace(doc, 14, pageNumRef);
    const emptyY = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted);
    drawAbsoluteText(doc, 'No log records found in the database for the provided search criteria.', 50, emptyY);
    syncDocY(doc, emptyY + 14);
    return;
  }

  records.forEach((record, idx) => {
    const stepNumber = record.step ?? idx + 1;
    drawLogRecord(doc, record, stepNumber, pageNumRef);
  });

  if (moduleMeta?.omitted > 0) {
    const noteText =
      `Note: ${moduleMeta.omitted} log module(s) excluded from the 10-module limit: ` +
      `${(moduleMeta.omittedNames || []).join(', ')}.`;
    doc.font('Helvetica').fontSize(8);
    const noteLines = splitIntoWrappedLines(doc, noteText, doc.page.width - 100);
    const noteHeight = noteLines.length * measureLineHeight(doc, 1) + 4;
    ensureSpace(doc, noteHeight, pageNumRef);

    syncDocY(
      doc,
      drawWrappedText(
        doc,
        noteText,
        50,
        doc.y,
        doc.page.width - 100,
        { font: 'Helvetica', fontSize: 8, color: COLORS.warning, lineGap: 1 },
        pageNumRef
      )
    );
  }
}

function drawLogsSection(doc, reportData, pageNumRef) {
  drawChronologicalTimeline(doc, reportData, pageNumRef);
}

function drawCertificationSection(doc, summary, pageNumRef) {
  const certText =
    `This report was automatically generated by ${summary.appFullName} using live stored log records ` +
    `(${summary.totalEvents} unique events; ${summary.rawLogCount || summary.totalEvents} raw records fetched` +
    `${summary.duplicatesRemoved ? `; ${summary.duplicatesRemoved} duplicates merged` : ''}). ` +
    'Events appear in strict chronological order. All timestamps are IST. Complete payloads are included.';

  doc.font('Helvetica').fontSize(8);
  const certLines = splitIntoWrappedLines(doc, certText, doc.page.width - 100);
  const certLineStep = measureLineHeight(doc, 1);
  const certHeight = certLines.length * certLineStep;
  const blockHeight = 18 + certHeight + 8;

  ensureSpace(doc, blockHeight, pageNumRef);

  const certTitleY = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary);
  drawAbsoluteText(doc, 'Certification', 50, certTitleY);
  syncDocY(doc, certTitleY + 16);

  syncDocY(
    doc,
    drawWrappedText(
      doc,
      certText,
      50,
      doc.y,
      doc.page.width - 100,
      { font: 'Helvetica', fontSize: 8, color: COLORS.text, lineGap: 1 },
      pageNumRef
    )
  );
}

function generateJourneyReportPdf(reportData) {
  const { summary } = reportData;
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 50, right: 50 },
    autoFirstPage: true,
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

  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.white).text(summary.appName, 50, 32, { lineBreak: false });
  doc.font('Helvetica').fontSize(11).fillColor('#94a3b8').text('Customer Journey Audit Report', 50, 60, { lineBreak: false });
  doc.fontSize(9).fillColor('#cbd5e1').text('Prepared for PayU Compliance & Risk Review', 50, 78, { lineBreak: false });
  doc.fontSize(8).text(`Generated: ${formatTs(summary.generatedAt)} (IST)`, 50, 92, { lineBreak: false });

  syncDocY(doc, 130);

  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.accent);
  const officialTitleY = doc.y;
  drawAbsoluteText(doc, 'Official Transaction Evidence Report', 50, officialTitleY, {
    align: 'center',
    width: doc.page.width - 100,
  });
  syncDocY(doc, officialTitleY + 20);

  drawSummarySection(doc, summary, pageNumRef);
  drawLogsSection(doc, reportData, pageNumRef);
  drawCertificationSection(doc, summary, pageNumRef);

  drawPageFooter(doc, pageNumRef.value);

  return doc;
}

module.exports = {
  generateJourneyReportPdf,
  formatTs,
  detailsToFullText,
  splitIntoWrappedLines,
  ensureY,
};
