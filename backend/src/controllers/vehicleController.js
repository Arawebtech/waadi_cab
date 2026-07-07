const Vehicle = require('../models/Vehicle');
const cloudinaryService = require('../cab-services/cloudinary.service');

async function uploadVehicleDoc(file, userId, docType) {
  const mapped = {
    rc: 'rc_front',
    insurance: 'insurance',
    puc: 'pollution',
    license: 'license_front',
    aadhaar: 'aadhaar_front',
    pan: 'pan',
  }[docType] || 'rc_front';
  return cloudinaryService.uploadDocument({
    buffer: file.buffer,
    mimetype: file.mimetype,
    docType: mapped,
    resourceId: `${userId}_${docType}`,
  });
}

// ===============================
// CREATE VEHICLE
// ===============================
exports.createVehicle = async (req, res) => {
  try {
    const {
      vehicleNumber,
      seatCapacity,
      vehicleType,
      isDefault
    } = req.body;

    if (!vehicleNumber || !seatCapacity || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: 'All required fields are missing'
      });
    }

    const normalizedNumber = vehicleNumber
      .replace(/\s+/g, '')
      .toUpperCase();

    const exists = await Vehicle.findOne({
      vehicleNumber: normalizedNumber
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'Vehicle already exists'
      });
    }

    if (isDefault) {
      await Vehicle.updateMany(
        { userId: req.user._id },
        { isDefault: false }
      );
    }

    const vehicle = new Vehicle({
      userId: req.user._id,
      vehicleNumber: normalizedNumber,
      seatCapacity,
      vehicleType,
      isDefault: !!isDefault,
      verificationStatus: 'draft'
    });

    const docTypes = ['rc', 'insurance', 'puc', 'license','aadhaar','pan'];

    let uploadedAnyDoc = false;

    for (const type of docTypes) {
      if (req.files?.[type]?.[0]) {
        const file = req.files[type][0];

        const result = await uploadVehicleDoc(file, req.user._id, type);

        vehicle.documents[type] = {
          url: result.secure_url,
          public_id: result.public_id,
          status: 'pending',
          uploadedAt: new Date()
        };

        uploadedAnyDoc = true;
      }
    }

    if (uploadedAnyDoc) {
      vehicle.verificationStatus = 'under_review';
    }

    await vehicle.save();

    return res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ===============================
// GET MY VEHICLES
// ===============================
exports.getMyVehicles = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const vehicles = await Vehicle.find({
      userId: req.user._id,
      isActive: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Vehicle.countDocuments({
      userId: req.user._id,
      isActive: true
    });

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: vehicles
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ===============================
// GET VEHICLE BY ID
// ===============================
exports.getVehicleById = async (req, res) => {
  try {

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: vehicle
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ===============================
// UPDATE VEHICLE
// ===============================
exports.updateVehicle = async (req, res) => {
  try {

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    if (req.body.vehicleNumber) {
      const normalized = req.body.vehicleNumber
        .replace(/\s+/g, '')
        .toUpperCase();

      const exists = await Vehicle.findOne({
        _id: { $ne: vehicle._id },
        vehicleNumber: normalized
      });

      if (exists) {
        return res.status(409).json({
          success: false,
          message: 'Vehicle number already exists'
        });
      }

      vehicle.vehicleNumber = normalized;
    }

    if (req.body.seatCapacity) {
      vehicle.seatCapacity = req.body.seatCapacity;
    }

    if (req.body.vehicleType) {
      vehicle.vehicleType = req.body.vehicleType;
    }

    if (req.body.isDefault === true || req.body.isDefault === 'true') {
      await Vehicle.updateMany(
        { userId: req.user._id },
        { isDefault: false }
      );
      vehicle.isDefault = true;
    }

    // reset verification after update
    if (
      req.body.vehicleNumber ||
      req.body.seatCapacity ||
      req.body.vehicleType
    ) {
      vehicle.verificationStatus = 'pending';
      vehicle.verifiedAt = null;
      vehicle.verifiedBy = null;
    }

    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ===============================
// DELETE VEHICLE (SOFT DELETE)
// ===============================
exports.deleteVehicle = async (req, res) => {
  try {

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    vehicle.isActive = false;

    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



exports.uploadDocument = async (req, res) => {
  try {

    const { id } = req.params;
    const { documentType } = req.body;

    const allowedTypes = [
      'rc',
      'insurance',
      'puc',
      'license',
      'aadhaar',
      'pan'
    ];

    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Document file is required'
      });
    }

    const vehicle = await Vehicle.findOne({
      _id: id,
      userId: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const file = req.file;

    const result = await uploadVehicleDoc(file, req.user._id, documentType);

    // If old file exists → delete from Cloudinary
    if (vehicle.documents?.[documentType]?.public_id) {
      await cloudinaryService.deleteDocument(
        vehicle.documents[documentType].public_id
      );
    }

    // 🔥 STEP 3: Save new document
    vehicle.documents[documentType] = {
      url: result.secure_url,
      public_id: result.public_id,
      status: 'pending',
      uploadedAt: new Date(),
      rejectionReason: null
    };

    // 🔥 STEP 4: Update vehicle status
    vehicle.verificationStatus = 'under_review';

    // (optional audit)
    vehicle.verificationHistory.push({
      action: 'document_uploaded',
      documentType,
      performedBy: req.user._id
    });

    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: `${documentType} uploaded successfully`,
      data: vehicle
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.deleteDocument = async (req, res) => {
  try {

    const { id, documentType } = req.params;

    const allowedTypes = [
      'rc',
      'insurance',
      'puc',
      'license',
      'aadhaar',
      'pan'
    ];

    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    const vehicle = await Vehicle.findOne({
      _id: id,
      userId: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const doc = vehicle.documents?.[documentType];

    if (!doc || !doc.public_id) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // 🔥 STEP 1: Delete from Cloudinary
    await cloudinaryService.deleteDocument(doc.public_id);

    // 🔥 STEP 2: Reset document in DB
    vehicle.documents[documentType] = {
      url: null,
      public_id: null,
      status: 'not_uploaded',
      uploadedAt: null,
      rejectionReason: null,
      approvedAt: null,
      approvedBy: null
    };

    // 🔥 STEP 3: Update vehicle status
    vehicle.verificationStatus = 'pending';

    vehicle.verificationHistory.push({
      action: 'document_deleted',
      documentType,
      performedBy: req.user._id
    });

    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: `${documentType} deleted successfully`,
      data: vehicle
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};