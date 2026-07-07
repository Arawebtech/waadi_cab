const cloudinaryService = require('../cab-services/cloudinary.service');

const DOC_TYPE_MAP = {
  driving_license: 'license_front',
  aadhaar: 'aadhaar_front',
  pan: 'pan',
  rc: 'rc_front',
  insurance: 'insurance',
  vehicle_permit: 'rc_back',
  fitness_certificate: 'pollution',
  police_verification: 'selfie',
  profile_photo: 'profile',
  additional: 'profile',
};

async function uploadDriverFile(file, docType, userId) {
  const mapped = DOC_TYPE_MAP[docType] || 'profile';
  return cloudinaryService.uploadDocument({
    buffer: file.buffer,
    mimetype: file.mimetype,
    docType: mapped,
    resourceId: userId.toString(),
  });
}

async function deleteDriverFile(publicId) {
  return cloudinaryService.deleteDocument(publicId);
}

module.exports = { uploadDriverFile, deleteDriverFile, DOC_TYPE_MAP };
