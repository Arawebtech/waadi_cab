const express = require('express');
const router = express.Router();
const stateController = require('../controllers/stateController');
const {
  validateBody,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const { createStateBody, updateStateBody } = require('../validations/geo.validation');

router.get('/', stateController.getStates);
router.get('/admin', stateController.getStatesForAdmin);
router.post('/', rejectEmptyBody, validateBody(createStateBody), stateController.createState);
router.patch('/:id', validateObjectId('id', 'state ID'), rejectEmptyBody, validateBody(updateStateBody), stateController.updateState);
router.patch('/:id/toggle', validateObjectId('id', 'state ID'), stateController.toggleState);
router.delete('/:id', validateObjectId('id', 'state ID'), stateController.deleteState);

module.exports = router;
