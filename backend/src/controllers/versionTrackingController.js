const User = require('../models/User');

class VersionTrackingController {
  // POST /api/v1/version-track - Track user's app version
  async trackVersion(req, res) {
    try {
      const { userId, appVersion, platform } = req.body;

      if (!userId || !appVersion) {
        return res.status(400).json({
          success: false,
          message: 'User ID and app version are required'
        });
      }

      // Find user by ID or phone number
      let user;
      if (userId.match(/^[0-9a-fA-F]{24}$/)) {
        // It's an ObjectId
        user = await User.findById(userId);
      } else {
        // It's a phone number
        user = await User.findByPhoneNumber(userId);
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update version information
      user.appVersion = appVersion;
      user.platform = platform || 'web';
      user.lastVersionUpdate = new Date();

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Version tracked successfully',
        data: {
          userId: user._id,
          appVersion: user.appVersion,
          platform: user.platform,
          lastVersionUpdate: user.lastVersionUpdate
        }
      });
    } catch (error) {
      console.error('Track version error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track version'
      });
    }
  }

  // GET /api/v1/version-stats - Get version statistics (admin)
  async getVersionStats(req, res) {
    try {
      // Get version distribution
      const versionStats = await User.aggregate([
        {
          $match: {
            appVersion: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$appVersion',
            count: { $sum: 1 },
            platforms: { $addToSet: '$platform' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Get platform distribution
      const platformStats = await User.aggregate([
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Get total users with version info
      const totalUsersWithVersion = await User.countDocuments({
        appVersion: { $exists: true, $ne: null }
      });

      const totalUsers = await User.countDocuments();

      res.status(200).json({
        success: true,
        data: {
          versionStats,
          platformStats,
          totalUsers,
          totalUsersWithVersion,
          coverage: totalUsers > 0 ? (totalUsersWithVersion / totalUsers * 100).toFixed(2) : 0
        }
      });
    } catch (error) {
      console.error('Get version stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get version statistics'
      });
    }
  }

  // GET /api/v1/users-by-version/:version - Get users by specific version (admin)
  async getUsersByVersion(req, res) {
    try {
      const { version } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const users = await User.find({ appVersion: version })
        .select('firstName lastName phoneNumber email appVersion platform lastVersionUpdate createdAt')
        .sort({ lastVersionUpdate: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments({ appVersion: version });

      res.status(200).json({
        success: true,
        data: users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get users by version error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users by version'
      });
    }
  }
}

module.exports = new VersionTrackingController();

