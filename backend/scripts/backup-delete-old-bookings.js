// /**
//  * Backup + Delete Old Bookings
//  *
//  * CUT-OFF:
//  *   Before 01 December 2025
//  *
//  * IMPORTANT:
//  *   Default mode is DRY RUN.
//  *
//  * Run:
//  *   node scripts/backup-delete-old-bookings.js
//  *
//  * Actual delete:
//  *   CONFIRM_DELETE=true node scripts/backup-delete-old-bookings.js
//  *
//  * Optional:
//  *   BACKUP_DIR=./backups
//  *   CUTOFF_DATE=2025-12-01
//  */

// require('dotenv').config();

// const mongoose = require('mongoose');
// const fs = require('fs');
// const path = require('path');
// const crypto = require('crypto');
// const Booking = require('../src/models/Booking');


// // ============================================================
// // CONFIGURATION
// // ============================================================

// const CUTOFF_DATE_STRING = process.env.CUTOFF_DATE || '2025-12-01';

// const CUTOFF_DATE = new Date(`${CUTOFF_DATE_STRING}T00:00:00.000Z`);

// const BACKUP_DIR = path.resolve(
//   process.env.BACKUP_DIR || './backups'
// );

// const CONFIRM_DELETE =
//   String(process.env.CONFIRM_DELETE).toLowerCase() === 'true';

// const BATCH_SIZE = 1000;

// // ============================================================
// // VALIDATION
// // ============================================================

// if (Number.isNaN(CUTOFF_DATE.getTime())) {
//   console.error('❌ Invalid CUTOFF_DATE:', CUTOFF_DATE_STRING);
//   process.exit(1);
// }

// if (!process.env.MONGODB_URI) {
//   console.error('❌ MONGODB_URI is missing in .env');
//   process.exit(1);
// }

// // ============================================================
// // HELPERS
// // ============================================================

// function formatDate(date) {
//   return date.toISOString().replace(/[:.]/g, '-');
// }

// function getBackupFilePath() {
//   const timestamp = formatDate(new Date());

//   return path.join(
//     BACKUP_DIR,
//     `bookings-before-${CUTOFF_DATE_STRING}-${timestamp}.jsonl`
//   );
// }

// function createHash() {
//   return crypto.createHash('sha256');
// }

// async function countOldBookings() {
//   return Booking.countDocuments({
//     createdAt: {
//       $lt: CUTOFF_DATE,
//     },
//   });
// }

// // ============================================================
// // BACKUP
// // ============================================================

// async function backupOldBookings() {
//   fs.mkdirSync(BACKUP_DIR, {
//     recursive: true,
//   });

//   const backupFile = getBackupFilePath();

//   console.log('');
//   console.log('==============================================');
//   console.log('📦 BOOKING BACKUP');
//   console.log('==============================================');
//   console.log(`Cutoff date : ${CUTOFF_DATE.toISOString()}`);
//   console.log(`Backup file : ${backupFile}`);
//   console.log('');

//   const total = await countOldBookings();

//   console.log(`📊 Bookings to backup: ${total}`);

//   if (total === 0) {
//     console.log('✅ No bookings found before cutoff date.');
//     return {
//       backupFile: null,
//       count: 0,
//       hash: null,
//     };
//   }

//   const writeStream = fs.createWriteStream(backupFile, {
//     encoding: 'utf8',
//   });

//   const hash = createHash();

//   let processed = 0;

//   const cursor = Booking.find({
//     createdAt: {
//       $lt: CUTOFF_DATE,
//     },
//   })
//     .sort({ _id: 1 })
//     .lean()
//     .cursor();

//   try {
//     for await (const booking of cursor) {
//       const line = JSON.stringify(booking) + '\n';

//       writeStream.write(line);

//       hash.update(line);

//       processed++;

//       if (
//         processed % BATCH_SIZE === 0 ||
//         processed === total
//       ) {
//         const percentage = ((processed / total) * 100).toFixed(2);

//         process.stdout.write(
//           `\r💾 Backing up: ${processed}/${total} (${percentage}%)`
//         );
//       }
//     }
//   } finally {
//     await new Promise((resolve, reject) => {
//       writeStream.end(() => resolve());
//       writeStream.on('error', reject);
//     });
//   }

//   console.log('');

//   const finalHash = hash.digest('hex');

//   const stats = fs.statSync(backupFile);

//   console.log('');
//   console.log('✅ Backup completed');
//   console.log(`   Records : ${processed}`);
//   console.log(`   Size    : ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
//   console.log(`   SHA256  : ${finalHash}`);
//   console.log(`   File    : ${backupFile}`);

