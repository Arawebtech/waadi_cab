const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validationController');

// POST /api/v1/validate-booking - Validate booking data and pricing before payment
router.post('/validate-booking', validationController.validateBooking);

module.exports = router;


