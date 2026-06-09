#!/usr/bin/env node

/**
 * Script to fix vehicle type unique index
 * 
 * This script:
 * 1. Drops the old unique index that prevents creating vehicle types with same name+state
 * 2. Creates a new partial unique index that only applies to active vehicle types
 * 3. This allows creating new vehicle types with the same name after the old one is deactivated
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixVehicleTypeIndex() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('vehicletypes');

    console.log('\n📊 Current indexes:');
    const currentIndexes = await collection.indexes();
    currentIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log(`     Unique: ${index.unique}`);
    });

    // Find the old unique index on name + state_id
    const oldIndex = currentIndexes.find(index => 
      index.key.name === 1 && 
      index.key.state_id === 1 && 
      index.unique === true &&
      !index.partialFilterExpression
    );

    if (oldIndex) {
      console.log(`\n🗑️  Dropping old unique index: ${oldIndex.name}`);
      await collection.dropIndex(oldIndex.name);
      console.log('✅ Old index dropped successfully');
    } else {
      console.log('\nℹ️  No old unique index found to drop');
    }

    // Create new partial unique index
    console.log('\n🆕 Creating new partial unique index...');
    await collection.createIndex(
      { name: 1, state_id: 1, is_active: 1 },
      { 
        unique: true, 
        name: 'name_1_state_id_1_is_active_1',
        partialFilterExpression: { is_active: true }
      }
    );
    console.log('✅ New partial unique index created');

    // Verify the new indexes
    console.log('\n📊 Updated indexes:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log(`     Unique: ${index.unique}`);
      if (index.partialFilterExpression) {
        console.log(`     Partial Filter: ${JSON.stringify(index.partialFilterExpression)}`);
      }
    });

    // Test the fix by checking vehicle types
    console.log('\n🧪 Testing the fix...');
    const allVehicleTypes = await collection.find({}).toArray();
    console.log(`Total vehicle types: ${allVehicleTypes.length}`);
    
    const activeVehicleTypes = allVehicleTypes.filter(vt => vt.is_active);
    const inactiveVehicleTypes = allVehicleTypes.filter(vt => !vt.is_active);
    
    console.log(`Active vehicle types: ${activeVehicleTypes.length}`);
    console.log(`Inactive vehicle types: ${inactiveVehicleTypes.length}`);

    // Check for potential conflicts
    const activeByNameAndState = {};
    const conflicts = [];
    
    activeVehicleTypes.forEach(vt => {
      const key = `${vt.name}_${vt.state_id}`;
      if (activeByNameAndState[key]) {
        conflicts.push({ name: vt.name, state_id: vt.state_id });
      }
      activeByNameAndState[key] = vt;
    });

    if (conflicts.length > 0) {
      console.log('\n⚠️  Found active vehicle types with same name+state:');
      conflicts.forEach(conflict => {
        console.log(`  - ${conflict.name} in state ${conflict.state_id}`);
      });
    } else {
      console.log('\n✅ No conflicts found in active vehicle types');
    }

    console.log('\n🎉 Vehicle type index fix completed successfully!');
    console.log('\n📝 What this fix does:');
    console.log('  - Allows creating vehicle types with the same name after the old one is deactivated');
    console.log('  - Still prevents duplicate active vehicle types with same name+state');
    console.log('  - Maintains data integrity while enabling proper soft deletion');

  } catch (error) {
    console.error('❌ Error fixing vehicle type index:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
fixVehicleTypeIndex();
