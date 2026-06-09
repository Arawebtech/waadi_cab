const express = require('express');
const router = express.Router();
const districtController = require('../controllers/districtController');

// GET /districts?state_id=... - List districts by state
router.get('/', districtController.getDistricts);

// POST /districts - Add a new district
router.post('/', districtController.createDistrict);

// PATCH /districts/:id - Update district
router.patch('/:id', districtController.updateDistrict);

// PATCH /districts/:id/toggle - Toggle is_active status
router.patch('/:id/toggle', districtController.toggleDistrict);

module.exports = router; 