const Vehicle = require('../models/Vehicle');

exports.getAllVehicles = async (req, res) => {
  try {

    const {
      page = 1,
      limit = 10,
      status,
      vehicleType,
      search
    } = req.query;

    const query = {};

    // filter by status
    if (status) {
      query.verificationStatus = status;
    }

    // filter by vehicle type
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    // search by vehicle number
    if (search) {
      query.vehicleNumber = {
        $regex: search.toUpperCase(),
        $options: 'i'
      };
    }

    const skip = (page - 1) * limit;

    const vehicles = await Vehicle.find(query)
      .populate('userId', 'firstName lastName phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Vehicle.countDocuments(query);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: Number(page),
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


exports.getPendingVehicles = async (req, res) => {
  try {

    const vehicles = await Vehicle.find({
      verificationStatus: {
        $in: ['pending', 'under_review', 'draft']
      }
    })
    .populate('userId', 'firstName lastName phoneNumber')
    .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.verifyVehicle = async (req, res) => {
  try {

    const { id } = req.params;
    const { status, reason } = req.body;

    const allowed = ['approved', 'rejected'];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    vehicle.verificationStatus = status;

    vehicle.verifiedAt = new Date();
    vehicle.verifiedBy = req.user._id;

    if (status === 'rejected') {
      vehicle.rejectionReason = reason || 'No reason provided';
    } else {
      vehicle.rejectionReason = null;
    }

    vehicle.verificationHistory.push({
      action: status === 'approved'
        ? 'vehicle_approved'
        : 'vehicle_rejected',
      remarks: reason,
      performedBy: req.user._id
    });

    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: `Vehicle ${status}`,
      data: vehicle
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.verifyDocument = async (req, res) => {
  try {

    const { id, documentType } = req.params;
    const { status, reason } = req.body;

    const allowedTypes = [
      'rc',
      'insurance',
      'puc',
      'license',
      'aadhaar',
      'pan',
    ];

    const allowedStatus = ['approved', 'rejected'];

    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const vehicle = await Vehicle.findById(id);

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
        message: 'Document not uploaded'
      });
    }

    // update document
    vehicle.documents[documentType].status = status;

    if (status === 'approved') {
      vehicle.documents[documentType].approvedAt = new Date();
      vehicle.documents[documentType].approvedBy = req.user._id;
      vehicle.documents[documentType].rejectionReason = null;
    } else {
      vehicle.documents[documentType].rejectionReason = reason || 'No reason provided';
    }

    // check if ALL documents approved → auto approve vehicle
    const allDocs = Object.values(vehicle.documents);

    const allApproved = allDocs.every(
      (d) =>
        d.public_id &&
        d.status === 'approved'
    );

    if (allApproved) {
      vehicle.verificationStatus = 'approved';
      vehicle.verifiedAt = new Date();
      vehicle.verifiedBy = req.user._id;
    } else {
      vehicle.verificationStatus = 'under_review';
    }

    vehicle.verificationHistory.push({
      action: status === 'approved'
        ? 'document_approved'
        : 'document_rejected',
      documentType,
      remarks: reason,
      performedBy: req.user._id
    });

    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: `Document ${status}`,
      data: vehicle
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};