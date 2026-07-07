const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authenticate } = require('../middleware/auth');
const { validateBody, rejectEmptyBody } = require('../middleware/validate.middleware');
const { clientLogsBody } = require('../validations/admin.validation');

router.post(
  '/client',
  authenticate,
  rejectEmptyBody,
  validateBody(clientLogsBody),
  logController.ingestClientLogs.bind(logController)
);

module.exports = router;
