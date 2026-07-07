const express = require('express');
const router = express.Router();
const districtController = require('../controllers/districtController');
const {
  validateBody,
  validateQuery,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const { createDistrictBody, updateDistrictBody } = require('../validations/geo.validation');
const { objectId } = require('../validations/common.schemas');
const Joi = require('joi');

const districtsQuery = Joi.object({
  state_id: objectId.required().messages({ 'any.required': 'State ID is required' }),
});

router.get('/', validateQuery(districtsQuery), districtController.getDistricts);
router.post('/', rejectEmptyBody, validateBody(createDistrictBody), districtController.createDistrict);
router.patch('/:id', validateObjectId('id', 'district ID'), rejectEmptyBody, validateBody(updateDistrictBody), districtController.updateDistrict);
router.patch('/:id/toggle', validateObjectId('id', 'district ID'), districtController.toggleDistrict);

module.exports = router;
