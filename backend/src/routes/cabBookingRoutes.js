const express = require('express');
const rateLimit = require('express-rate-limit');
const CabBooking = require('../models/CabBooking');
const {
  validateQuery,
  validateParams,
  validateBody,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  publicCabBookingsQuery,
  submitInterestBody,
} = require('../validations/cab-booking.validation');

const router = express.Router();

const interestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many interest submissions. Try again later.' },
});

router.get('/cab-bookings', validateQuery(publicCabBookingsQuery), async (req, res) => {
  try {
    const { status, limit } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const items = await CabBooking.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit, 10));
    res.json({ success: true, message: 'Cab bookings retrieved', data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch cab bookings' });
  }
});

router.get('/cab-bookings/:id', validateObjectId('id', 'cab booking ID'), async (req, res) => {
  try {
    const item = await CabBooking.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Cab booking retrieved', data: item });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch cab booking' });
  }
});

router.post(
  '/cab-bookings/:id/interest',
  interestLimiter,
  validateObjectId('id', 'cab booking ID'),
  rejectEmptyBody,
  validateBody(submitInterestBody),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id, phone_number, first_name, last_name } = req.body;

      const existingBooking = await CabBooking.findById(id);
      if (!existingBooking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      const alreadyInterested = (existingBooking.interests || []).some(
        (interest) => interest.user_id?.toString() === user_id
      );

      if (alreadyInterested) {
        return res.status(400).json({
          success: false,
          message: 'You have already expressed interest in this booking',
        });
      }

      const booking = await CabBooking.findByIdAndUpdate(
        id,
        { $push: { interests: { user_id, phone_number, first_name, last_name } } },
        { new: true }
      );

      if (global.io) {
        global.io.to('admin-room').emit('cab:new_interest', {
          bookingId: id,
          user_id,
          phone_number,
          first_name,
          last_name,
        });
      }

      res.json({ success: true, message: 'Interest submitted', data: booking });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Failed to submit interest' });
    }
  }
);

module.exports = router;
