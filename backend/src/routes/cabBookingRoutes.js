const express = require('express');
const router = express.Router();
const CabBooking = require('../models/CabBooking');

// Public: list visible cab bookings (recent, unassigned by default)
router.get('/cab-bookings', async (req, res) => {
  try {
    const { status = 'unassigned', limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const items = await CabBooking.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, message: 'Cab bookings retrieved', data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch cab bookings' });
  }
});

// Public: get single cab booking
router.get('/cab-bookings/:id', async (req, res) => {
  try {
    const item = await CabBooking.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Cab booking retrieved', data: item });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch cab booking' });
  }
});

// Public: driver interest submit
router.post('/cab-bookings/:id/interest', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, phone_number, first_name, last_name } = req.body;
    
    if (!user_id || !phone_number || !first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'User data required' });
    }
    
    // Check if user already expressed interest
    const existingBooking = await CabBooking.findById(id);
    if (!existingBooking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    const alreadyInterested = existingBooking.interests.some(interest => 
      interest.user_id.toString() === user_id
    );
    
    if (alreadyInterested) {
      return res.status(400).json({ success: false, message: 'You have already expressed interest in this booking' });
    }
    
    const booking = await CabBooking.findByIdAndUpdate(
      id,
      { $push: { interests: { user_id, phone_number, first_name, last_name } } },
      { new: true }
    );
    
    // notify admin
    if (global.io) {
      global.io.to('admin-room').emit('cab:new_interest', { 
        bookingId: id, 
        user_id, 
        phone_number, 
        first_name, 
        last_name 
      });
    }
    
    res.json({ success: true, message: 'Interest submitted', data: booking });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to submit interest' });
  }
});

module.exports = router;


