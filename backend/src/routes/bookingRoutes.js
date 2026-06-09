const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

// POST /bookings - Create new booking (requires authentication)
router.post('/', authenticate, bookingController.createBooking);

// GET /bookings - List user's bookings (requires authentication)
router.get('/', authenticate, bookingController.getBookings);

// GET /bookings/stats - Get user's booking statistics (requires authentication)
router.get('/stats', authenticate, bookingController.getUserBookingStats);

// GET /bookings/search/:paymentReference - Search booking by payment reference (public)
router.get('/search/:paymentReference', bookingController.searchBookingByPaymentReference);

// GET /bookings/:id - Get booking details (requires authentication)
router.get('/:id', authenticate, bookingController.getBookingById);

// GET /bookings/:id/pdf - Download tax slip PDF (public)
router.get('/:id/pdf', bookingController.downloadTaxSlipPdf);

// GET /bookings/:id/pdf-info - Get PDF info (public)
router.get('/:id/pdf-info', bookingController.getTaxSlipPdfInfo);

// PATCH /bookings/:id/status - Update booking status (requires authentication)
router.patch('/:id/status', authenticate, bookingController.updateBookingStatus);

// DELETE /bookings/:id - Delete/cancel a booking (requires authentication)
router.delete('/:id', authenticate, bookingController.deleteBooking);

module.exports = router; 