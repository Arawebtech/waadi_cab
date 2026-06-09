const express = require('express');
const router = express.Router();
const appVersionController = require('../controllers/appVersionController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/check', appVersionController.checkUpdate);

// Admin routes (no authentication required)
router.get('/admin/app-versions', appVersionController.getAllVersions);
router.post('/admin/app-versions', appVersionController.uploadAppVersionMiddleware, appVersionController.createVersion);
router.put('/admin/app-versions/:id', appVersionController.uploadAppVersionMiddleware, appVersionController.updateVersion);
router.delete('/admin/app-versions/:id', appVersionController.deleteVersion);
router.put('/admin/app-versions/:id/toggle-active', appVersionController.toggleActive);

// Download route (public for OTA updates)
router.get('/admin/app-versions/download/:filename', appVersionController.downloadFile);

module.exports = router;