//   // ==========================================================
//   // BACKUP VERIFICATION
//   // ==========================================================

//   console.log('');
//   console.log('🔍 Verifying backup...');

//   const backupCount = await countLines(backupFile);

//   if (backupCount !== processed) {
//     throw new Error(
//       `Backup verification failed. Expected ${processed}, found ${backupCount}`
//     );
//   }

//   console.log(
//     `✅ Backup verified: ${backupCount} records`
//   );

//   // Save metadata separately
//   const metadataFile = backupFile.replace(
//     '.jsonl',
//     '.metadata.json'
//   );

//   const metadata = {
//     createdAt: new Date().toISOString(),

//     cutoffDate: CUTOFF_DATE.toISOString(),

//     filter: {
//       createdAt: {
//         $lt: CUTOFF_DATE.toISOString(),
//       },
//     },

//     collection: 'bookings',

//     model: 'Booking',

//     recordCount: processed,

//     backupFile: path.basename(backupFile),

//     backupSizeBytes: stats.size,

//     sha256: finalHash,
//   };

//   fs.writeFileSync(
//     metadataFile,
//     JSON.stringify(metadata, null, 2),
//     'utf8'
//   );

//   console.log(`📄 Metadata: ${metadataFile}`);

//   return {
//     backupFile,
//     metadataFile,
//     count: processed,
//     hash: finalHash,
//   };
// }

// // ============================================================
// // COUNT JSONL
// // ============================================================

// function countLines(filePath) {
//   return new Promise((resolve, reject) => {
//     let count = 0;

//     const stream = fs.createReadStream(filePath, {
//       encoding: 'utf8',
//     });

//     let remainder = '';

//     stream.on('data', (chunk) => {
//       const data = remainder + chunk;

//       const lines = data.split('\n');

//       remainder = lines.pop();

//       count += lines.filter(Boolean).length;
//     });

//     stream.on('end', () => {
//       if (remainder.trim()) {
//         count++;
//       }

//       resolve(count);
//     });

//     stream.on('error', reject);
//   });
// }

// // ============================================================
// // DELETE
// // ============================================================

// async function deleteOldBookings(expectedCount) {
//   console.log('');
//   console.log('==============================================');
//   console.log('🗑️ DELETE OLD BOOKINGS');
//   console.log('==============================================');

//   if (!CONFIRM_DELETE) {
//     console.log('');
//     console.log('🛑 DRY RUN MODE');
//     console.log('');
//     console.log(
//       'No records will be deleted.'
//     );
//     console.log('');
//     console.log(
//       'To actually delete, run:'
//     );
//     console.log('');
//     console.log(
//       'CONFIRM_DELETE=true node scripts/backup-delete-old-bookings.js'
//     );
//     console.log('');

//     return;
//   }

//   // Re-check count immediately before deletion.
//   const currentCount = await countOldBookings();

//   console.log(
//     `Records currently matching delete filter: ${currentCount}`
//   );

//   if (currentCount !== expectedCount) {
//     throw new Error(
//       `Safety check failed. Backup contains ${expectedCount} records, but database currently has ${currentCount} matching records.`
//     );
//   }

//   console.log('');
//   console.log('⚠️ FINAL DELETE CONFIRMATION');
//   console.log('');
//   console.log(
//     `Deleting ${currentCount} bookings created before ${CUTOFF_DATE_STRING}`
//   );
//   console.log('');

//   const result = await Booking.deleteMany({
//     createdAt: {
//       $lt: CUTOFF_DATE,
//     },
//   });

//   console.log('');
//   console.log('✅ Delete completed');
//   console.log(`   Deleted: ${result.deletedCount}`);

//   if (result.deletedCount !== expectedCount) {
//     throw new Error(
//       `Delete count mismatch. Expected ${expectedCount}, deleted ${result.deletedCount}`
//     );
//   }

//   // ==========================================================
//   // FINAL VERIFICATION
//   // ==========================================================

//   const remaining = await countOldBookings();

//   console.log('');
//   console.log(`Remaining old bookings: ${remaining}`);

//   if (remaining !== 0) {
//     throw new Error(
//       `Delete verification failed. ${remaining} old bookings are still present.`
//     );
//   }

//   console.log('');
//   console.log('🎉 DELETE VERIFIED SUCCESSFULLY');
// }

// // ============================================================
// // MAIN
// // ============================================================

// async function main() {
//   console.log('');
//   console.log('==============================================');
//   console.log('🚀 OLD BOOKING BACKUP + CLEANUP');
//   console.log('==============================================');
//   console.log('');
//   console.log(
//     `Today: ${new Date().toISOString()}`
//   );
//   console.log(
//     `Delete bookings where createdAt < ${CUTOFF_DATE.toISOString()}`
//   );
//   console.log(
//     `Mode: ${CONFIRM_DELETE ? 'DELETE' : 'DRY RUN'}`
//   );
//   console.log('');

