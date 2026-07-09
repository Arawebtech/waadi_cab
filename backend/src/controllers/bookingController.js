// const Booking = require('../models/Booking');
// const State = require('../models/State');
// const payuService = require('../services/payuService');
// const path = require('path');
// const fs = require('fs');
// const saveCustomerLog = require('../utils/saveCustomerLog');
// const User = require('../models/User');


// class BookingController {
//   // POST /bookings - Create new booking
//   async createBooking(req, res) {

//     try {
//       const {
//         visiting_state,
//         vehicle_number,
//         seat_capacity,
//         whatsapp_number,
//         entry_border,
//         tax_mode,
//         tax_from_date,
//         tax_upto_date,
//         amount
//       } = req.body;
  
//       if (!visiting_state || !vehicle_number || !seat_capacity || !whatsapp_number ||
//         !entry_border || !tax_mode || !tax_from_date || !tax_upto_date || amount === undefined) {
//         return res.status(400).json({ success: false, message: 'All fields are required' });
//       }
  
//       const state = await State.findById(visiting_state);
//       if (!state) {
//         return res.status(404).json({ success: false, message: 'State not found' });
//       }
  
//       const booking = new Booking({
//         user: req.user._id,
//         visiting_state,
//         vehicle_number,
//         seat_capacity,
//         whatsapp_number,
//         entry_border,
//         tax_mode,
//         tax_from_date,
//         tax_upto_date,
//         amount
//       });
  
//       const savedBooking = await booking.save();
//       await savedBooking.populate([
//         { path: 'visiting_state', select: 'name' },
//         { path: 'user', select: 'firstName lastName phoneNumber email' }
//       ]);

//       await saveCustomerLog({
//   userId: req.user._id,
//   phoneNumber: req.user.phoneNumber,
//   type: "lastBooking",
//   req
// });
  
//       // ========== PayU Payment Integration ==========
//       let paymentData = null;
//       let paymentError = null;
      
//       try {
//         // Validate PayU configuration
//         const configValidation = payuService.validateConfig();
//         if (configValidation.isValid) {
//           // Prepare payment data using PayU service
//           const paymentPreparation = payuService.preparePaymentData(savedBooking, savedBooking.user);
          
//           if (paymentPreparation.success) {
//             // Store transaction ID in booking
//             savedBooking.payment_details.transaction_id = paymentPreparation.paymentData.txnid;
//             await savedBooking.save();

//             // Log transaction initiation
//             payuService.logTransaction('AUTO_INITIATE', {
//               txnid: paymentPreparation.paymentData.txnid,
//               amount: paymentPreparation.paymentData.amount,
//               bookingId: savedBooking.bookingId
//             });

//             paymentData = {
//               paymentUrl: paymentPreparation.paymentUrl,
//               paymentData: paymentPreparation.paymentData,
//               message: "Payment initiated automatically"
//             };
//           } else {
//             paymentError = paymentPreparation.error;
//           }
//         } else {
//           paymentError = 'Payment service configuration error';
//           console.error('PayU configuration errors:', configValidation.errors);
//         }
//       } catch (error) {
//         console.error('Auto payment initiation error:', error);
//         paymentError = 'Failed to initiate payment automatically';
//       }


//       // Emit real-time event to admin dashboard
//       if (global.io) {
//         global.io.to('admin-room').emit('new-booking', {
//           type: 'new-booking',
//           booking: savedBooking,
//           timestamp: new Date().toISOString()
//         });
//         console.log('📡 Emitted new booking event to admin dashboard');
//       }

//       // Construct response
//       const response = {
//         success: true,
//         message: 'Booking created successfully',
//         data: {
//           booking: savedBooking,
//           payment: paymentData,
//           paymentError: paymentError
//         }
//       };

//       res.status(201).json(response);
//     } catch (error) {
//       console.error("Create booking error:", error);
//       res.status(500).json({ success: false, message: "Failed to create booking" });
//     }

//   }

//   // GET /bookings - List bookings with optional filters
//   async getBookings(req, res) {
//     try {
//       const { status, state_id, page = 1, limit = 10, all = false } = req.query;
      
