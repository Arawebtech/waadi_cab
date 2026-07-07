const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const FOLDER_MAP = {
  aadhaar_front: 'riders/aadhaar',
  aadhaar_back: 'riders/aadhaar',
  pan: 'riders/pan',
  license_front: 'riders/license',
  license_back: 'riders/license',
  selfie: 'riders/selfie',
  rc_front: 'riders/vehicle',
  rc_back: 'riders/vehicle',
  insurance: 'riders/vehicle',
  pollution: 'riders/vehicle',
  profile: 'customers/profile',
};

if (env.cloudinary.cloudName) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

function validateFile(file) {
  if (!file) throw new AppError('No file provided', 400);
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    throw new AppError('Invalid file type. Allowed: JPG, JPEG, PNG, PDF', 400);
  }
  const maxBytes = env.cloudinary.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new AppError(`File exceeds ${env.cloudinary.maxFileSizeMb}MB limit`, 400);
  }
}

async function compressIfImage(buffer, mimetype) {
  if (!mimetype.startsWith('image/') || mimetype === 'image/png') {
    return buffer;
  }
  return sharp(buffer).jpeg({ quality: 82 }).toBuffer();
}

async function uploadDocument({ buffer, mimetype, docType, resourceId }) {
  if (!env.cloudinary.cloudName) {
    return {
      secure_url: `https://placeholder.local/${docType}/${Date.now()}`,
      public_id: `dev/${docType}/${resourceId}/${Date.now()}`,
      uploadedAt: new Date(),
    };
  }

  validateFile({ mimetype, size: buffer.length });
  const folder = FOLDER_MAP[docType] || 'uploads';
  const processed = await compressIfImage(buffer, mimetype);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: mimetype === 'application/pdf' ? 'raw' : 'image',
        public_id: `${docType}_${resourceId}_${Date.now()}`,
      },
      (err, result) => {
        if (err) return reject(new AppError('Upload failed', 500));
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          uploadedAt: new Date(),
        });
      }
    );
    stream.end(processed);
  });
}

async function deleteDocument(publicId) {
  if (!publicId || !env.cloudinary.cloudName) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
  } catch {
    // ignore delete errors
  }
}

module.exports = { uploadDocument, deleteDocument, validateFile, FOLDER_MAP };
