const mongoose = require('mongoose');
const AppVersion = require('../src/models/AppVersion');
require('dotenv').config();

async function seedAppVersions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');

    // Check if versions already exist
    const existingVersions = await AppVersion.countDocuments();
    if (existingVersions > 0) {
      console.log('📱 App versions already exist, skipping seed');
      return;
    }

    // Create initial version
    const initialVersion = new AppVersion({
      version: '0.1.0',
      downloadUrl: 'https://github.com/vohraaYatinn/release-build/blob/main/push-notifications.zip',
      releaseNotes: 'Initial release with basic functionality',
      isActive: true,
      isForced: false,
      minSupportedVersion: '0.1.0',
      platform: 'both',
      createdBy: 'admin'
    });

    await initialVersion.save();
    console.log('✅ Initial app version created:', initialVersion.version);

    // Create a test version for demonstration
    const testVersion = new AppVersion({
      version: '0.1.1',
      downloadUrl: 'https://github.com/vohraaYatinn/release-build/blob/main/push-notifications.zip',
      releaseNotes: 'Bug fixes and performance improvements',
      isActive: false, // Not active by default
      isForced: false,
      minSupportedVersion: '0.1.0',
      platform: 'both',
      createdBy: 'admin'
    });

    await testVersion.save();
    console.log('✅ Test app version created:', testVersion.version);

    console.log('🎉 App version seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding app versions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📱 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedAppVersions();
