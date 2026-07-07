const express = require('express');
const router = express.Router();

const {
  createVehicle,
  getMyVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  uploadDocument,
  deleteDocument,
} = require('../controllers/vehicleController');

const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload.middleware');
const {
  validateBody,
  validateQuery,
  validateParams,
  validateObjectId,
  handleUploadErrors,
} = require('../middleware/validate.middleware');
const {
  createVehicleBody,
  updateVehicleBody,
  documentTypeParam,
  vehiclesQuery,
} = require('../validations/vehicle.validation');

const driverAuth = [authenticate, authorize('driver', 'owner')];

router.post(
  '/',
  ...driverAuth,
  upload.fields([
    { name: 'rc', maxCount: 1 },
    { name: 'insurance', maxCount: 1 },
    { name: 'puc', maxCount: 1 },
    { name: 'license', maxCount: 1 },
    { name: 'aadhaar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
  ]),
  handleUploadErrors,
  validateBody(createVehicleBody),
  createVehicle
);

router.get('/', ...driverAuth, validateQuery(vehiclesQuery), getMyVehicles);
router.get('/:id', ...driverAuth, validateObjectId('id', 'vehicle ID'), getVehicleById);
router.put('/:id', ...driverAuth, validateObjectId('id', 'vehicle ID'), validateBody(updateVehicleBody), updateVehicle);
router.delete('/:id', ...driverAuth, validateObjectId('id', 'vehicle ID'), deleteVehicle);

router.post(
  '/:id/document',
  ...driverAuth,
  validateObjectId('id', 'vehicle ID'),
  upload.single('document'),
  handleUploadErrors,
  upload.requireUploadedFile('document'),
  uploadDocument
);

router.delete(
  '/:id/document/:documentType',
  ...driverAuth,
  validateParams(documentTypeParam),
  deleteDocument
);

module.exports = router;
