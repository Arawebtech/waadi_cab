const express = require('express');
const router = express.Router();
const appSettingsController = require('../controllers/appSettingsController');
const auth = require('../middleware/auth');

// Public route to check app status (for frontend)
router.get('/app-status', appSettingsController.getAppStatus);

// Temporary public routes for testing (remove in production)
router.get('/app-settings-public', appSettingsController.getAppSettings);
router.put('/app-settings-toggle-public', appSettingsController.toggleAppStatus);
router.put('/app-settings-update-maintenance-public', appSettingsController.updateMaintenanceMessage);
router.put('/app-settings-update-platform-fee-public', appSettingsController.updatePlatformFee);

// Admin routes (require authentication)
router.get('/admin/app-settings', auth.authenticate, appSettingsController.getAppSettings);
router.put('/admin/app-settings/toggle', auth.authenticate, appSettingsController.toggleAppStatus);
router.put('/admin/app-settings/update-maintenance', auth.authenticate, appSettingsController.updateMaintenanceMessage);
router.put('/admin/app-settings/update-platform-fee', auth.authenticate, appSettingsController.updatePlatformFee);

module.exports = router;