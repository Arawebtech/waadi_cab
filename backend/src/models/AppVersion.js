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
      .sort({ version: -1 })
      .lean();
    
    return latestVersion;
  } catch (error) {
    console.error('Error getting latest version:', error);
    throw error;
  }
};

// Static method to check if update is required
// appVersionSchema.statics.checkUpdateRequired = async function(currentVersion, platform = 'both') {
//   try {
//     const latestVersion = await this.getLatestVersion(platform);
    
//     if (!latestVersion) {
//       return { updateRequired: false, latestVersion: null };
//     }
    
//     const comparison = compareVersions(currentVersion, latestVersion.version);
    
//     return {
//       updateRequired: comparison < 0 || latestVersion.isForced,
//       latestVersion: latestVersion,
//       isForced: latestVersion.isForced,
//       minSupportedVersion: latestVersion.minSupportedVersion
//     };
//   } catch (error) {
//     console.error('Error checking update requirement:', error);
//     throw error;
//   }
// };

appVersionSchema.statics.checkUpdateRequired = async function(currentVersion, platform = 'both') {
  try {
    const latestVersion = await this.getLatestVersion(platform);

    if (!latestVersion) {
      return {
        updateRequired: false,
        latestVersion: null
      };
    }

    const currentVsLatest = compareVersions(
      currentVersion,
      latestVersion.version
    );

    const currentVsMinimum = compareVersions(
      currentVersion,
      latestVersion.minSupportedVersion
    );

    return {
      // New version available
      hasUpdate: currentVsLatest < 0,

      // Force update only if below minimum supported version
      updateRequired:
        currentVsMinimum < 0 ||
        (currentVsLatest < 0 && latestVersion.isForced),

      latestVersion,

      isForced:
        currentVsMinimum < 0 ||
        latestVersion.isForced,

      minSupportedVersion: latestVersion.minSupportedVersion
    };

  } catch (error) {
    console.error('Error checking update requirement:', error);
    throw error;
  }
};

// Helper function to compare versions
function compareVersions(version1, version2) {
  const v1 = version1.split('.').map(Number);
  const v2 = version2.split('.').map(Number);
  
  const minLength = Math.min(v1.length, v2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (v1[i] < v2[i]) {
      return -1; // version1 is older
    } else if (v1[i] > v2[i]) {
      return 1; // version1 is newer
    }
  }
  
  // If all common components are equal, the longer version is considered newer
  if (v1.length < v2.length) {
    return -1;
  } else if (v1.length > v2.length) {
    return 1;
  }
  
  return 0; // versions are equal
}

module.exports = mongoose.model('AppVersion', appVersionSchema);

