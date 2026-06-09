const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');

// GET /plans/types - Get all available plan types
router.get('/types', planController.getPlanTypes);

// GET /plans?vehicle_type_id=... - Get plans by vehicle type
router.get('/', planController.getPlans);

// POST /plans - Add a new plan
router.post('/', planController.createPlan);

// PATCH /plans/:id - Update plan
router.patch('/:id', planController.updatePlan);

// PATCH /plans/:id/toggle - Toggle is_active status
router.patch('/:id/toggle', planController.togglePlan);

module.exports = router; 