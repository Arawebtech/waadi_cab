const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: env.cloudinary.maxFileSizeMb * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname?.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new AppError('Only JPG, PNG images and PDF documents are allowed', 400, 'INVALID_FILE_TYPE'));
    }
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new AppError('Only JPG, PNG images and PDF documents are allowed', 400, 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

function requireUploadedFile(fieldName = 'document') {
  return (req, res, next) => {
    const file = req.file || req.files?.[fieldName]?.[0];
    if (!file) {
      return next(new AppError('File is required', 400, 'FILE_REQUIRED'));
    }
    next();
  };
}

module.exports = upload;
module.exports.requireUploadedFile = requireUploadedFile;
module.exports.ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;