//       // Build filter object
//       let filter = {};
      
//       // By default, show only user's bookings unless 'all' is requested
//       if (!all || all === 'false') {
//         filter.user = req.user._id;
//       }
      
//       if (status) {
//         filter.status = status;
//       }
//       if (state_id) {
//         filter.visiting_state = state_id;
//       }

//       // Pagination
//       const skip = (parseInt(page) - 1) * parseInt(limit);
      
//       const bookings = await Booking.find(filter)
//         .populate([
//           { path: 'visiting_state', select: 'name' },
//           { path: 'user', select: 'firstName lastName phoneNumber' }
//         ])
//         .select('user visiting_state vehicle_number seat_capacity whatsapp_number entry_border tax_mode tax_from_date tax_upto_date amount status createdAt updatedAt')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit));

//       const total = await Booking.countDocuments(filter);

//       res.status(200).json({
//         success: true,
//         message: 'Bookings retrieved successfully',
//         data: bookings,
//         pagination: {
//           total,
//           page: parseInt(page),
//           limit: parseInt(limit),
//           pages: Math.ceil(total / parseInt(limit))
//         }
//       });
//     } catch (error) {
//       console.error('Get bookings error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to retrieve bookings'
//       });
//     }
//   }

//   // GET /bookings/:id - Get booking details
//   async getBookingById(req, res) {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id)
//         .populate([
//           { path: 'visiting_state', select: 'name' },
//           { path: 'user', select: 'firstName lastName phoneNumber' }
//         ]);

//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       // Check if user owns this booking
//       if (booking.user._id.toString() !== req.user._id.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: 'You can only view your own bookings'
//         });
//       }

//       res.status(200).json({
//         success: true,
//         message: 'Booking retrieved successfully',
//         data: booking
//       });
//     } catch (error) {
//       console.error('Get booking by ID error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to retrieve booking'
//       });
//     }
//   }

//   // PATCH /bookings/:id/status - Update booking status
//   async updateBookingStatus(req, res) {
//     try {
//       const { id } = req.params;
//       const { status, payment_method, transaction_id } = req.body;

//       if (!status) {
//         return res.status(400).json({
//           success: false,
//           message: 'Status is required'
//         });
//       }

//       if (!['pending', 'paid', 'cancelled'].includes(status)) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid status. Must be pending, paid, or cancelled'
//         });
//       }

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       const userId =  req.user._id ||  booking.user.toString()

//         const user = await User.findById(userId);

//             await saveCustomerLog({
//   userId: userId,
//   phoneNumber: user.phoneNumber,
//   type: "UpdatelastBooking",
//   req
// });

//       // Check if user owns this booking
//       if (booking.user.toString() !== req.user._id.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: 'You can only update your own bookings'
//         });
//       }

//       booking.status = status;
      
//       // If status is being set to paid, update payment details
//       if (status === 'paid') {
//         if (payment_method) {
//           booking.payment_details.payment_method = payment_method;
//         }
//         if (transaction_id) {
//           booking.payment_details.transaction_id = transaction_id;
//         }
//         // paid_at and payment_reference will be auto-generated in pre-save hook
//       }
      
//       const updatedBooking = await booking.save();
      
//       // Populate state and user information
//       await updatedBooking.populate([
//         { path: 'visiting_state', select: 'name' },
//         { path: 'user', select: 'firstName lastName phoneNumber' }
//       ]);

//       // Emit real-time event to admin dashboard
//       if (global.io) {
//         global.io.to('admin-room').emit('booking-updated', {
//           type: 'booking-updated',
//           booking: updatedBooking,
//           timestamp: new Date().toISOString()
//         });
//         console.log('📡 Emitted booking updated event to admin dashboard');
//       }

//       res.status(200).json({
//         success: true,
//         message: 'Booking status updated successfully',
//         data: updatedBooking
//       });
//     } catch (error) {
//       console.error('Update booking status error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to update booking status'
//       });
//     }
//   }

