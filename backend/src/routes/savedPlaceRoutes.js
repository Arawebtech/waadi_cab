const express = require('express');
const router = express.Router();

const savedPlaceController = require('../controllers/savedPlaceController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');


// ======================
// CUSTOMER ROUTES
// ======================
router.post('/create', auth, savedPlaceController.createSavedPlace);

router.get('/my', auth, savedPlaceController.getMySavedPlaces);

router.put('/:id', auth, savedPlaceController.updateSavedPlace);

router.delete('/:id', auth, savedPlaceController.deleteSavedPlace);


// ======================
// ADMIN ROUTES
// ======================
router.get('/admin/all', adminAuth, savedPlaceController.adminGetAllSavedPlaces);

router.delete('/admin/:id', adminAuth, savedPlaceController.adminDeleteSavedPlace);

module.exports = router;