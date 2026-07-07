const router = require('express').Router();
const controller = require('../controllers/intercityPackageController');
const { authenticate } = require('../middleware/auth');
const {
  validateBody,
  validateQuery,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  createIntercityPackageBody,
  updateIntercityPackageBody,
  intercityPackagesQuery,
  publicIntercityQuery,
} = require('../validations/intercity.validation');

router.post('/create', authenticate, rejectEmptyBody, validateBody(createIntercityPackageBody), controller.createPackage);
router.get('/all', authenticate, validateQuery(intercityPackagesQuery), controller.getPackages);
router.put('/:id', authenticate, validateObjectId('id', 'package ID'), rejectEmptyBody, validateBody(updateIntercityPackageBody), controller.updatePackage);
router.delete('/:id', authenticate, validateObjectId('id', 'package ID'), controller.deletePackage);
router.patch('/:id/toggle', authenticate, validateObjectId('id', 'package ID'), controller.toggleStatus);
router.get('/public', validateQuery(publicIntercityQuery), controller.getPackages);

module.exports = router;
