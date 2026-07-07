const Admin = require('../models/Admin');


// ====================================
// CREATE ADMIN
// ONLY SUPER ADMIN
// ====================================
exports.createAdmin = async (req, res) => {
  try {

    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can create admin'
      });
    }

    const {
      name,
      email,
      password,
      role
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      });
    }

    // prevent creating another super admin
    if (role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Super admin already managed by env'
      });
    }

    const exists = await Admin.findOne({
      email: email.toLowerCase()
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'Admin already exists'
      });
    }

    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password,
      role
    });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// ====================================
// GET ADMINS
// ====================================
exports.getAdmins = async (req, res) => {
  try {

    const {
      page = 1,
      limit = 10,
      role,
      search
    } = req.query;

    const query = {};

    if (role)
      query.role = role;

    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          email: {
            $regex: search,
            $options: 'i'
          }
        }
      ];
    }

    const skip = (page - 1) * limit;

    const admins = await Admin.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Admin.countDocuments(query);

    return res.json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data: admins
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// ====================================
// UPDATE ADMIN
// ====================================
exports.updateAdmin = async (req, res) => {
  try {

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify super admin'
      });
    }

    Object.assign(admin, req.body);

    await admin.save();

    return res.json({
      success: true,
      message: 'Admin updated',
      data: admin
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// ====================================
// TOGGLE STATUS
// ====================================
exports.toggleAdminStatus = async (req, res) => {
  try {

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot disable super admin'
      });
    }

    admin.isActive = !admin.isActive;

    await admin.save();

    return res.json({
      success: true,
      message: 'Status updated',
      data: admin
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// ====================================
// DELETE ADMIN
// ====================================
exports.deleteAdmin = async (req, res) => {
  try {

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete super admin'
      });
    }

    await admin.deleteOne();

    return res.json({
      success: true,
      message: 'Admin deleted'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};