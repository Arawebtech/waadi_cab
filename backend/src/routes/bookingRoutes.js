const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const {
  validateBody,
  validateQuery,
  validateParams,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  createBookingBody,
  bookingsQuery,
  updateBookingStatusBody,
  paymentReferenceParam,
} = require('../validations/booking.validation');

router.post('/', authenticate, rejectEmptyBody, validateBody(createBookingBody), bookingController.createBooking);
router.get('/', authenticate, validateQuery(bookingsQuery), bookingController.getBookings);
router.get('/stats', authenticate, bookingController.getUserBookingStats);
router.get('/search/:paymentReference', validateParams(paymentReferenceParam), bookingController.searchBookingByPaymentReference);
router.get('/:id', authenticate, validateObjectId('id', 'booking ID'), bookingController.getBookingById);
router.get('/:id/pdf', validateObjectId('id', 'booking ID'), bookingController.downloadTaxSlipPdf);
router.get('/:id/pdf-info', validateObjectId('id', 'booking ID'), bookingController.getTaxSlipPdfInfo);
router.patch('/:id/status', authenticate, validateObjectId('id', 'booking ID'), rejectEmptyBody, validateBody(updateBookingStatusBody), bookingController.updateBookingStatus);
router.delete('/:id', authenticate, validateObjectId('id', 'booking ID'), bookingController.deleteBooking);

module.exports = router;