//   try {
//     await mongoose.connect(process.env.MONGODB_URI);

//     console.log('✅ MongoDB connected');

//     const result = await backupOldBookings();

//     if (!result.count) {
//       console.log('');
//       console.log('Nothing to delete.');
//       return;
//     }

//     await deleteOldBookings(result.count);

//     console.log('');
//     console.log('==============================================');
//     console.log('✅ OPERATION COMPLETED');
//     console.log('==============================================');
//     console.log('');
//   } catch (error) {
//     console.error('');
//     console.error('❌ OPERATION FAILED');
//     console.error('');
//     console.error(error);
//     console.error('');
//     process.exitCode = 1;
//   } finally {
//     await mongoose.disconnect();

//     console.log('🔌 MongoDB disconnected');
//   }
// }

// main();




/**
 * MongoDB Cleanup Script
 *
 * CLEANUP RULES:
 *
 * 1. Booking
 *    Delete bookings created before 01 February 2026.
 *
 * 2. SystemLog
 *    Delete ALL records created before 20 August 2026.
 *
 * 3. AuditLog
 *    Delete ALL records created before 20 August 2026.
 *
 * IMPORTANT:
 * - Booking backup has already been taken separately.
 * - This script DOES NOT create another backup.
 * - Default mode is DRY RUN.
 *
 * DRY RUN:
 *   node scripts/backup-delete-old-bookings.js
 *
 * ACTUAL DELETE:
 *
 * PowerShell:
 *   $env:CONFIRM_DELETE="true"; npm run seed:delete-old-booking
 *
 * CMD:
 *   set CONFIRM_DELETE=true&& npm run seed:delete-old-booking
 */

require('dotenv').config();

const mongoose = require('mongoose');

const Booking = require('../src/models/Booking');
const SystemLog = require('../src/models/SystemLog');
const AuditLog = require('../src/models/AuditLog');

// ============================================================
// CONFIGURATION
// ============================================================

// Booking cutoff:
// Anything created BEFORE this date will be deleted.
const BOOKING_CUTOFF_DATE = new Date(
  '2026-02-01T00:00:00.000Z'
);

// Log cutoff:
// Anything created BEFORE 20 August 2026 will be deleted.
const LOG_CUTOFF_DATE = new Date(
  '2026-08-20T00:00:00.000Z'
);

const CONFIRM_DELETE =
  String(process.env.CONFIRM_DELETE).toLowerCase() === 'true';

// ============================================================
// VALIDATION
// ============================================================

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing in .env');
  process.exit(1);
}

if (Number.isNaN(BOOKING_CUTOFF_DATE.getTime())) {
  console.error('❌ Invalid booking cutoff date');
  process.exit(1);
}

if (Number.isNaN(LOG_CUTOFF_DATE.getTime())) {
  console.error('❌ Invalid log month dates');
  process.exit(1);
}

// ============================================================
// FILTERS
// ============================================================

const BOOKING_DELETE_FILTER = {
  createdAt: {
    $lt: BOOKING_CUTOFF_DATE,
  },
};

const LOG_DELETE_FILTER = {
  createdAt: {
    $lt: LOG_CUTOFF_DATE,
  },
};

// ============================================================
// COUNT HELPERS
// ============================================================

async function getCounts() {
  const [
    oldBookings,
    oldSystemLogs,
    oldAuditLogs,
    totalBookings,
    totalSystemLogs,
    totalAuditLogs,
  ] = await Promise.all([
    Booking.countDocuments(BOOKING_DELETE_FILTER),

    SystemLog.countDocuments(LOG_DELETE_FILTER),

    AuditLog.countDocuments(LOG_DELETE_FILTER),

    Booking.countDocuments({}),

    SystemLog.countDocuments({}),

    AuditLog.countDocuments({}),
  ]);

  return {
    oldBookings,
    oldSystemLogs,
    oldAuditLogs,

    totalBookings,
    totalSystemLogs,
    totalAuditLogs,
  };
}

// ============================================================
// DISPLAY COUNTS
// ============================================================

