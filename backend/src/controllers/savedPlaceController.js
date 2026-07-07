const SavedPlace = require('../models/SavedPlace');
const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ===============================
// CUSTOMER: CREATE SAVED PLACE
// ===============================
exports.createSavedPlace = async (req, res) => {
  try {
    const customerId = req.user._id;

    const { label, name, address, lat, lng, placeId } = req.body;

    // VALIDATION
    if (!label || !name || !address || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      });
    }

    const exists = await SavedPlace.findOne({
      customerId,
      label
    });

    // optional: restrict only one home/work
    if (exists && (label === 'home' || label === 'work')) {
      return res.status(409).json({
        success: false,
        message: `${label} already exists`
      });
    }

    const place = await SavedPlace.create({
      customerId,
      label,
      name,
      address,
      lat,
      lng,
      placeId
    });

    return res.status(201).json({
      success: true,
      message: 'Place saved successfully',
      data: place
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ===============================
// CUSTOMER: GET MY PLACES
// ===============================
exports.getMySavedPlaces = async (req, res) => {
  try {
    const customerId = req.user._id;

    const data = await SavedPlace.find({ customerId })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ===============================
// CUSTOMER: UPDATE PLACE
// ===============================
exports.updateSavedPlace = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
    }

    const place = await SavedPlace.findOne({
      _id: id,
      customerId
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    Object.assign(place, req.body);
    await place.save();

    return res.json({
      success: true,
      message: 'Updated successfully',
      data: place
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ===============================
// CUSTOMER: DELETE PLACE
// ===============================
exports.deleteSavedPlace = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { id } = req.params;

    const deleted = await SavedPlace.findOneAndDelete({
      _id: id,
      customerId
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    return res.json({
      success: true,
      message: 'Deleted successfully'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};



// ===============================
// ADMIN: GET ALL PLACES (PAGINATION + FILTER)
// ===============================
exports.adminGetAllSavedPlaces = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      customerId,
      label
    } = req.query;

    const query = {};

    if (customerId && isValidObjectId(customerId)) {
      query.customerId = customerId;
    }

    if (label) {
      query.label = label;
    }

    const skip = (page - 1) * limit;

    const data = await SavedPlace.find(query)
      .populate('customerId', 'name phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await SavedPlace.countDocuments(query);

    return res.json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ===============================
// ADMIN: DELETE ANY PLACE
// ===============================
exports.adminDeleteSavedPlace = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await SavedPlace.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    return res.json({
      success: true,
      message: 'Deleted by admin'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};