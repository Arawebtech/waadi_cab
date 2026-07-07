const express = require('express');
const router = express.Router();
const vehicleTypeController = require('../controllers/vehicleTypeController');
const {
  validateBody,
  validateQuery,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  vehicleTypesQuery,
  createVehicleTypeBody,
  updateVehicleTypeBody,
} = require('../validations/geo.validation');

router.get('/', validateQuery(vehicleTypesQuery), vehicleTypeController.getVehicleTypes);
router.post('/', rejectEmptyBody, validateBody(createVehicleTypeBody), vehicleTypeController.createVehicleType);
router.patch('/:id', validateObjectId('id', 'vehicle type ID'), rejectEmptyBody, validateBody(updateVehicleTypeBody), vehicleTypeController.updateVehicleType);
router.patch('/:id/toggle', validateObjectId('id', 'vehicle type ID'), vehicleTypeController.toggleVehicleType);

module.exports = router;