//   // DELETE /bookings/:id - Delete/cancel a booking
//   async deleteBooking(req, res) {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       // Check if user owns this booking
//       if (booking.user.toString() !== req.user._id.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: 'You can only delete your own bookings'
//         });
//       }

//       await Booking.findByIdAndDelete(id);

//       // Emit real-time event to admin dashboard
//       if (global.io) {
//         global.io.to('admin-room').emit('booking-deleted', {
//           type: 'booking-deleted',
//           bookingId: id,
//           timestamp: new Date().toISOString()
//         });
//         console.log('📡 Emitted booking deleted event to admin dashboard');
//       }

//       res.status(200).json({
//         success: true,
//         message: 'Booking deleted successfully'
//       });
//     } catch (error) {
//       console.error('Delete booking error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to delete booking'
//       });
//     }
//   }

//   // GET /bookings/stats - Get user's booking statistics
//   async getUserBookingStats(req, res) {
//     try {
//       const userId = req.user._id;

//       // Get booking statistics
//       const stats = await Booking.aggregate([
//         { $match: { user: userId } },
//         {
//           $group: {
//             _id: '$status',
//             count: { $sum: 1 },
//             totalAmount: { $sum: '$amount' }
//           }
//         }
//       ]);

//       // Get total bookings
//       const totalBookings = await Booking.countDocuments({ user: userId });

//       // Get recent bookings
//       const recentBookings = await Booking.find({ user: userId })
//         .populate('visiting_state', 'name')
//         .select('visiting_state vehicle_number tax_mode amount status createdAt')
//         .sort({ createdAt: -1 })
//         .limit(5);

//       // Format stats
//       const formattedStats = {
//         total: totalBookings,
//         pending: 0,
//         paid: 0,
//         cancelled: 0,
//         totalAmount: 0
//       };

//       stats.forEach(stat => {
//         formattedStats[stat._id] = stat.count;
//         formattedStats.totalAmount += stat.totalAmount;
//       });

//       res.status(200).json({
//         success: true,
//         message: 'Booking statistics retrieved successfully',
//         data: {
//           stats: formattedStats,
//           recentBookings
//         }
//       });
//     } catch (error) {
//       console.error('Get user booking stats error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to retrieve booking statistics'
//       });
//     }
//   }

//   // GET /bookings/:id/pdf - Download tax slip PDF
//   async downloadTaxSlipPdf(req, res) {
//     try {
//       const { id } = req.params;
      
//       // Public access: fetch by booking id only
//       const booking = await Booking.findById(id);
      
//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       if (!booking.tax_slip_pdf || !booking.tax_slip_pdf.filename) {
//         return res.status(404).json({
//           success: false,
//           message: 'Tax slip PDF not available for this booking'
//         });
//       }

//       const filePath = path.join(__dirname, '../../uploads/tax-slips', booking.tax_slip_pdf.filename);
      
//       // Check if file exists
//       if (!fs.existsSync(filePath)) {
//         return res.status(404).json({
//           success: false,
//           message: 'PDF file not found on server'
//         });
//       }

//       // Set headers for PDF download
//       res.setHeader('Content-Type', 'application/pdf');
//       res.setHeader('Content-Disposition', `attachment; filename="${booking.tax_slip_pdf.original_name}"`);
      
//       // Stream the file
//       const fileStream = fs.createReadStream(filePath);
//       fileStream.pipe(res);
      
//     } catch (error) {
//       console.error('Download tax slip PDF error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to download tax slip PDF'
//       });
//     }
//   }

//   // GET /bookings/:id/pdf-info - Get PDF info without downloading
//   async getTaxSlipPdfInfo(req, res) {
//     try {
//       const { id } = req.params;
      
//       // Public access: fetch by booking id only
//       const booking = await Booking.findById(id);
      
//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       if (!booking.tax_slip_pdf || !booking.tax_slip_pdf.filename) {
//         return res.status(404).json({
//           success: false,
//           message: 'Tax slip PDF not available for this booking'
//         });
//       }

