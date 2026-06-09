#!/usr/bin/env node

/**
 * Script to disable maintenance mode for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function disableMaintenance() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const AppSettings = require('../src/models/AppSettings');
    
    // Get current settings
    const settings = await AppSettings.findOne().sort({ createdAt: -1 });
    
    if (settings) {
      console.log('📊 Current maintenance status:', settings.isMaintenanceMode);
      
      if (settings.isMaintenanceMode) {
        console.log('🔄 Disabling maintenance mode...');
        settings.isMaintenanceMode = false;
        settings.maintenanceMessage = 'System is operational';
        settings.maintenanceTitle = 'System Online';
        await settings.save();
        console.log('✅ Maintenance mode disabled');
      } else {
        console.log('ℹ️  Maintenance mode is already disabled');
      }
    } else {
      console.log('⚠️  No app settings found, creating new settings...');
      const newSettings = new AppSettings({
        isMaintenanceMode: false,
        maintenanceMessage: 'System is operational',
        maintenanceTitle: 'System Online'
      });
      await newSettings.save();
      console.log('✅ New app settings created with maintenance mode disabled');
    }

    console.log('\n🎉 Maintenance mode management completed!');

  } catch (error) {
    console.error('❌ Error managing maintenance mode:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
disableMaintenance();
