const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

let pageBreaks = 0;
const origAddPage = PDFDocument.prototype.addPage;
PDFDocument.prototype.addPage = function (...args) {
  pageBreaks += 1;
  const stack = new Error().stack.split('\n')[2]?.trim() || '';
  console.log(`addPage #${pageBreaks} doc.y=${this.y.toFixed(1)}  ${stack}`);
  return origAddPage.apply(this, args);
};

const { generateJourneyReportPdf } = require('./src/services/journeyReportPdfService');

function buildReport(recordCount, payloadSize) {
  const now = new Date();
  const bigPayload = 'x'.repeat(payloadSize);
  const records = Array.from({ length: recordCount }, (_, i) => ({
    step: i + 1,
    id: 'r' + (i + 1),
    module: 'Audit',
    timestamp: new Date(now.getTime() + i * 1000),
    title: 'Event ' + (i + 1),
    canonicalEventType: 'TYPE_' + (i + 1),
    details: {
      eventType: 'TYPE_' + (i + 1),
      index: i + 1,
      payload: bigPayload,
      nested: { a: bigPayload.slice(0, 200), b: [1, 2, 3, bigPayload.slice(0, 100)] },
    },
  }));

  return {
    summary: {
      appName: 'Wadi Cab',
      appFullName: 'Wadi Cab Border Tax',
      generatedAt: now,
      bookingId: 'BOOK-TEST-001',
      transactionId: 'TXN-TEST-001',
      payuTransactionId: 'MIH-123',
      user: { id: 'u1', name: 'Test User', phone: '9999999999', email: 'test@example.com' },
      vehicle: { number: 'MH12AB1234', type: '4 Wheeler', whatsapp: '9999999999', entryBorder: 'Attari' },
      booking: {
        visitingState: 'Punjab',
        taxMode: 'Daily',
        fromDate: now,
        uptoDate: now,
        createdAt: now,
        gateway: 'PayU',
      },
      payment: { amount: '500', status: 'paid', paidAt: now },
      bookingStatus: 'paid',
      totalEvents: recordCount,
      rawLogCount: recordCount,
      duplicatesRemoved: 0,
      totalModules: 1,
    },
    chronologicalTimeline: records,
    moduleMeta: { omitted: 0 },
  };
}

async function runCase(label, report, outFile) {
  pageBreaks = 0;
  const doc = generateJourneyReportPdf(report);
  const outPath = path.join(__dirname, outFile);
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  await new Promise((res, rej) => {
    stream.on('finish', res);
    doc.on('error', rej);
    doc.end();
  });

  const stats = fs.statSync(outPath);
  console.log(`\n=== ${label} ===`);
  console.log(`Pages (addPage+1): ${pageBreaks + 1}, addPage calls: ${pageBreaks}, file: ${(stats.size / 1024).toFixed(1)} KB`);
  return pageBreaks + 1;
}

(async () => {
  await runCase('Small (3 records, tiny payload)', buildReport(3, 10), 'test-pdf-small.pdf');
  await runCase('Medium (5 records, 2KB payload each)', buildReport(5, 2000), 'test-pdf-medium.pdf');
  await runCase('Large (3 records, 8KB payload each)', buildReport(3, 8000), 'test-pdf-large.pdf');
})();
