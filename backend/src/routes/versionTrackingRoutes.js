const express = require('express');
const router = express.Router();
const versionTrackingController = require('../controllers/versionTrackingController');

// POST /version-track - Track user's app version
router.post('/version-track', versionTrackingController.trackVersion);

// GET /version-stats - Get version statistics (admin)
router.get('/version-stats', versionTrackingController.getVersionStats);

// GET /users-by-version/:version - Get users by specific version (admin)
router.get('/users-by-version/:version', versionTrackingController.getUsersByVersion);

module.exports = router;

