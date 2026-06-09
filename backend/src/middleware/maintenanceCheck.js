const AppSettings = require('../models/AppSettings');
const notificationService = require('../services/notificationService');

// Middleware to check if app is in maintenance mode
const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Skip maintenance check for admin routes and app status routes
    const skipPaths = [
      '/api/v1/admin',
      '/api/v1/app-status',
      '/api/v1/app-settings-public',
      '/api/v1/app-settings-toggle-public',
      '/api/v1/app-settings-update-maintenance-public',
      '/api/v1/push',
      '/health',
      // Auth and user endpoints should remain available during maintenance
      '/api/v1/auth',
      '/api/v1/app-version'
    ];
    
    const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
    
    if (shouldSkip) {
      return next();
    }

    // Get current app settings
    const settings = await AppSettings.getCurrentSettings();
    
    if (settings.isMaintenanceMode) {
      // Allow most of the app to remain usable. Only block creating new bookings
      // and payment flows while maintenance is ON.
      const isBookingCreationBlocked = (
        req.path.startsWith('/api/v1/bookings') && req.method === 'POST'
      );
      const isPaymentBlocked = req.path.startsWith('/api/v1/payment');

      // Everything else proceeds (login, signup, profile, history, downloads, inquiries, etc.)
      if (!(isBookingCreationBlocked || isPaymentBlocked)) {
        return next();
      }

      // If user is authenticated, send them a maintenance notification
      if (req.user && req.user._id) {
        try {
          await notificationService.sendMaintenanceAlertToUser(req.user._id, settings);
        } catch (notificationError) {
          console.error('Error sending maintenance alert to user:', notificationError);
          // Don't fail the request if notification fails
        }
      }

      return res.status(503).json({
        success: false,
        message: 'App is currently under maintenance',
        data: {
          maintenanceMode: true,
          maintenanceMessage: settings.maintenanceMessage,
          maintenanceTitle: settings.maintenanceTitle,
          estimatedReturnTime: settings.estimatedReturnTime,
          appStatus: settings.appStatus
        }
      });
    }

    next();
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // If there's an error checking maintenance mode, allow the request to proceed
    // This prevents the app from being completely broken if there's a DB issue
    next();
  }
};

module.exports = { checkMaintenanceMode };
