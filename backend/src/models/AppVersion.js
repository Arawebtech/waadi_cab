const mongoose = require('mongoose');

const appVersionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: [true, 'Version is required'],
    unique: true,
    trim: true
  },
  downloadUrl: {
    type: String,
    required: [true, 'Download URL is required'],
    trim: true
  },
  playStoreUrl: {
    type: String,
    trim: true,
    default: 'https://play.google.com/store/apps/details?id=com.MP.Waadi_App'
  },
  releaseNotes: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isForced: {
    type: Boolean,
    default: false,
    description: 'If true, users must update to this version'
  },
  minSupportedVersion: {
    type: String,
    default: '0.1.0',
    description: 'Minimum supported version - older versions will be forced to update'
  },
  platform: {
    type: String,
    enum: ['android', 'ios', 'both'],
    default: 'both'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  fileInfo: {
    fileName: {
      type: String,
      default: ''
    },
    fileSize: {
      type: Number,
      default: 0
    },
    filePath: {
      type: String,
      default: ''
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
appVersionSchema.index({ version: 1, isActive: 1 });
appVersionSchema.index({ platform: 1, isActive: 1 });

// Static method to get latest version
appVersionSchema.statics.getLatestVersion = async function(platform = 'both') {
  try {
    const query = { isActive: true };
    if (platform !== 'both') {
      query.$or = [
        { platform: 'both' },
        { platform: platform }
      ];
    }
    
    const latestVersion = await this.findOne(query)
      .sort({ createdAt: -1, version: -1 })
      .lean();
    
    return latestVersion;
  } catch (error) {
    console.error('Error getting latest version:', error);
    throw error;
  }
};

appVersionSchema.statics.checkUpdateRequired = async function(currentVersion, platform = 'both') {
  try {
    const latestVersion = await this.getLatestVersion(platform);

    if (!latestVersion) {
      return {
        hasUpdate: false,
        updateRequired: false,
        latestVersion: null,
        isForced: false,
        minSupportedVersion: '0.1.0'
      };
    }

    const currentVsLatest = compareVersions(
      currentVersion,
      latestVersion.version
    );

    const minVersion = latestVersion.minSupportedVersion || '0.1.0';
    const currentVsMinimum = compareVersions(
      currentVersion,
      minVersion
    );

    const isBelowMinimum = currentVsMinimum < 0;
    const isBelowLatest = currentVsLatest < 0;
    const isForcedUpdate = isBelowMinimum || (isBelowLatest && Boolean(latestVersion.isForced));

    return {
      // New version available only if current is strictly older than latest
      hasUpdate: isBelowLatest,

      // Force update if below minimum supported version or forced by admin
      updateRequired: isForcedUpdate,

      latestVersion,

      isForced: isForcedUpdate,

      minSupportedVersion: minVersion
    };

  } catch (error) {
    console.error('Error checking update requirement:', error);
    throw error;
  }
};

// Helper function to compare versions
function compareVersions(version1, version2) {
  if (!version1 && !version2) return 0;
  if (!version1) return -1;
  if (!version2) return 1;

  // Clean version strings (remove 'v', leading/trailing whitespace)
  const clean1 = String(version1).trim().replace(/^v/i, '');
  const clean2 = String(version2).trim().replace(/^v/i, '');

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] !== undefined ? parts1[i] : 0;
    const num2 = parts2[i] !== undefined ? parts2[i] : 0;

    if (num1 < num2) {
      return -1; // version1 is older
    } else if (num1 > num2) {
      return 1; // version1 is newer
    }
  }

  return 0; // versions are equal
}

module.exports = mongoose.model('AppVersion', appVersionSchema);