function displayCounts(counts) {
  console.log('');
  console.log('==============================================');
  console.log('📊 DATABASE CLEANUP SUMMARY');
  console.log('==============================================');

  console.log('');
  console.log('📦 BOOKINGS');
  console.log(
    `   Total bookings       : ${counts.totalBookings}`
  );
  console.log(
    `   To delete (< 2026-02-01): ${counts.oldBookings}`
  );
  console.log(
    `   To keep              : ${
      counts.totalBookings - counts.oldBookings
    }`
  );

  console.log('');
  console.log('📝 SYSTEM LOGS');
  console.log(
    `   Total system logs    : ${counts.totalSystemLogs}`
  );
  console.log(
    `   To delete            : ${counts.oldSystemLogs}`
  );
  console.log(
    `   To keep              : ${
      counts.totalSystemLogs - counts.oldSystemLogs
    }`
  );

  console.log('');
  console.log('🔐 AUDIT LOGS');
  console.log(
    `   Total audit logs     : ${counts.totalAuditLogs}`
  );
  console.log(
    `   To delete            : ${counts.oldAuditLogs}`
  );
  console.log(
    `   To keep              : ${
      counts.totalAuditLogs - counts.oldAuditLogs
    }`
  );

  console.log('');
  console.log('==============================================');
  console.log('KEEP RULES');
  console.log('==============================================');

  console.log('');
  console.log(
    '📦 Booking: createdAt >= 2026-02-01'
  );

  console.log(
    '📝 SystemLog: createdAt < 2026-08-20'
  );

  console.log(
    '🔐 AuditLog: createdAt < 2026-08-20'
  );

  console.log('');
}

// ============================================================
// DRY RUN
// ============================================================

function displayDryRun() {
  console.log('');
  console.log('==============================================');
  console.log('🛑 DRY RUN MODE');
  console.log('==============================================');

  console.log('');
  console.log('No database records have been deleted.');

  console.log('');
  console.log('To perform the actual deletion:');

  console.log('');

  console.log(
    '$env:CONFIRM_DELETE="true"; npm run seed:delete-old-booking'
  );

  console.log('');
}

// ============================================================
// DELETE BOOKINGS
// ============================================================

async function deleteBookings(expectedCount) {
  if (expectedCount === 0) {
    console.log('');
    console.log('✅ No old bookings to delete.');
    return 0;
  }

  const currentCount =
    await Booking.countDocuments(
      BOOKING_DELETE_FILTER
    );

  console.log('');
  console.log(
    `🔍 Booking records currently matching delete filter: ${currentCount}`
  );

  if (currentCount !== expectedCount) {
    throw new Error(
      `Booking safety check failed. Expected ${expectedCount}, found ${currentCount}.`
    );
  }

  console.log('');
  console.log(
    `🗑️ Deleting ${currentCount} bookings created before 2026-02-01...`
  );

  const result = await Booking.deleteMany(
    BOOKING_DELETE_FILTER
  );

  console.log(
    `✅ Bookings deleted: ${result.deletedCount}`
  );

  if (result.deletedCount !== expectedCount) {
    throw new Error(
      `Booking delete count mismatch. Expected ${expectedCount}, deleted ${result.deletedCount}.`
    );
  }

  const remaining =
    await Booking.countDocuments(
      BOOKING_DELETE_FILTER
    );

  if (remaining !== 0) {
    throw new Error(
      `Booking verification failed. ${remaining} old bookings are still present.`
    );
  }

  console.log(
    '✅ Booking deletion verified.'
  );

  return result.deletedCount;
}

// ============================================================
// DELETE SYSTEM LOGS
// ============================================================

async function deleteSystemLogs(expectedCount) {
  if (expectedCount === 0) {
    console.log('');
    console.log('✅ No old system logs to delete.');
    return 0;
  }

  const currentCount =
    await SystemLog.countDocuments(
      LOG_DELETE_FILTER
    );

  console.log('');
  console.log(
    `🔍 SystemLog records matching delete filter: ${currentCount}`
  );

  if (currentCount !== expectedCount) {
    throw new Error(
      `SystemLog safety check failed. Expected ${expectedCount}, found ${currentCount}.`
    );
  }

  console.log('');
  console.log(
    `🗑️ Deleting ${currentCount} old SystemLog records...`
  );

  const result =
    await SystemLog.deleteMany(
      LOG_DELETE_FILTER
    );

  console.log(
    `✅ SystemLog deleted: ${result.deletedCount}`
  );

  if (result.deletedCount !== expectedCount) {
    throw new Error(
      `SystemLog delete count mismatch. Expected ${expectedCount}, deleted ${result.deletedCount}.`
    );
  }

  const remaining =
    await SystemLog.countDocuments(
      LOG_DELETE_FILTER
    );

  if (remaining !== 0) {
    throw new Error(
      `SystemLog verification failed. ${remaining} records are still outside current month.`
    );
  }

  console.log(
    '✅ SystemLog deletion verified.'
  );

  return result.deletedCount;
}

