const router = require('express').Router();
const controller = require('../controllers/adminManagementController');
const adminAuth = require('../middleware/adminAuth');
const {
  validateBody,
  validateQuery,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  createAdminManagementBody,
  updateAdminManagementBody,
  adminManagementQuery,
} = require('../validations/admin-management.validation');

router.post('/', adminAuth, rejectEmptyBody, validateBody(createAdminManagementBody), controller.createAdmin);
router.get('/', adminAuth, validateQuery(adminManagementQuery), controller.getAdmins);
router.put('/:id', adminAuth, validateObjectId('id', 'admin ID'), rejectEmptyBody, validateBody(updateAdminManagementBody), controller.updateAdmin);
router.patch('/:id/status', adminAuth, validateObjectId('id', 'admin ID'), controller.toggleAdminStatus);
router.delete('/:id', adminAuth, validateObjectId('id', 'admin ID'), controller.deleteAdmin);

module.exports = router;