//       res.status(200).json({
//         success: true,
//         message: 'PDF info retrieved successfully',
//         data: {
//           filename: booking.tax_slip_pdf.filename,
//           original_name: booking.tax_slip_pdf.original_name,
//           file_size: booking.tax_slip_pdf.file_size,
//           uploaded_at: booking.tax_slip_pdf.uploaded_at,
//           has_pdf: true
//         }
//       });
      
//     } catch (error) {
//       console.error('Get PDF info error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to get PDF info'
//       });
//     }
//   }

//   // GET /bookings/search/:paymentReference - Search booking by payment reference
//   async searchBookingByPaymentReference(req, res) {
//     try {
//       const { paymentReference } = req.params;

//       console.log('🔍 Search booking by payment reference:', {
//         paymentReference,
//         rawParams: req.params,
//         query: req.query
//       });

//       if (!paymentReference) {
//         console.log('❌ Payment reference is missing');
//         return res.status(400).json({
//           success: false,
//           message: 'Payment reference is required'
//         });
//       }

//       // Search for booking by payment_reference
//       console.log('🔎 Searching with query:', {
//         'payment_details.payment_reference': paymentReference
//       });

//       const booking = await Booking.findOne({
//         'payment_details.payment_reference': paymentReference
//       })
//         .populate('visiting_state', 'name')
//         .populate('user', 'firstName lastName phoneNumber email');

//       console.log('📊 Search result:', {
//         found: !!booking,
//         bookingId: booking?.bookingId,
//         paymentReference: booking?.payment_details?.payment_reference
//       });

//       if (!booking) {
//         // Try to find all bookings with payment details for debugging
//         const allBookingsWithPayment = await Booking.find({
//           'payment_details.payment_reference': { $exists: true, $ne: null }
//         }).select('bookingId payment_details.payment_reference').limit(5);
        
//         console.log('📋 Sample bookings with payment references:', 
//           allBookingsWithPayment.map(b => ({ 
//             bookingId: b.bookingId, 
//             paymentRef: b.payment_details?.payment_reference 
//           }))
//         );

//         return res.status(404).json({
//           success: false,
//           message: 'No booking found with this payment reference',
//           debug: {
//             searchedFor: paymentReference,
//             sampleReferences: allBookingsWithPayment.map(b => b.payment_details?.payment_reference)
//           }
//         });
//       }

//       console.log('✅ Booking found successfully');
//       res.status(200).json({
//         success: true,
//         message: 'Booking found successfully',
//         data: booking
//       });
//     } catch (error) {
//       console.error('❌ Search booking error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to search booking',
//         error: error.message
//       });
//     }
//   }
// }

// module.exports = new BookingController(); 
const Booking = require('../models/Booking');
const State = require('../models/State');
const path = require('path');
const fs = require('fs');
const saveCustomerLog = require('../utils/saveCustomerLog');
const { isAppPlatformRequest } = require('../utils/platformRequest');
const User = require('../models/User');
const gatewayResolver = require('../config/gatewayResolver');
const lifecycle = require('../utils/bookingLifecycleLogger');
const { emitNewBooking, emitBookingUpdated } = require('../utils/socketEvents');


