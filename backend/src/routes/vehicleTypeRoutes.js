const express = require('express');
const router = express.Router();
const vehicleTypeController = require('../controllers/vehicleTypeController');

// GET /vehicle-types?state_id=... - List vehicle types for a state
router.get('/', vehicleTypeController.getVehicleTypes);

// POST /vehicle-types - Add a new vehicle type
router.post('/', vehicleTypeController.createVehicleType);

// PATCH /vehicle-types/:id - Update vehicle type
router.patch('/:id', vehicleTypeController.updateVehicleType);

// PATCH /vehicle-types/:id/toggle - Toggle is_active status
router.patch('/:id/toggle', vehicleTypeController.toggleVehicleType);

module.exports = router; 