const express = require('express');
const router = express.Router();
const InsuranceInquiry = require('../models/InsuranceInquiry');

// Create inquiry (public)
router.post('/insurance-inquiries', async (req, res) => {
  try {
    const { vehicle_number, phone_number } = req.body;
    if (!vehicle_number || !phone_number) {
      return res.status(400).json({ success: false, message: 'Vehicle number and phone number are required' });
    }
    const inquiry = await InsuranceInquiry.create({ vehicle_number, phone_number });
    // Emit to admin room
    if (global.io) {
      global.io.to('admin-room').emit('insurance:new', { inquiry });
    }
    res.status(201).json({ success: true, message: 'Inquiry submitted', data: inquiry });
  } catch (error) {
    console.error('Create insurance inquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit inquiry' });
  }
});

module.exports = router;


