const express = require('express');
const router = express.Router();
const formPreferencesController = require('../controllers/formPreferencesController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// POST /users/form-preferences - Save or update form preferences
router.post('/', formPreferencesController.saveFormPreferences);

// GET /users/form-preferences - Get form preferences by type
router.get('/', formPreferencesController.getFormPreferences);

// DELETE /users/form-preferences - Delete form preferences by type
router.delete('/', formPreferencesController.deleteFormPreferences);

// GET /users/form-preferences/all - Get all form preferences for user
router.get('/all', formPreferencesController.getAllFormPreferences);

// DELETE /users/form-preferences/all - Delete all form preferences for user
router.delete('/all', formPreferencesController.deleteAllFormPreferences);

module.exports = router; 