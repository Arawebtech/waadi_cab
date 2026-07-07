const IntercityPackage = require('../models/IntercityPackage');
const AppError = require('../utils/AppError');


exports.createPackage = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      fromCity,
      toCity,
      distanceKm,
      durationHours,
      basePrice,
      vehicleId,
      tripType,
      includesToll,
    } = req.body;

    if (!name || !slug || !fromCity || !toCity || !distanceKm || !basePrice || !tripType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const cleanSlug = slug.toLowerCase().replace(/\s+/g, '-');

    const exists = await IntercityPackage.findOne({ slug: cleanSlug });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Package already exists' });
    }

    const pkg = await IntercityPackage.create({
      name,
      slug: cleanSlug,
      description,
      fromCity,
      toCity,
      distanceKm,
      durationHours,
      basePrice,
      vehicleId,
      tripType,
      includesToll,
    });

    const io = req.app.get('io');
    io?.to('admin:dashboard').emit('intercity:package:created', pkg);

    return res.status(201).json({ success: true, data: pkg });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


exports.getPackages = async (req, res) => {
  try {
    const { page = 1, limit = 10, fromCity, toCity, isActive } = req.query;

    const query = {};

    if (fromCity) query.fromCity = fromCity;
    if (toCity) query.toCity = toCity;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const data = await IntercityPackage.find(query)
      .populate('vehicleId')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await IntercityPackage.countDocuments(query);

    return res.json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * UPDATE PACKAGE
 */
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const pkg = await IntercityPackage.findById(id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.body.slug) {
      req.body.slug = req.body.slug.toLowerCase().replace(/\s+/g, '-');
    }

    const updated = await IntercityPackage.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    const io = req.app.get('io');
    io?.to('admin:dashboard').emit('intercity:package:updated', updated);

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE PACKAGE
 */
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const pkg = await IntercityPackage.findById(id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Not found' });

    await IntercityPackage.findByIdAndDelete(id);

    const io = req.app.get('io');
    io?.to('admin:dashboard').emit('intercity:package:deleted', { id });

    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * TOGGLE ACTIVE
 */
exports.toggleStatus = async (req, res) => {
  try {
    const pkg = await IntercityPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false });

    pkg.isActive = !pkg.isActive;
    await pkg.save();

    return res.json({ success: true, data: pkg });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};