const Admin = require('../models/Admin');

const createSuperAdmin = async () => {
  try {
    const email = process.env.SUPER_ADMIN_EMAIL;

    if (!email) {
      console.log('❌ SUPER_ADMIN_EMAIL missing');
      return;
    }

    const existingSuperAdmin = await Admin.findOne({
      role: 'super_admin'
    });

    if (existingSuperAdmin) {
      console.log('✅ Super Admin already exists');
      return;
    }

    await Admin.create({
      name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
      role: 'super_admin',
      isActive: true
    });

    console.log('✅ Super Admin created successfully');

  } catch (err) {
    console.error('❌ Super Admin seed error:', err.message);
  }
};

module.exports = createSuperAdmin;