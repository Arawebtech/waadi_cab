const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const {
  validateBody,
  validateQuery,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const { plansQuery, createPlanBody, updatePlanBody } = require('../validations/geo.validation');

router.get('/types', planController.getPlanTypes);
router.get('/', validateQuery(plansQuery), planController.getPlans);
router.post('/', rejectEmptyBody, validateBody(createPlanBody), planController.createPlan);
router.patch('/:id', validateObjectId('id', 'plan ID'), rejectEmptyBody, validateBody(updatePlanBody), planController.updatePlan);
router.patch('/:id/toggle', validateObjectId('id', 'plan ID'), planController.togglePlan);

module.exports = router;
