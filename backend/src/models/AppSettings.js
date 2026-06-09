const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  appStatus: {
    type: String,
    enum: ['online', 'maintenance'],
    default: 'online',
    required: true
  },
  maintenanceMessage: {
    type: String,
    default: 'We are currently under maintenance. We will be back soon!',
    maxlength: 500
  },
  maintenanceTitle: {
    type: String,
    default: 'App Maintenance',
    maxlength: 100
  },
  estimatedReturnTime: {
    type: Date,
    default: null
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isMaintenanceMode: {
    type: Boolean,
    default: false,
    required: true
  },
  platformFee: {
    type: Number,
    default: 20,
    min: 0,
    required: true
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
appSettingsSchema.index({}, { unique: true });

// Static method to get current app settings
appSettingsSchema.statics.getCurrentSettings = async function() {
  try {
    let settings = await this.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = new this({
        appStatus: 'online',
        maintenanceMessage: 'We are currently under maintenance. We will be back soon!',
        maintenanceTitle: 'App Maintenance',
        lastUpdatedBy: new mongoose.Types.ObjectId(), // Create a dummy ObjectId
        isMaintenanceMode: false
      });
      await settings.save();
    }
    
    return settings;
  } catch (error) {
    throw error;
  }
};

// Static method to toggle app status
appSettingsSchema.statics.toggleAppStatus = async function(userId, status, maintenanceData = {}) {
  try {
    let settings = await this.findOne();
    
    if (!settings) {
      settings = new this({
        lastUpdatedBy: userId,
        isMaintenanceMode: status === 'maintenance'
      });
    } else {
      settings.lastUpdatedBy = userId;
      settings.isMaintenanceMode = status === 'maintenance';
    }
    
    settings.appStatus = status;
    
    if (status === 'maintenance' && maintenanceData) {
      if (maintenanceData.message) {
        settings.maintenanceMessage = maintenanceData.message;
      }
      if (maintenanceData.title) {
        settings.maintenanceTitle = maintenanceData.title;
      }
      if (maintenanceData.estimatedReturnTime) {
        settings.estimatedReturnTime = new Date(maintenanceData.estimatedReturnTime);
      }
    }
    
    await settings.save();
    return settings;
  } catch (error) {
    throw error;
  }
};

// Instance method to get formatted settings
appSettingsSchema.methods.getFormattedSettings = function() {
  return {
    id: this._id,
    appStatus: this.appStatus,
    isMaintenanceMode: this.isMaintenanceMode,
    maintenanceMessage: this.maintenanceMessage,
    maintenanceTitle: this.maintenanceTitle,
    estimatedReturnTime: this.estimatedReturnTime,
    platformFee: this.platformFee,
    lastUpdatedBy: this.lastUpdatedBy,
    lastUpdated: this.updatedAt,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('AppSettings', appSettingsSchema);
