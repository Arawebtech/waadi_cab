/**
 * Mongoose plugin — logs insert/update/delete on Booking and Payment collections.
 */

const logger = require('./logger');
const { getContext } = require('./correlationContext');
const { maskSensitive } = require('./maskSensitive');

function mongooseAuditPlugin(schema, options = {}) {
  const modelName = options.modelName || 'Document';

  schema.post('save', function docSaved(doc) {
    const ctx = getContext();
    const isNew = doc.wasNew ?? doc.isNew;
    logger.db(`${modelName} ${isNew ? 'insert' : 'update'}`, {
      sourceFile: 'mongooseAuditPlugin.js',
      sourceFunction: 'post save',
      operation: isNew ? 'insert' : 'update',
      model: modelName,
      docId: doc._id?.toString(),
      bookingId: doc.bookingId || ctx.bookingId,
      transactionId: doc.txn_id || doc.payment_details?.transaction_id || ctx.transactionId,
      status: doc.status,
      data: maskSensitive({
        status: doc.status,
        amount: doc.amount,
        bookingId: doc.bookingId,
        txn_id: doc.txn_id,
      }),
    });
  });

  schema.post('insertMany', function docsInserted(docs) {
    logger.db(`${modelName} bulk insert`, {
      sourceFile: 'mongooseAuditPlugin.js',
      sourceFunction: 'post insertMany',
      operation: 'insert',
      model: modelName,
      count: docs?.length,
    });
  });

  schema.post('findOneAndUpdate', function docUpdated(doc) {
    if (!doc) return;
    logger.db(`${modelName} update`, {
      sourceFile: 'mongooseAuditPlugin.js',
      sourceFunction: 'post findOneAndUpdate',
      operation: 'update',
      model: modelName,
      docId: doc._id?.toString(),
      bookingId: doc.bookingId,
      transactionId: doc.txn_id || doc.payment_details?.transaction_id,
      status: doc.status,
    });
  });

  schema.post('findOneAndDelete', function docDeleted(doc) {
    logger.db(`${modelName} delete`, {
      sourceFile: 'mongooseAuditPlugin.js',
      sourceFunction: 'post findOneAndDelete',
      operation: 'delete',
      model: modelName,
      docId: doc?._id?.toString(),
      bookingId: doc?.bookingId,
    });
  });

  schema.post('deleteOne', { document: true, query: false }, function docDeleted() {
    logger.db(`${modelName} deleteOne`, {
      sourceFile: 'mongooseAuditPlugin.js',
      sourceFunction: 'post deleteOne',
      operation: 'delete',
      model: modelName,
      docId: this._id?.toString(),
      bookingId: this.bookingId,
    });
  });
}

module.exports = mongooseAuditPlugin;
