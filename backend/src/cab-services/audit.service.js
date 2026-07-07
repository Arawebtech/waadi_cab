const { AuditLog } = require('../models');

async function log({ actorType, actorId, action, resource, resourceId, metadata, ipAddress, userAgent }) {
  try {
    await AuditLog.create({ actorType, actorId, action, resource, resourceId, metadata, ipAddress, userAgent });
  } catch {
    // non-blocking
  }
}

module.exports = { log };
