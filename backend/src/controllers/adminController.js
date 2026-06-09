const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const User = require('../models/User');
const State = require('../models/State');
const District = require('../models/District');
const VehicleType = require('../models/VehicleType');
const Plan = require('../models/Plan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const saveCustomerLog = require('../utils/saveCustomerLog');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/tax-slips');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and booking ID
    const bookingId = req.params.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `tax_slip_${bookingId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Only allow PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

class AdminController {
  // GET /admin/dashboard - Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Basic counts
      const totalUsers = await User.countDocuments();
      const totalBookings = await Booking.countDocuments();
      const totalStates = await State.countDocuments({ is_active: true });

      // Booking statistics
      const bookingStats = await Booking.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      // Recent bookings (last 30 days)
      const recentBookings = await Booking.countDocuments({
        createdAt: { $gte: last30Days }
      });

      // Weekly bookings (last 7 days) 
      const weeklyBookings = await Booking.countDocuments({
        createdAt: { $gte: last7Days }
      });

      // Revenue statistics
      const revenueStats = await Booking.aggregate([
        {
          $match: { status: 'paid' }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            averageBookingValue: { $avg: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Monthly revenue trend (last 6 months)
      const monthlyRevenue = await Booking.aggregate([
        {
          $match: {
            status: 'paid',
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 6, 1) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$amount' },
            bookings: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      // Top states by bookings
      const topStates = await Booking.aggregate([
        {
          $lookup: {
            from: 'states',
            localField: 'visiting_state',
            foreignField: '_id',
            as: 'state'
          }
        },
        {
          $unwind: '$state'
        },
        {
          $group: {
            _id: '$state._id',
            stateName: { $first: '$state.name' },
            bookings: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
          }
        },
        {
          $sort: { bookings: -1 }
        },
        {
          $limit: 5
        }
      ]);

      // Tax mode distribution
      const taxModeStats = await Booking.aggregate([
        {
          $group: {
            _id: '$tax_mode',
            count: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Format booking stats
      const formattedBookingStats = {
        total: totalBookings,
        pending: 0,
        paid: 0,
        cancelled: 0,
        totalRevenue: 0
      };

      bookingStats.forEach(stat => {
        formattedBookingStats[stat._id] = stat.count;
        formattedBookingStats.totalRevenue += stat.totalAmount;
      });

      const response = {
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: {
          summary: {
            totalUsers,
            totalBookings,
            totalStates,
            recentBookings,
            weeklyBookings,
            totalRevenue: revenueStats[0]?.totalRevenue || 0,
            averageBookingValue: revenueStats[0]?.averageBookingValue || 0
          },
          bookingStats: formattedBookingStats,
          monthlyRevenue,
          topStates,
          taxModeStats,
          revenueStats: revenueStats[0] || { totalRevenue: 0, averageBookingValue: 0, count: 0 }
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard statistics'
      });
    }
  }

  // GET /admin/bookings - Get all bookings with filters (OPTIMIZED)
  async getAllBookings(req, res) {
    try {
      const startTime = Date.now();
      const {
        page = 1,
        limit = 20,
        search = '',
        status = '',
        processed = '',
        state_id = '',
        state_ids = '', // Support for multiple state IDs
        user = '',
        tax_mode = '',
        date_from = '',
        date_to = '',
        date_on = 'createdAt',
        sort_by = 'createdAt',
        sort_order = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};

      if (search) {
        // Enhanced search to include phone numbers, vehicle numbers, and payment details
        const searchRegex = { $regex: search, $options: 'i' };
        
        console.log('🔍 Admin search query:', {
          searchTerm: search,
          searchRegex: searchRegex
        });
        
        filter.$or = [
          // Booking ID search
          { bookingId: searchRegex },
          // Vehicle number search
          { vehicle_number: searchRegex },
          // WhatsApp number search (from booking)
          { whatsapp_number: searchRegex },
          // User phone number search (from populated user)
          { 'user.phoneNumber': searchRegex },
          // User name search
          { 'user.firstName': searchRegex },
          { 'user.lastName': searchRegex },
          // Payment reference search
          { 'payment_details.payment_reference': searchRegex },
          // Transaction ID search
          { 'payment_details.transaction_id': searchRegex }
        ];
      }

      if (status) filter.status = status;
      if (processed !== '') filter.processed_by_admin = processed === 'true';
      
      // Handle state filtering - support both single state_id and multiple state_ids
      if (state_ids) {
        // Multiple states - convert comma-separated string to array
        const stateIdArray = state_ids.split(',').map(id => id.trim()).filter(id => id);
        if (stateIdArray.length > 0) {
          // Convert string IDs to ObjectIds
          const mongoose = require('mongoose');
          const objectIdArray = stateIdArray.map(id => {
            try {
              return new mongoose.Types.ObjectId(id);
            } catch (error) {
              console.error('❌ Invalid ObjectId:', id, error.message);
              return null;
            }
          }).filter(id => id !== null);
          
          if (objectIdArray.length > 0) {
            filter.visiting_state = { $in: objectIdArray };
          }
          
          console.log('🔍 States filter applied:', `${objectIdArray.length} states selected`);
        }
      } else if (state_id) {
        // Single state (backward compatibility)
        try {
          const mongoose = require('mongoose');
          filter.visiting_state = new mongoose.Types.ObjectId(state_id);
          console.log('🔍 Single state filter applied:', state_id);
        } catch (error) {
          console.error('❌ Invalid ObjectId:', state_id, error.message);
        }
      }
      
      if (user) filter.user = user;
      if (tax_mode) filter.tax_mode = tax_mode;

      if (date_from || date_to) {
        // Use Indian Standard Time (IST) consistently - UTC+5:30
        const start = date_from ? new Date(date_from + 'T00:00:00+05:30') : null;
        const end = date_to ? new Date(date_to + 'T23:59:59.999+05:30') : null;
        
        if (date_on === 'tax') {
          // Filter by tax_from_date when requested
          filter.tax_from_date = {};
          if (start) filter.tax_from_date.$gte = start;
          if (end) filter.tax_from_date.$lte = end;
        } else {
          // Default to createdAt
          filter.createdAt = {};
          if (start) filter.createdAt.$gte = start;
          if (end) filter.createdAt.$lte = end;
        }
      }

      // Build sort object - optimize for common sort patterns
      const sort = {};
      if (sort_by === 'createdAt' && sort_order === 'desc') {
        // Use compound index for better performance
        sort.createdAt = -1;
        sort._id = -1; // Secondary sort for consistency
      } else {
        sort[sort_by] = sort_order === 'desc' ? -1 : 1;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      // Log filter summary for debugging
      if (Object.keys(filter).length > 0) {
        console.log('🔍 Filter applied:', Object.keys(filter).join(', '));
      }

      // Use aggregation pipeline for better performance with complex queries
      const pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData',
            pipeline: [{ $project: { firstName: 1, lastName: 1, phoneNumber: 1, email: 1 } }]
          }
        },
        {
          $lookup: {
            from: 'states',
            localField: 'visiting_state',
            foreignField: '_id',
            as: 'stateData',
            pipeline: [{ $project: { name: 1 } }]
          }
        },
        {
          $addFields: {
            visiting_state_id: '$visiting_state',
            user: { $arrayElemAt: ['$userData', 0] },
            visiting_state: { $arrayElemAt: ['$stateData', 0] }
          }
        },
        { $unset: ['userData', 'stateData'] },
        { $sort: sort },
        { $skip: skip },
        { $limit: limitNum }
      ];

      // Execute aggregation and count in parallel
      const [bookings, total] = await Promise.all([
        Booking.aggregate(pipeline),
        Booking.countDocuments(filter)
      ]);

      const pages = Math.ceil(total / limitNum);
      const queryTime = Date.now() - startTime;

      // Log query performance
      if (bookings.length === 0 && total > 0) {
        console.log('⚠️  Warning: Count mismatch -', total, 'total but 0 results returned');
      }

      console.log(`📊 Admin bookings query: ${queryTime}ms, ${bookings.length} results, page ${page}/${pages}`);

      res.status(200).json({
        success: true,
        message: 'Bookings retrieved successfully',
        data: bookings,
        pagination: {
          total,
          page: parseInt(page),
          limit: limitNum,
          pages
        },
        performance: {
          queryTime: `${queryTime}ms`,
          resultsCount: bookings.length
        }
      });
    } catch (error) {
      console.error('Error getting all bookings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bookings',
        error: error.message
      });
    }
  }

  // POST /admin/bookings - Create new booking (admin)
  async createBooking(req, res) {
    try {
      const {
        user_id,
        visiting_state,
        vehicle_number,
        seat_capacity,
        whatsapp_number,
        entry_border,
        tax_mode,
        tax_from_date,
        tax_upto_date,
        amount,
        status = 'pending'
      } = req.body;

      // Validate required fields
      if (!user_id || !visiting_state || !vehicle_number || !amount) {
        return res.status(400).json({
          success: false,
          message: 'User ID, visiting state, vehicle number, and amount are required'
        });
      }

      // Check if user exists
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if state exists
      const state = await State.findById(visiting_state);
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      // Create booking
      const booking = new Booking({
        user: user_id,
        visiting_state,
        vehicle_number,
        seat_capacity,
        whatsapp_number,
        entry_border,
        tax_mode,
        tax_from_date,
        tax_upto_date,
        amount,
        status
      });


                  await saveCustomerLog({
        userId: user_id || user?._id,
        phoneNumber: user.phoneNumber,
        type: "lastBooking",
        req
      });

      await booking.save();

      // Populate user and state for response
      await booking.populate('user', 'firstName lastName phoneNumber email');
      await booking.populate('visiting_state', 'name');

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message
      });
    }
  }

  // PUT /admin/bookings/:id - Update booking status
  async updateBooking(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log('🔄 Admin updating booking:', { id, updates });

      // Allowed fields for admin update
      const allowedUpdates = [
        'status',
        'amount',
        'tax_mode',
        'tax_from_date',
        'tax_upto_date',
        'visiting_state',
        'processed_by_admin',
        'payment_details.payment_method',
        'payment_details.transaction_id'
      ];

      // Filter updates to only allowed fields
      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key) || key.startsWith('payment_details.')) {
          filteredUpdates[key] = updates[key];
        }
      });

      console.log('📝 Filtered updates:', filteredUpdates);

      // Validate visiting state if it is being updated
      if (Object.prototype.hasOwnProperty.call(filteredUpdates, 'visiting_state')) {
        if (!filteredUpdates.visiting_state) {
          return res.status(400).json({
            success: false,
            message: 'visiting_state cannot be empty'
          });
        }

        const stateExists = await State.exists({ _id: filteredUpdates.visiting_state });
        if (!stateExists) {
          return res.status(400).json({
            success: false,
            message: 'Invalid visiting_state'
          });
        }
      }

      const booking = await Booking.findByIdAndUpdate(
        id,
        filteredUpdates,
        { new: true, runValidators: true }
      ).populate([
        { path: 'visiting_state', select: 'name' },
        { path: 'user', select: 'firstName lastName phoneNumber email' }
      ]);

      if (!booking) {
        console.log('❌ Booking not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      console.log('✅ Booking updated successfully:', {
        bookingId: booking.bookingId,
        processed_by_admin: booking.processed_by_admin
      });

      res.status(200).json({
        success: true,
        message: 'Booking updated successfully',
        data: booking
      });
    } catch (error) {
      console.error('Update booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking'
      });
    }
  }

  // PUT /admin/bookings/bulk/state-reference - Replace state reference in bulk
  async bulkReplaceStateReference(req, res) {
    try {
      const { source_state_id, target_state_id } = req.body;

      if (!source_state_id || !target_state_id) {
        return res.status(400).json({
          success: false,
          message: 'source_state_id and target_state_id are required'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(source_state_id) || !mongoose.Types.ObjectId.isValid(target_state_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid state id format'
        });
      }

      const targetStateExists = await State.exists({ _id: target_state_id });
      if (!targetStateExists) {
        return res.status(400).json({
          success: false,
          message: 'Target state does not exist'
        });
      }

      const sourceObjectId = new mongoose.Types.ObjectId(source_state_id);
      const targetObjectId = new mongoose.Types.ObjectId(target_state_id);

      const result = await Booking.updateMany(
        { visiting_state: sourceObjectId },
        { $set: { visiting_state: targetObjectId } }
      );

      res.status(200).json({
        success: true,
        message: `Updated ${result.modifiedCount || 0} booking(s)`,
        data: {
          matched: result.matchedCount || 0,
          modified: result.modifiedCount || 0
        }
      });
    } catch (error) {
      console.error('Bulk replace state reference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk replace state reference'
      });
    }
  }

  // GET /admin/users - Get all users with admin filters
  async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        sort_by = 'createdAt',
        sort_order = 'desc',
        date_from,
        date_to,
        min_bookings,
        after_id,
        after_sort_value
      } = req.query;

      const limitNum = parseInt(limit, 10);
      const pageNum = parseInt(page, 10);
      const hasMinBookings = min_bookings && parseInt(min_bookings, 10) > 0;
      const sortNeedsBookingStats = ['bookingCount', 'totalSpent'].includes(sort_by);

      // Build filter
      const filter = {};

      // Search filter
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Date range filter
      if (date_from || date_to) {
        filter.createdAt = {};
        if (date_from) filter.createdAt.$gte = new Date(date_from);
        if (date_to) filter.createdAt.$lte = new Date(date_to);
      }

      // Stable sort (tie-break on _id) — required for cursor pagination
      const sortObj = {};
      sortObj[sort_by] = sort_order === 'desc' ? -1 : 1;
      sortObj._id = sort_order === 'desc' ? -1 : 1;

      // Only pull fields needed for counts/sums — full booking docs can exceed memory/time on export
      const bookingLookupStages = [
        {
          $lookup: {
            from: 'bookings',
            let: { userId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$user', '$$userId'] } } },
              { $project: { _id: 0, status: 1, amount: 1 } }
            ],
            as: 'bookings'
          }
        },
        {
          $addFields: {
            bookingCount: { $size: '$bookings' },
            totalSpent: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$bookings',
                      cond: { $eq: ['$$this.status', 'paid'] }
                    }
                  },
                  as: 'booking',
                  in: '$$booking.amount'
                }
              }
            }
          }
        },
        {
          $project: {
            password: 0,
            refreshTokens: 0,
            bookings: 0
          }
        }
      ];

      let usersWithStats;

      if (hasMinBookings) {
        // Must compute booking counts before filtering — expensive on large sets
        const pipeline = [
          { $match: filter },
          ...bookingLookupStages,
          { $match: { bookingCount: { $gte: parseInt(min_bookings, 10) } } },
          { $sort: sortObj },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum }
        ];
        usersWithStats = await User.aggregate(pipeline, {
          allowDiskUse: true,
          maxTimeMS: 180000
        });
      } else if (sortNeedsBookingStats) {
        // Sort uses computed fields — full pipeline (slow at high offsets; avoid for bulk export)
        const pipeline = [
          { $match: filter },
          ...bookingLookupStages,
          { $sort: sortObj },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum }
        ];
        usersWithStats = await User.aggregate(pipeline, {
          allowDiskUse: true,
          maxTimeMS: 180000
        });
      } else {
        // Paginate users first, then lookup bookings only for this page (fast at high offsets)
        let matchFilter = { ...filter };

        const useCursor = Boolean(after_id && after_sort_value !== undefined && after_sort_value !== '');
        if (useCursor) {
          let oid;
          try {
            oid = new mongoose.Types.ObjectId(after_id);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'Invalid after_id'
            });
          }

          let sortVal = after_sort_value;
          if (sort_by === 'createdAt' || sort_by === 'updatedAt' || String(sort_by).endsWith('At')) {
            sortVal = new Date(after_sort_value);
          } else if (sort_by === 'bookingCount' || sort_by === 'totalSpent') {
            sortVal = parseFloat(after_sort_value);
            if (Number.isNaN(sortVal)) sortVal = after_sort_value;
          }

          const cursorBranch =
            sort_order === 'desc'
              ? {
                  $or: [
                    { [sort_by]: { $lt: sortVal } },
                    { $and: [{ [sort_by]: sortVal }, { _id: { $lt: oid } }] }
                  ]
                }
              : {
                  $or: [
                    { [sort_by]: { $gt: sortVal } },
                    { $and: [{ [sort_by]: sortVal }, { _id: { $gt: oid } }] }
                  ]
                };

          matchFilter = Object.keys(matchFilter).length
            ? { $and: [matchFilter, cursorBranch] }
            : cursorBranch;
        }

        const pipeline = [{ $match: matchFilter }, { $sort: sortObj }];

        if (!useCursor) {
          const skip = (pageNum - 1) * limitNum;
          pipeline.push({ $skip: skip });
        }
        pipeline.push({ $limit: limitNum });
        pipeline.push(...bookingLookupStages);

        usersWithStats = await User.aggregate(pipeline, {
          allowDiskUse: true,
          maxTimeMS: 180000
        });
      }

      // Get total count for pagination
      let total;
      if (hasMinBookings) {
        const countPipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'bookings',
              let: { userId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$user', '$$userId'] } } },
                { $project: { _id: 1 } }
              ],
              as: 'bookings'
            }
          },
          {
            $addFields: {
              bookingCount: { $size: '$bookings' }
            }
          },
          { $match: { bookingCount: { $gte: parseInt(min_bookings, 10) } } },
          { $count: 'total' }
        ];
        const countResult = await User.aggregate(countPipeline, {
          allowDiskUse: true,
          maxTimeMS: 60000
        });
        total = countResult.length > 0 ? countResult[0].total : 0;
      } else {
        total = await User.countDocuments(filter);
      }

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: usersWithStats,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users'
      });
    }
  }

  // GET /admin/states - Get all states with districts and stats
  async getAllStatesWithStats(req, res) {
    try {
      const states = await State.find()
        .sort({ name: 1 })
        .lean();

      // Add stats for each state
      const statesWithStats = await Promise.all(
        states.map(async (state) => {
          const bookingCount = await Booking.countDocuments({ visiting_state: state._id });
          const districtCount = await District.countDocuments({ state_id: state._id });
          const vehicleTypeCount = await VehicleType.countDocuments({ state_id: state._id });
          
          const revenue = await Booking.aggregate([
            { $match: { visiting_state: state._id, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]);

          return {
            ...state,
            bookingCount,
            districtCount,
            vehicleTypeCount,
            totalRevenue: revenue[0]?.total || 0
          };
        })
      );

      res.status(200).json({
        success: true,
        message: 'States retrieved successfully',
        data: statesWithStats
      });
    } catch (error) {
      console.error('Get all states error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve states'
      });
    }
  }

  // GET /admin/analytics - Get detailed analytics
  async getAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      let dateFilter = {};
      const now = new Date();
      
      switch (period) {
        case '7d':
          dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
          break;
        case '30d':
          dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
          break;
        case '90d':
          dateFilter = { createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
          break;
        case '1y':
          dateFilter = { createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()) } };
          break;
      }

      // Daily bookings trend
      const dailyTrend = await Booking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            bookings: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Rush hour analytics - bookings by hour of day (using UTC hour, will be adjusted in frontend if needed)
      const rushHourStats = await Booking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            bookings: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Fill in missing hours with 0
      const rushHourMap = {};
      rushHourStats.forEach(stat => {
        rushHourMap[stat._id] = stat;
      });
      const completeRushHour = [];
      for (let hour = 0; hour < 24; hour++) {
        completeRushHour.push({
          hour: hour,
          hourLabel: `${hour.toString().padStart(2, '0')}:00`,
          bookings: rushHourMap[hour]?.bookings || 0,
          revenue: rushHourMap[hour]?.revenue || 0
        });
      }

      // Day-wise hour analytics - bookings by day of week and hour
      const dayWiseHourStats = await Booking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              dayOfWeek: { $dayOfWeek: '$createdAt' },
              hour: { $hour: '$createdAt' }
            },
            bookings: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
          }
        },
        { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } }
      ]);

      // Format day-wise hour data - create a complete matrix
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayWiseHourMap = {};
      dayWiseHourStats.forEach(stat => {
        const day = stat._id.dayOfWeek;
        const hour = stat._id.hour;
        if (!dayWiseHourMap[day]) {
          dayWiseHourMap[day] = {};
        }
        dayWiseHourMap[day][hour] = {
          bookings: stat.bookings,
          revenue: stat.revenue
        };
      });

      // Create complete matrix with all days and hours
      const dayWiseHourComplete = [];
      for (let day = 1; day <= 7; day++) {
        const dayData = {
          day: day,
          dayName: dayNames[day - 1],
          hours: []
        };
        for (let hour = 0; hour < 24; hour++) {
          dayData.hours.push({
            hour: hour,
            hourLabel: `${hour.toString().padStart(2, '0')}:00`,
            bookings: dayWiseHourMap[day]?.[hour]?.bookings || 0,
            revenue: dayWiseHourMap[day]?.[hour]?.revenue || 0
          });
        }
        dayWiseHourComplete.push(dayData);
      }

      // State-wise analytics with detailed breakdown
      const stateWiseStats = await Booking.aggregate([
        { $match: dateFilter },
        {
          $lookup: {
            from: 'states',
            localField: 'visiting_state',
            foreignField: '_id',
            as: 'state'
          }
        },
        { $unwind: '$state' },
        {
          $group: {
            _id: '$state._id',
            stateName: { $first: '$state.name' },
            bookings: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
            paidBookings: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
            pendingBookings: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            averageAmount: { $avg: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', null] } }
          }
        },
        { $sort: { bookings: -1 } }
      ]);

      // Average booking completion time (time from creation to processed_by_admin)
      const bookingCompletionTime = await Booking.aggregate([
        { 
          $match: { 
            ...dateFilter,
            processed_by_admin: true,
            updatedAt: { $exists: true }
          } 
        },
        {
          $project: {
            createdAt: 1,
            updatedAt: 1,
            completionTime: {
              $subtract: ['$updatedAt', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            averageCompletionTime: { $avg: '$completionTime' },
            minCompletionTime: { $min: '$completionTime' },
            maxCompletionTime: { $max: '$completionTime' },
            totalProcessed: { $sum: 1 }
          }
        }
      ]);

      // Booking completion time by day of week
      const completionTimeByDay = await Booking.aggregate([
        { 
          $match: { 
            ...dateFilter,
            processed_by_admin: true,
            updatedAt: { $exists: true }
          } 
        },
        {
          $project: {
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            completionTime: {
              $subtract: ['$updatedAt', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: '$dayOfWeek',
            averageCompletionTime: { $avg: '$completionTime' },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Vehicle type popularity
      const vehicleTypeStats = await Booking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$seat_capacity',
            count: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Tax mode distribution
      const taxModeStats = await Booking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$tax_mode',
            count: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // User acquisition
      const userAcquisition = await User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Conversion rate (paid vs total bookings)
      const conversionStats = await Booking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            paidBookings: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
            pendingBookings: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
          }
        }
      ]);

      // Revenue trends
      const revenueTrend = await Booking.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: 'paid'
          } 
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            revenue: { $sum: '$amount' },
            bookings: { $sum: 1 },
            averageAmount: { $avg: '$amount' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Top performing states by revenue
      const topStatesByRevenue = await Booking.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: 'paid'
          } 
        },
        {
          $lookup: {
            from: 'states',
            localField: 'visiting_state',
            foreignField: '_id',
            as: 'state'
          }
        },
        { $unwind: '$state' },
        {
          $group: {
            _id: '$state._id',
            stateName: { $first: '$state.name' },
            revenue: { $sum: '$amount' },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]);

      // Processed vs unprocessed bookings
      const processingStats = await Booking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$processed_by_admin',
            count: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
          }
        }
      ]);

      const completionTimeData = bookingCompletionTime[0] || {
        averageCompletionTime: 0,
        minCompletionTime: 0,
        maxCompletionTime: 0,
        totalProcessed: 0
      };

      // Convert milliseconds to hours for better readability
      const formatCompletionTime = (ms) => {
        if (!ms) return 0;
        return Math.round((ms / (1000 * 60 * 60)) * 100) / 100; // Convert to hours with 2 decimal places
      };

      const conversionData = conversionStats[0] || {
        totalBookings: 0,
        paidBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0
      };

      res.status(200).json({
        success: true,
        message: 'Analytics retrieved successfully',
        data: {
          period,
          dailyTrend,
          rushHourStats: completeRushHour,
          dayWiseHourStats: dayWiseHourComplete,
          stateWiseStats,
          bookingCompletionTime: {
            averageHours: formatCompletionTime(completionTimeData.averageCompletionTime),
            minHours: formatCompletionTime(completionTimeData.minCompletionTime),
            maxHours: formatCompletionTime(completionTimeData.maxCompletionTime),
            totalProcessed: completionTimeData.totalProcessed,
            completionTimeByDay: completionTimeByDay.map(item => ({
              day: item._id,
              dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item._id - 1],
              averageHours: formatCompletionTime(item.averageCompletionTime),
              bookings: item.bookings
            }))
          },
          vehicleTypeStats,
          taxModeStats,
          userAcquisition,
          conversionRate: {
            totalBookings: conversionData.totalBookings,
            paidBookings: conversionData.paidBookings,
            pendingBookings: conversionData.pendingBookings,
            cancelledBookings: conversionData.cancelledBookings,
            conversionPercentage: conversionData.totalBookings > 0 
              ? Math.round((conversionData.paidBookings / conversionData.totalBookings) * 100 * 100) / 100 
              : 0
          },
          revenueTrend,
          topStatesByRevenue,
          processingStats: {
            processed: processingStats.find(s => s._id === true)?.count || 0,
            unprocessed: processingStats.find(s => s._id === false || s._id === null)?.count || 0,
            processedRevenue: processingStats.find(s => s._id === true)?.revenue || 0,
            unprocessedRevenue: processingStats.find(s => s._id === false || s._id === null)?.revenue || 0
          }
        }
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analytics'
      });
    }
  }

  // GET /admin/bookings/:id/pdf - Download tax slip PDF
  async downloadTaxSlipPdf(req, res) {
    try {
      const { id } = req.params;
      
      const booking = await Booking.findById(id).populate('user', 'firstName lastName phoneNumber');
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (!booking.tax_slip_pdf || !booking.tax_slip_pdf.file_path) {
        return res.status(404).json({
          success: false,
          message: 'Tax slip PDF not found for this booking'
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

  // POST /admin/bookings/:id/upload-pdf - Upload tax slip PDF
  async uploadTaxSlipPdf(req, res) {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No PDF file provided'
        });
      }

      const booking = await Booking.findById(id).populate('user', 'firstName lastName phoneNumber whatsapp_number');
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Delete old PDF if exists
      if (booking.tax_slip_pdf && booking.tax_slip_pdf.filename) {
        const oldFilePath = path.join(__dirname, '../../uploads/tax-slips', booking.tax_slip_pdf.filename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Update booking with new PDF information
      booking.tax_slip_pdf = {
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        uploaded_at: new Date(),
        uploaded_by: req.user?.id || null
      };

      await booking.save();

      // Send push notification to customer
      try {
        const notificationService = require('../services/notificationService');
        const user = booking.user || (await User.findById(booking.user));

        if (user && user.fcmToken) {
          const admin = require('firebase-admin');
          const msg = {
            token: user.fcmToken,
            notification: {
              title: 'Tax Slip Ready',
              body: `Your tax slip for booking ${booking.bookingId} is ready to download.`,
            },
            data: {
              type: 'tax_slip_ready',
              bookingId: String(booking._id),
            },
            android: { notification: { channelId: 'wadi-cab-alerts', priority: 'high' } },
          };
          await admin.messaging().send(msg);
          console.log(`✅ Push notification sent to user ${user._id} for booking ${booking.bookingId}`);
        } else {
          console.log('ℹ️ User has no FCM token; skipping push notification');
        }
      } catch (pushError) {
        console.error('❌ Failed to send push notification:', pushError);
        // Don't fail the upload if push fails
      }

      res.status(200).json({
        success: true,
        message: 'Tax slip PDF uploaded successfully',
        data: {
          filename: req.file.filename,
          original_name: req.file.originalname,
          file_size: req.file.size,
          uploaded_at: booking.tax_slip_pdf.uploaded_at
        }
      });
      
    } catch (error) {
      console.error('Upload tax slip PDF error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload tax slip PDF'
      });
    }
  }

  // GET /admin/bookings/:id/pdf-info - Get PDF info without downloading
  async getTaxSlipPdfInfo(req, res) {
    try {
      const { id } = req.params;

   
      
      const booking = await Booking.findById(id).populate('user', 'firstName lastName phoneNumber');
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (!booking.tax_slip_pdf || !booking.tax_slip_pdf.filename) {
        return res.status(404).json({
          success: false,
          message: 'Tax slip PDF not found for this booking'
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
}

module.exports = new AdminController();

// Export the upload middleware for use in routes
module.exports.uploadTaxSlipPdfMiddleware = upload.single('tax_slip_pdf'); 