class BookingController {
  // POST /bookings - Create new booking
  async createBooking(req, res) {

    lifecycle.logBookingRequestReceived(req);

    try {
      const {
        visiting_state,
        vehicle_number,
        seat_capacity,
        whatsapp_number,
        entry_border,
        tax_mode,
        tax_from_date,
        tax_upto_date,
        amount
      } = req.body;
  
      if (!visiting_state || !vehicle_number || !seat_capacity || !whatsapp_number ||
        !entry_border || !tax_mode || !tax_from_date || !tax_upto_date || amount === undefined) {
        lifecycle.logBookingValidationFailed(req, 'Missing required fields');
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }
  
      const state = await State.findById(visiting_state);
      if (!state) {
        lifecycle.logBookingValidationFailed(req, 'State not found');
        return res.status(404).json({ success: false, message: 'State not found' });
      }

      lifecycle.logBookingCreationStarted(req);
  
      const booking = new Booking({
        user: req.user._id,
        visiting_state,
        vehicle_number,
        seat_capacity,
        whatsapp_number,
        entry_border,
        tax_mode,
        tax_from_date,
        tax_upto_date,
        amount
      });
  
      const savedBooking = await booking.save();
      await savedBooking.populate([
        { path: 'visiting_state', select: 'name' },
        { path: 'user', select: 'firstName lastName phoneNumber email' }
      ]);

      lifecycle.logBookingCreated(savedBooking, req, { gateway: 'pending' });

      await saveCustomerLog({
  userId: req.user._id,
  phoneNumber: req.user.phoneNumber,
  type: "lastBooking",
  req
});
  
      // ========== Dynamic Payment Gateway Integration ==========
      let paymentData = null;
      let paymentError = null;

      try {
        // ── Step 1: Resolve active gateway from MongoDB + validate .env credentials ──
        const { name: gatewayName, service: gatewayService, isValid, errors } =
          await gatewayResolver.prepareActiveGateway();

        console.log(`💳 Active payment gateway: [${gatewayName}]`);

        if (!isValid) {
          paymentError = `Gateway [${gatewayName}] credentials missing: ${errors.join('; ')}`;
          console.error('❌ Gateway credential validation failed:', errors);

        } else {
          const platform = isAppPlatformRequest(req) ? 'app' : 'web';
          const paymentPreparation = await Promise.resolve(
            gatewayService.preparePaymentData(savedBooking, savedBooking.user, { platform })
          );

          if (paymentPreparation.success) {
            // ── Step 3: Persist transaction/order ID and gateway on the booking ──
            if (gatewayName === 'payu') {
              savedBooking.payment_details.transaction_id = paymentPreparation.paymentData.txnid;
            } else if (gatewayName === 'cashfree') {
              savedBooking.payment_details.transaction_id = paymentPreparation.paymentData.txnid;
            }
            savedBooking.payment_details.payment_method = gatewayName;
            await savedBooking.save();

            // Log transaction initiation
            gatewayService.logTransaction('AUTO_INITIATE', {
              txnid: paymentPreparation.paymentData?.txnid,
              amount: savedBooking.amount,
              bookingId: savedBooking.bookingId,
            });

            // ── Step 5: Build gateway-specific payment response ──
            if (gatewayName === 'payu') {
              paymentData = {
                gateway: 'payu',
                paymentUrl: paymentPreparation.paymentUrl,
                paymentData: paymentPreparation.paymentData,
                message: 'PayU payment initiated',
              };
            } else if (gatewayName === 'cashfree') {
              paymentData = {
                gateway: 'cashfree',
                paymentUrl: paymentPreparation.paymentUrl,
                paymentData: paymentPreparation.paymentData,
                message: 'Cashfree payment initiated',
              };
            }

            lifecycle.logPaymentInitiated({
              booking: savedBooking,
              txnid: paymentPreparation.paymentData?.txnid,
              gateway: gatewayName,
              req,
              payload: paymentData,
            });

          } else {
            paymentError = paymentPreparation.error || 'Payment preparation failed';
            console.error(`❌ [${gatewayName}] preparePaymentData failed:`, paymentPreparation.error);
          }
        }

      } catch (error) {
        console.error('❌ Dynamic gateway payment initiation error:', error);
        paymentError = 'Failed to initiate payment – please try again';
      }


      // Emit real-time event to admin dashboard
      emitNewBooking(savedBooking);
      console.log('📡 Emitted new booking event to admin dashboard');

      // Construct response
      const response = {
        success: true,
        message: 'Booking created successfully',
        data: {
          booking: savedBooking,
          payment: paymentData,
          paymentError: paymentError
        }
      };

      res.status(201).json(response);
    } catch (error) {
      lifecycle.logBookingCreationFailed(req, error);
      console.error("Create booking error:", error);
      res.status(500).json({ success: false, message: "Failed to create booking" });
    }

  }

