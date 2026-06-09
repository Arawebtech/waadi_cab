const User = require('../models/User');
const { validationResult } = require('express-validator');

// Helper function to get time ago string
function getTimeAgo(date) {
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo ago`;
}

// Helper function to get greeting based on time
function getGreeting() {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

class UserController {
  // Get user profile
  async getProfile(req, res) {
    try {
      const user = req.user;

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: user.getPublicProfile()
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user._id;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updates.password;
      delete updates.phoneNumber;
      delete updates.isPhoneVerified;
      delete updates.refreshTokens;

      const user = await User.findByIdAndUpdate(
        userId,
        updates,
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.getPublicProfile()
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  // Add vehicle
  async addVehicle(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user._id;
      const { vehicleNumber, seatCapacity, isDefault } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if vehicle already exists
      const existingVehicle = user.vehicles.find(
        v => v.vehicleNumber === vehicleNumber.toUpperCase()
      );

      if (existingVehicle) {
        return res.status(409).json({
          success: false,
          message: 'Vehicle already exists'
        });
      }

      // If this is set as default, remove default from other vehicles
      if (isDefault) {
        user.vehicles.forEach(vehicle => {
          vehicle.isDefault = false;
        });
      }

      // Add new vehicle
      user.vehicles.push({
        vehicleNumber: vehicleNumber.toUpperCase(),
        seatCapacity,
        isDefault: isDefault || user.vehicles.length === 0 // Make first vehicle default
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: 'Vehicle added successfully',
        data: {
          vehicle: user.vehicles[user.vehicles.length - 1]
        }
      });

    } catch (error) {
      console.error('Add vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add vehicle'
      });
    }
  }

  // Get user vehicles
  async getVehicles(req, res) {
    try {
      const user = req.user;

      res.status(200).json({
        success: true,
        message: 'Vehicles retrieved successfully',
        data: {
          vehicles: user.vehicles,
          total: user.vehicles.length
        }
      });

    } catch (error) {
      console.error('Get vehicles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicles'
      });
    }
  }

  // Update vehicle
  async updateVehicle(req, res) {
    try {
      const { vehicleId } = req.params;
      const updates = req.body;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const vehicle = user.vehicles.id(vehicleId);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // If setting as default, remove default from other vehicles
      if (updates.isDefault) {
        user.vehicles.forEach(v => {
          if (v._id.toString() !== vehicleId) {
            v.isDefault = false;
          }
        });
      }

      // Update vehicle
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          vehicle[key] = updates[key];
        }
      });

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Vehicle updated successfully',
        data: {
          vehicle
        }
      });

    } catch (error) {
      console.error('Update vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update vehicle'
      });
    }
  }

  // Delete vehicle
  async deleteVehicle(req, res) {
    try {
      const { vehicleId } = req.params;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const vehicle = user.vehicles.id(vehicleId);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // Remove vehicle
      user.vehicles.pull(vehicleId);

      // If deleted vehicle was default and there are other vehicles, make first one default
      if (vehicle.isDefault && user.vehicles.length > 0) {
        user.vehicles[0].isDefault = true;
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully'
      });

    } catch (error) {
      console.error('Delete vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete vehicle'
      });
    }
  }

  // Get dashboard data
  async getDashboard(req, res) {
    try {
      const user = req.user;
      const Booking = require('../models/Booking');

      // Get booking statistics
      const stats = await Booking.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      // Get total bookings
      const totalBookings = await Booking.countDocuments({ user: user._id });

      // Get recent bookings
      const recentBookings = await Booking.find({ user: user._id })
        .populate('visiting_state', 'name')
        .select('visiting_state vehicle_number tax_mode amount status createdAt')
        .sort({ createdAt: -1 })
        .limit(5);

      // Format stats
      const bookingStats = {
        total: totalBookings,
        pending: 0,
        paid: 0,
        cancelled: 0,
        totalAmount: 0
      };

      stats.forEach(stat => {
        bookingStats[stat._id] = stat.count;
        bookingStats.totalAmount += stat.totalAmount;
      });

      res.status(200).json({
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: {
          user: {
            name: user.getFullName(),
            phoneNumber: user.phoneNumber,
            userType: user.userType,
            isPhoneVerified: user.isPhoneVerified,
            vehicleCount: user.vehicles.length
          },
          vehicles: user.vehicles,
          bookingStats,
          recentBookings
        }
      });

    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard data'
      });
    }
  }

  // Fetch dashboard - Enhanced version with active passes and recent activity
  async fetchDashboard(req, res) {
    try {
      const user = req.user;
      const Booking = require('../models/Booking');

      const currentDate = new Date();

      // Check if user has any bookings at all
      const totalBookings = await Booking.countDocuments({ user: user._id });
      
      if (totalBookings === 0) {
        // Return empty dashboard for users with no bookings
        return res.status(200).json({
          success: true,
          message: 'Dashboard data fetched successfully',
          data: {
            summary: {
              totalActivePasses: 0,
              totalSpent: 0,
              totalSpentFormatted: '₹0',
              expiringSoonCount: 0
            },
            activePasses: [],
            recentActivity: [],
            user: {
              name: user.getFullName(),
              phoneNumber: user.phoneNumber,
              greeting: getGreeting()
            }
          }
        });
      }

      // Get active passes (paid bookings within validity period)
      const activePasses = await Booking.find({
        user: user._id,
        status: 'paid',
        tax_upto_date: { $gte: currentDate }
      })
      .populate('visiting_state', 'name')
      .select('visiting_state vehicle_number tax_mode amount tax_from_date tax_upto_date bookingId seat_capacity entry_border whatsapp_number createdAt payment_details')
      .sort({ createdAt: -1 });

      // Get recent activity (last 5 booking activities)
      const recentBookings = await Booking.find({ user: user._id })
        .populate('visiting_state', 'name')
        .select('visiting_state vehicle_number tax_mode amount status createdAt updatedAt payment_details bookingId tax_slip_pdf')
        .sort({ updatedAt: -1 })
        .limit(5);

      // Debug: Check if populate worked
      console.log('Recent bookings found:', recentBookings.length);
      if (recentBookings.length > 0) {
        console.log('First booking visiting_state:', recentBookings[0].visiting_state);
        console.log('Sample booking:', JSON.stringify(recentBookings[0], null, 2));
      }

      // Format recent activity with filtering
      const recentActivity = recentBookings
        .filter(booking => booking && booking._id) // Filter out any invalid bookings
        .map(booking => {
          let activityType = '';
          let activityDescription = '';
          let activityTime = booking.updatedAt;

          // Safe access to visiting_state name
          const stateName = booking.visiting_state?.name || 'Unknown State';

          if (booking.status === 'paid') {
            activityType = 'Payment Successful';
            activityDescription = `${stateName} • ₹${booking.amount}`;
            activityTime = booking.payment_details?.paid_at || booking.updatedAt;
          } else if (booking.status === 'pending') {
            activityType = 'Pass Created';
            activityDescription = `${stateName} • Pending Payment`;
          } else if (booking.status === 'cancelled') {
            activityType = 'Pass Cancelled';
            activityDescription = `${stateName} • ₹${booking.amount}`;
          } else {
            activityType = 'Pass Activated';
            activityDescription = `${stateName} • ₹${booking.amount}`;
          }

          return {
            id: booking._id,
            bookingId: booking.bookingId || 'N/A',
            type: activityType,
            description: activityDescription,
            state: stateName,
            amount: booking.amount || 0,
            status: booking.status,
            timestamp: activityTime,
            timeAgo: getTimeAgo(activityTime),
            tax_slip_pdf: booking.tax_slip_pdf
          };
        });

      // Calculate total spent (all paid bookings)
      const totalSpentResult = await Booking.aggregate([
        { 
          $match: { 
            user: user._id, 
            status: 'paid' 
          } 
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' }
          }
        }
      ]);

      const totalSpent = totalSpentResult.length > 0 ? totalSpentResult[0].totalSpent : 0;

      // Format active passes
      const formattedActivePasses = activePasses.map(pass => {
        const daysUntilExpiry = Math.ceil((pass.tax_upto_date - currentDate) / (1000 * 60 * 60 * 24));
        
        return {
          id: pass._id,
          bookingId: pass.bookingId,
          state: pass.visiting_state?.name || 'Unknown State',
          passType: `${pass.tax_mode} Pass`,
          vehicleInfo: `${pass.seat_capacity} Seater`,
          vehicleNumber: pass.vehicle_number,
          entryBorder: pass.entry_border,
          whatsappNumber: pass.whatsapp_number,
          amount: pass.amount,
          validFrom: pass.tax_from_date,
          validUpto: pass.tax_upto_date,
          daysUntilExpiry,
          isExpiringSoon: daysUntilExpiry <= 7,
          status: 'Active',
          paidAt: pass.payment_details?.paid_at
        };
      });

      // Summary statistics
      const summary = {
        totalActivePasses: activePasses.length,
        totalSpent: totalSpent,
        totalSpentFormatted: `₹${totalSpent.toLocaleString('en-IN')}`,
        expiringSoonCount: formattedActivePasses.filter(pass => pass.isExpiringSoon).length
      };

      res.status(200).json({
        success: true,
        message: 'Dashboard data fetched successfully',
        data: {
          summary,
          activePasses: formattedActivePasses,
          recentActivity: recentActivity.slice(0, 5), // Top 5 recent activities
          user: {
            name: user.getFullName(),
            phoneNumber: user.phoneNumber,
            greeting: getGreeting()
          }
        }
      });

    } catch (error) {
      console.error('Fetch dashboard error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new UserController(); 