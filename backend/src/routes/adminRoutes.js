const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const customerLogs = require('../controllers/customerLogsController');
const InsuranceInquiry = require('../models/InsuranceInquiry');
const CabBooking = require('../models/CabBooking');

// Dashboard and Analytics
router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);
router.get('/customer-logs', customerLogs.getLogs);


// Admin Booking Management
router.get('/bookings', adminController.getAllBookings);
router.post('/bookings', adminController.createBooking);
router.put('/bookings/bulk/state-reference', adminController.bulkReplaceStateReference);
router.put('/bookings/:id', adminController.updateBooking);
router.get('/bookings/:id/pdf', adminController.downloadTaxSlipPdf);
router.get('/bookings/:id/pdf-info', adminController.getTaxSlipPdfInfo);
router.post('/bookings/:id/upload-pdf', adminController.uploadTaxSlipPdfMiddleware, adminController.uploadTaxSlipPdf);
// Admin Cab Bookings
router.get('/cab-bookings', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', search = '' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { from_location: { $regex: search, $options: 'i' } },
        { to_location: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CabBooking.countDocuments(filter);
    const pages = Math.ceil(total / parseInt(limit));
    const items = await CabBooking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    res.json({ success: true, message: 'Cab bookings retrieved', data: items, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages } });
  } catch (e) {
    console.error('Admin get cab bookings error:', e);
    res.status(500).json({ success: false, message: 'Failed to retrieve cab bookings' });
  }
});

router.post('/cab-bookings', async (req, res) => {
  try {
    const { from_location, to_location, start_date, trip_type, return_date, notes } = req.body;
    if (!from_location || !to_location || !start_date || !trip_type) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }
    const doc = await CabBooking.create({ from_location, to_location, start_date, trip_type, return_date, notes });
    res.status(201).json({ success: true, message: 'Cab booking created', data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to create cab booking' });
  }
});

router.put('/cab-bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['status', 'assigned_driver_id', 'assigned_driver_phone', 'notes'];
    const updates = {};
    Object.keys(req.body).forEach(k => { if (allowed.includes(k)) updates[k] = req.body[k]; });
    const doc = await CabBooking.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Cab booking updated', data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update cab booking' });
  }
});

// Admin Insurance Inquiries
router.get('/insurance-inquiries', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '', dateFrom = '', dateTo = '' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { vehicle_number: { $regex: search, $options: 'i' } },
        { phone_number: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Date filtering - Use Indian Standard Time (IST) consistently - UTC+5:30
    if (dateFrom || dateTo) {
      const start = dateFrom ? new Date(dateFrom + 'T00:00:00+05:30') : null;
      const end = dateTo ? new Date(dateTo + 'T23:59:59.999+05:30') : null;
      
      filter.createdAt = {};
      if (start) filter.createdAt.$gte = start;
      if (end) filter.createdAt.$lte = end;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await InsuranceInquiry.countDocuments(filter);
    const pages = Math.ceil(total / parseInt(limit));
    const inquiries = await InsuranceInquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.status(200).json({ success: true, message: 'Inquiries retrieved', data: inquiries, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages } });
  } catch (error) {
    console.error('Get insurance inquiries error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve insurance inquiries' });
  }
});

router.put('/insurance-inquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const inquiry = await InsuranceInquiry.findByIdAndUpdate(id, { status }, { new: true });
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.status(200).json({ success: true, message: 'Inquiry updated', data: inquiry });
  } catch (error) {
    console.error('Update insurance inquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to update insurance inquiry' });
  }
});

// Admin User Management  
router.get('/users', adminController.getAllUsers);

// Admin State Management
router.get('/states', adminController.getAllStatesWithStats);

module.exports = router; 