  // GET /bookings - List bookings with optional filters
  async getBookings(req, res) {
    try {
      const { status, state_id, page = 1, limit = 10, all = false } = req.query;
      
      // Build filter object
      let filter = {};
      
      // By default, show only user's bookings unless 'all' is requested
      if (!all || all === 'false') {
        filter.user = req.user._id;
      }
      
      if (status) {
        filter.status = status;
      }
      if (state_id) {
        filter.visiting_state = state_id;
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const bookings = await Booking.find(filter)
        .populate([
          { path: 'visiting_state', select: 'name' },
          { path: 'user', select: 'firstName lastName phoneNumber' }
        ])
        .select('user visiting_state vehicle_number seat_capacity whatsapp_number entry_border tax_mode tax_from_date tax_upto_date amount status createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Booking.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Bookings retrieved successfully',
        data: bookings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bookings'
      });
    }
  }

  // GET /bookings/:id - Get booking details
  async getBookingById(req, res) {
    try {
      const { id } = req.params;

      const booking = await Booking.findById(id)
        .populate([
          { path: 'visiting_state', select: 'name' },
          { path: 'user', select: 'firstName lastName phoneNumber' }
        ]);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check if user owns this booking
      if (booking.user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own bookings'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Booking retrieved successfully',
        data: booking
      });
    } catch (error) {
      console.error('Get booking by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve booking'
      });
    }
  }

  // PATCH /bookings/:id/status - Update booking status
  async updateBookingStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, payment_method, transaction_id } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      if (!['pending', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be pending, paid, or cancelled'
        });
      }

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      const userId =  req.user._id ||  booking.user.toString()

        const user = await User.findById(userId);

            await saveCustomerLog({
  userId: userId,
  phoneNumber: user.phoneNumber,
  type: "UpdatelastBooking",
  req
});

      // Check if user owns this booking
      if (booking.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own bookings'
        });
      }

      const previousStatus = booking.status;
      booking.status = status;
      
      // If status is being set to paid, update payment details
      if (status === 'paid') {
        if (payment_method) {
          booking.payment_details.payment_method = payment_method;
        }
        if (transaction_id) {
          booking.payment_details.transaction_id = transaction_id;
        }
        // paid_at and payment_reference will be auto-generated in pre-save hook
      }
      
      const updatedBooking = await booking.save();

      lifecycle.logBookingStatusChange(updatedBooking, previousStatus, status, req, {
        payment_method,
        transaction_id,
      });
      
      // Populate state and user information
      await updatedBooking.populate([
        { path: 'visiting_state', select: 'name' },
        { path: 'user', select: 'firstName lastName phoneNumber' }
      ]);

      // Emit real-time event to admin dashboard
      emitBookingUpdated(updatedBooking);
      console.log('📡 Emitted booking updated event to admin dashboard');

      res.status(200).json({
        success: true,
        message: 'Booking status updated successfully',
        data: updatedBooking
      });
    } catch (error) {
      console.error('Update booking status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking status'
      });
    }
  }

  // DELETE /bookings/:id - Delete/cancel a booking
  async deleteBooking(req, res) {
    try {
      const { id } = req.params;

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check if user owns this booking
      if (booking.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own bookings'
        });
      }

      await Booking.findByIdAndDelete(id);

      // Emit real-time event to admin dashboard
      if (global.io) {
        global.io.to('admin-room').emit('booking-deleted', {
          type: 'booking-deleted',
          bookingId: id,
          timestamp: new Date().toISOString()
        });
        console.log('📡 Emitted booking deleted event to admin dashboard');
      }

      res.status(200).json({
        success: true,
        message: 'Booking deleted successfully'
      });
    } catch (error) {
      console.error('Delete booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete booking'
      });
    }
  }

  // GET /bookings/stats - Get user's booking statistics
  async getUserBookingStats(req, res) {
    try {
      const userId = req.user._id;

      // Get booking statistics
      const stats = await Booking.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      // Get total bookings
      const totalBookings = await Booking.countDocuments({ user: userId });

      // Get recent bookings
      const recentBookings = await Booking.find({ user: userId })
        .populate('visiting_state', 'name')
        .select('visiting_state vehicle_number tax_mode amount status createdAt')
        .sort({ createdAt: -1 })
        .limit(5);

      // Format stats
      const formattedStats = {
        total: totalBookings,
        pending: 0,
        paid: 0,
        cancelled: 0,
        totalAmount: 0
      };

      stats.forEach(stat => {
        formattedStats[stat._id] = stat.count;
        formattedStats.totalAmount += stat.totalAmount;
      });

      res.status(200).json({
        success: true,
        message: 'Booking statistics retrieved successfully',
        data: {
          stats: formattedStats,
          recentBookings
        }
      });
    } catch (error) {
      console.error('Get user booking stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve booking statistics'
      });
    }
  }

  // GET /bookings/:id/pdf - Download tax slip PDF
  async downloadTaxSlipPdf(req, res) {
    try {
      const { id } = req.params;
      
      // Public access: fetch by booking id only
      const booking = await Booking.findById(id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (!booking.tax_slip_pdf || !booking.tax_slip_pdf.filename) {
        return res.status(404).json({
          success: false,
          message: 'Tax slip PDF not available for this booking'
        });
      }

      const filePath = path.join(__dirname, '../../uploads/tax-slips', booking.tax_slip_pdf.filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'PDF file not found on server'
        });
      }

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${booking.tax_slip_pdf.original_name}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Download tax slip PDF error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download tax slip PDF'
      });
    }
  }

  // GET /bookings/:id/pdf-info - Get PDF info without downloading
  async getTaxSlipPdfInfo(req, res) {
    try {
      const { id } = req.params;
      
      // Public access: fetch by booking id only
      const booking = await Booking.findById(id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (!booking.tax_slip_pdf || !booking.tax_slip_pdf.filename) {
        return res.status(404).json({
          success: false,
          message: 'Tax slip PDF not available for this booking'
        });
      }

      res.status(200).json({
        success: true,
        message: 'PDF info retrieved successfully',
        data: {
          filename: booking.tax_slip_pdf.filename,
          original_name: booking.tax_slip_pdf.original_name,
          file_size: booking.tax_slip_pdf.file_size,
          uploaded_at: booking.tax_slip_pdf.uploaded_at,
          has_pdf: true
        }
      });
      
    } catch (error) {
      console.error('Get PDF info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get PDF info'
      });
    }
  }

  // GET /bookings/search/:paymentReference - Search booking by payment reference
  async searchBookingByPaymentReference(req, res) {
    try {
      const { paymentReference } = req.params;

      console.log('🔍 Search booking by payment reference:', {
        paymentReference,
        rawParams: req.params,
        query: req.query
      });

      if (!paymentReference) {
        console.log('❌ Payment reference is missing');
        return res.status(400).json({
          success: false,
          message: 'Payment reference is required'
        });
      }

      // Search for booking by payment_reference
      console.log('🔎 Searching with query:', {
        'payment_details.payment_reference': paymentReference
      });

      const booking = await Booking.findOne({
        'payment_details.payment_reference': paymentReference
      })
        .populate('visiting_state', 'name')
        .populate('user', 'firstName lastName phoneNumber email');

      console.log('📊 Search result:', {
        found: !!booking,
        bookingId: booking?.bookingId,
        paymentReference: booking?.payment_details?.payment_reference
      });

      if (!booking) {
        // Try to find all bookings with payment details for debugging
        const allBookingsWithPayment = await Booking.find({
          'payment_details.payment_reference': { $exists: true, $ne: null }
        }).select('bookingId payment_details.payment_reference').limit(5);
        
        console.log('📋 Sample bookings with payment references:', 
          allBookingsWithPayment.map(b => ({ 
            bookingId: b.bookingId, 
            paymentRef: b.payment_details?.payment_reference 
          }))
        );

        return res.status(404).json({
          success: false,
          message: 'No booking found with this payment reference',
          debug: {
            searchedFor: paymentReference,
            sampleReferences: allBookingsWithPayment.map(b => b.payment_details?.payment_reference)
          }
        });
      }

      console.log('✅ Booking found successfully');
      res.status(200).json({
        success: true,
        message: 'Booking found successfully',
        data: booking
      });
    } catch (error) {
      console.error('❌ Search booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search booking',
        error: error.message
      });
    }
  }
}

module.exports = new BookingController();