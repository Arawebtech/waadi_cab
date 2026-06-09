const AppSettings = require('../models/AppSettings');
const User = require('../models/User');
const State = require('../models/State');
const mongoose = require('mongoose');

class AppSettingsController {
  // GET /admin/app-settings - Get current app settings
  async getAppSettings(req, res) {
    try {
      const settings = await AppSettings.getCurrentSettings();
      
      res.status(200).json({
        success: true,
        data: settings.getFormattedSettings()
      });
    } catch (error) {
      console.error('Error getting app settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get app settings',
        error: error.message
      });
    }
  }

  // PUT /admin/app-settings/toggle - Toggle app status
  async toggleAppStatus(req, res) {
    try {
      const { status, maintenanceMessage, maintenanceTitle, estimatedReturnTime } = req.body;
      const userId = req.user?._id || new mongoose.Types.ObjectId(); // Use dummy ID for public endpoints

      // Validate status
      if (!status || !['online', 'maintenance'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either "online" or "maintenance"'
        });
      }

      // Validate maintenance data if switching to maintenance mode
      if (status === 'maintenance') {
        if (!maintenanceMessage || !maintenanceTitle) {
          return res.status(400).json({
            success: false,
            message: 'Maintenance message and title are required when switching to maintenance mode'
          });
        }
      }

      const maintenanceData = {
        message: maintenanceMessage,
        title: maintenanceTitle,
        estimatedReturnTime
      };

      const settings = await AppSettings.toggleAppStatus(userId, status, maintenanceData);
      
      // Toggle all states based on app status
      try {
        await this.toggleAllStates(status === 'online');
        console.log(`✅ All states ${status === 'online' ? 'activated' : 'deactivated'} successfully`);
      } catch (stateError) {
        console.error('Error toggling states:', stateError);
        // Don't fail the request if state toggle fails
      }
      
      // If switching to maintenance mode, send notification to all users
      if (status === 'maintenance') {
        try {
          await this.sendMaintenanceNotification(settings);
        } catch (notificationError) {
          console.error('Error sending maintenance notification:', notificationError);
          // Don't fail the request if notification fails
        }
      }

      res.status(200).json({
        success: true,
        message: `App status changed to ${status}`,
        data: settings.getFormattedSettings()
      });
    } catch (error) {
      console.error('Error toggling app status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle app status',
        error: error.message
      });
    }
  }

  // GET /api/app-status - Public endpoint to check app status (for frontend)
  async getAppStatus(req, res) {
    try {
      const settings = await AppSettings.getCurrentSettings();
      
      // Return minimal data for public consumption
      res.status(200).json({
        success: true,
        data: {
          appStatus: settings.appStatus,
          isMaintenanceMode: settings.isMaintenanceMode,
          maintenanceMessage: settings.maintenanceMessage,
          maintenanceTitle: settings.maintenanceTitle,
          estimatedReturnTime: settings.estimatedReturnTime,
          platformFee: settings.platformFee
        }
      });
    } catch (error) {
      console.error('Error getting app status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get app status',
        error: error.message
      });
    }
  }

  // Helper method to toggle all states based on app status
  async toggleAllStates(isActive) {
    try {
      const result = await State.updateMany(
        {}, // Update all states
        { is_active: isActive },
        { new: true }
      );
      
      console.log(`Updated ${result.modifiedCount} states to is_active: ${isActive}`);
      return result;
    } catch (error) {
      console.error('Error toggling all states:', error);
      throw error;
    }
  }

  // Helper method to send maintenance notification
  async sendMaintenanceNotification(settings) {
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.sendMaintenanceNotification(settings);
    } catch (error) {
      console.error('Error in sendMaintenanceNotification:', error);
      throw error;
    }
  }

  // PUT /admin/app-settings/update-maintenance - Update maintenance message without changing status
  async updateMaintenanceMessage(req, res) {
    try {
      const { maintenanceMessage, maintenanceTitle, estimatedReturnTime } = req.body;
      const userId = req.user?._id || new mongoose.Types.ObjectId(); // Use dummy ID for public endpoints

      if (!maintenanceMessage || !maintenanceTitle) {
        return res.status(400).json({
          success: false,
          message: 'Maintenance message and title are required'
        });
      }

      let settings = await AppSettings.findOne();
      
      if (!settings) {
        return res.status(404).json({
          success: false,
          message: 'App settings not found'
        });
      }

      settings.maintenanceMessage = maintenanceMessage;
      settings.maintenanceTitle = maintenanceTitle;
      settings.lastUpdatedBy = userId;
      
      if (estimatedReturnTime) {
        settings.estimatedReturnTime = new Date(estimatedReturnTime);
      }

      await settings.save();

      res.status(200).json({
        success: true,
        message: 'Maintenance message updated successfully',
        data: settings.getFormattedSettings()
      });
    } catch (error) {
      console.error('Error updating maintenance message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update maintenance message',
        error: error.message
      });
    }
  }

  // PUT /admin/app-settings/update-platform-fee - Update platform fee
  async updatePlatformFee(req, res) {
    try {
      const { platformFee } = req.body;
      const userId = req.user?._id || new mongoose.Types.ObjectId(); // Use dummy ID for public endpoints

      if (platformFee === undefined || platformFee === null) {
        return res.status(400).json({
          success: false,
          message: 'Platform fee is required'
        });
      }

      if (typeof platformFee !== 'number' || platformFee < 0) {
        return res.status(400).json({
          success: false,
          message: 'Platform fee must be a non-negative number'
        });
      }

      let settings = await AppSettings.findOne();
      
      if (!settings) {
        return res.status(404).json({
          success: false,
          message: 'App settings not found'
        });
      }

      settings.platformFee = platformFee;
      settings.lastUpdatedBy = userId;

      await settings.save();

      res.status(200).json({
        success: true,
        message: 'Platform fee updated successfully',
        data: settings.getFormattedSettings()
      });
    } catch (error) {
      console.error('Error updating platform fee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update platform fee',
        error: error.message
      });
    }
  }
}

const controller = new AppSettingsController();

module.exports = {
  getAppSettings: controller.getAppSettings.bind(controller),
  toggleAppStatus: controller.toggleAppStatus.bind(controller),
  getAppStatus: controller.getAppStatus.bind(controller),
  updateMaintenanceMessage: controller.updateMaintenanceMessage.bind(controller),
  updatePlatformFee: controller.updatePlatformFee.bind(controller)
};
