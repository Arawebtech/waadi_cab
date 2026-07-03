const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authenticate } = require('../middleware/auth');

router.post('/client', authenticate, logController.ingestClientLogs.bind(logController));

module.exports = router;
