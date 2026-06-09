#!/usr/bin/env node

/**
 * Script to fix plan unique index
 * 
 * This script:
 * 1. Drops the old unique index that prevents creating plans with same vehicle_type+plan_type
 * 2. Creates a new partial unique index that only applies to active plans
 * 3. This allows creating new plans with the same vehicle_type+plan_type after the old one is deactivated
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixPlanIndex() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('plans');

    console.log('\n📊 Current indexes:');
    const currentIndexes = await collection.indexes();
    currentIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log(`     Unique: ${index.unique}`);
    });

    // Find the old unique index on vehicle_type_id + plan_type
    const oldIndex = currentIndexes.find(index => 
      index.key.vehicle_type_id === 1 && 
      index.key.plan_type === 1 && 
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
      { vehicle_type_id: 1, plan_type: 1, is_active: 1 },
      { 
        unique: true, 
        name: 'vehicle_type_id_1_plan_type_1_is_active_1',
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

    // Test the fix by checking plans
    console.log('\n🧪 Testing the fix...');
    const allPlans = await collection.find({}).toArray();
    console.log(`Total plans: ${allPlans.length}`);
    
    const activePlans = allPlans.filter(plan => plan.is_active);
    const inactivePlans = allPlans.filter(plan => !plan.is_active);
    
    console.log(`Active plans: ${activePlans.length}`);
    console.log(`Inactive plans: ${inactivePlans.length}`);

    // Check for potential conflicts
    const activeByVehicleTypeAndPlanType = {};
    const conflicts = [];
    
    activePlans.forEach(plan => {
      const key = `${plan.vehicle_type_id}_${plan.plan_type}`;
      if (activeByVehicleTypeAndPlanType[key]) {
        conflicts.push({ 
          vehicle_type_id: plan.vehicle_type_id, 
          plan_type: plan.plan_type 
        });
      }
      activeByVehicleTypeAndPlanType[key] = plan;
    });

    if (conflicts.length > 0) {
      console.log('\n⚠️  Found active plans with same vehicle_type+plan_type:');
      conflicts.forEach(conflict => {
        console.log(`  - ${conflict.plan_type} for vehicle_type ${conflict.vehicle_type_id}`);
      });
    } else {
      console.log('\n✅ No conflicts found in active plans');
    }

    // Show some examples of inactive plans that can now be recreated
    if (inactivePlans.length > 0) {
      console.log('\n📋 Examples of inactive plans that can now be recreated:');
      const examples = inactivePlans.slice(0, 5);
      examples.forEach(plan => {
        console.log(`  - ${plan.plan_type} for vehicle_type ${plan.vehicle_type_id} (was inactive)`);
      });
    }

    console.log('\n🎉 Plan index fix completed successfully!');
    console.log('\n📝 What this fix does:');
    console.log('  - Allows creating plans with the same vehicle_type+plan_type after the old one is deactivated');
    console.log('  - Still prevents duplicate active plans with same vehicle_type+plan_type');
    console.log('  - Maintains data integrity while enabling proper soft deletion');

  } catch (error) {
    console.error('❌ Error fixing plan index:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
fixPlanIndex();