// ============================================================
// DELETE AUDIT LOGS
// ============================================================

async function deleteAuditLogs(expectedCount) {
  if (expectedCount === 0) {
    console.log('');
    console.log('✅ No old audit logs to delete.');
    return 0;
  }

  const currentCount =
    await AuditLog.countDocuments(
      LOG_DELETE_FILTER
    );

  console.log('');
  console.log(
    `🔍 AuditLog records matching delete filter: ${currentCount}`
  );

  if (currentCount !== expectedCount) {
    throw new Error(
      `AuditLog safety check failed. Expected ${expectedCount}, found ${currentCount}.`
    );
  }

  console.log('');
  console.log(
    `🗑️ Deleting ${currentCount} old AuditLog records...`
  );

  const result =
    await AuditLog.deleteMany(
      LOG_DELETE_FILTER
    );

  console.log(
    `✅ AuditLog deleted: ${result.deletedCount}`
  );

  if (result.deletedCount !== expectedCount) {
    throw new Error(
      `AuditLog delete count mismatch. Expected ${expectedCount}, deleted ${result.deletedCount}.`
    );
  }

  const remaining =
    await AuditLog.countDocuments(
      LOG_DELETE_FILTER
    );

  if (remaining !== 0) {
    throw new Error(
      `AuditLog verification failed. ${remaining} records are still outside current month.`
    );
  }

  console.log(
    '✅ AuditLog deletion verified.'
  );

  return result.deletedCount;
}

// ============================================================
// MAIN DELETE PROCESS
// ============================================================

async function performCleanup(counts) {
  console.log('');
  console.log('==============================================');
  console.log('🗑️ STARTING DATABASE CLEANUP');
  console.log('==============================================');

  console.log('');
  console.log(
    `Bookings to delete : ${counts.oldBookings}`
  );

  console.log(
    `SystemLogs to delete: ${counts.oldSystemLogs}`
  );

  console.log(
    `AuditLogs to delete : ${counts.oldAuditLogs}`
  );

  console.log('');

  const deletedBookings =
    await deleteBookings(
      counts.oldBookings
    );

  const deletedSystemLogs =
    await deleteSystemLogs(
      counts.oldSystemLogs
    );

  const deletedAuditLogs =
    await deleteAuditLogs(
      counts.oldAuditLogs
    );

  console.log('');
  console.log('==============================================');
  console.log('🎉 CLEANUP COMPLETED');
  console.log('==============================================');

  console.log('');
  console.log(
    `Bookings deleted  : ${deletedBookings}`
  );

  console.log(
    `SystemLogs deleted: ${deletedSystemLogs}`
  );

  console.log(
    `AuditLogs deleted : ${deletedAuditLogs}`
  );

  console.log('');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('');
  console.log('==============================================');
  console.log('🚀 DATABASE CLEANUP SCRIPT');
  console.log('==============================================');

  console.log('');
  console.log(
    `Today: ${new Date().toISOString()}`
  );

  console.log(
    `Mode: ${CONFIRM_DELETE ? 'DELETE' : 'DRY RUN'}`
  );

  console.log('');

  try {
    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log('✅ MongoDB connected');

    const counts =
      await getCounts();

    displayCounts(counts);

    // ========================================================
    // DRY RUN
    // ========================================================

    if (!CONFIRM_DELETE) {
      displayDryRun();
      return;
    }

    // ========================================================
    // ACTUAL DELETE
    // ========================================================

    await performCleanup(counts);

    console.log('');
    console.log(
      '🔍 Running final verification...'
    );

    const finalCounts =
      await getCounts();

    console.log('');

    console.log(
      `Remaining old bookings: ${finalCounts.oldBookings}`
    );

    console.log(
      `Remaining old system logs: ${finalCounts.oldSystemLogs}`
    );

    console.log(
      `Remaining old audit logs: ${finalCounts.oldAuditLogs}`
    );

    if (
      finalCounts.oldBookings !== 0 ||
      finalCounts.oldSystemLogs !== 0 ||
      finalCounts.oldAuditLogs !== 0
    ) {
      throw new Error(
        'Final verification failed. Some records matching the delete criteria still exist.'
      );
    }

    console.log('');
    console.log('==============================================');
    console.log('✅ FINAL VERIFICATION PASSED');
    console.log('==============================================');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('==============================================');
    console.error('❌ CLEANUP FAILED');
    console.error('==============================================');
    console.error('');

    console.error(
      error?.stack || error
    );

    console.error('');

    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();

    console.log(
      '🔌 MongoDB disconnected'
    );
  }
}

main();
