const express = require('express');
const router = express.Router();
const stateController = require('../controllers/stateController');

// GET /states - List active states
router.get('/', stateController.getStates);

// GET /states/admin - List all states with default entry districts for admin panel
router.get('/admin', stateController.getStatesForAdmin);

// POST /states - Add a new state
router.post('/', stateController.createState);

// PATCH /states/:id - Update state
router.patch('/:id', stateController.updateState);

// PATCH /states/:id/toggle - Toggle is_active status
router.patch('/:id/toggle', stateController.toggleState);

// DELETE /states/:id - Hard delete state
router.delete('/:id', stateController.deleteState);

module.exports = router; 