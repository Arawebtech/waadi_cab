const mongoose = require('mongoose');
const State = require('../src/models/State');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wadi_cab';

// Define the desired order of states
const stateOrder = [
  { name: "UTTAR PRADESH", displayOrder: 1 },
  { name: "HARYANA", displayOrder: 2 },
  { name: "RAJASTHAN", displayOrder: 3 },
  { name: "UTTRAKHAND", displayOrder: 4 },
  { name: "PUNJAB", displayOrder: 5 },
  { name: "HIMACHAL PRADESH", displayOrder: 6 },
  { name: "MADHYA PRADESH", displayOrder: 7 },
  { name: "GUJRAT", displayOrder: 8 },
  { name: "JHARKHAND", displayOrder: 9 },
  { name: "MAHARASHTRA", displayOrder: 10 },
  { name: "BIHAR", displayOrder: 11 },
  { name: "ODISHA", displayOrder: 12 }
];

async function reorderStates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update each state with displayOrder
    for (const stateInfo of stateOrder) {
      const result = await State.updateOne(
        { name: stateInfo.name },
        { $set: { displayOrder: stateInfo.displayOrder } }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ Updated ${stateInfo.name} with displayOrder: ${stateInfo.displayOrder}`);
      } else {
        console.log(`⚠️  State not found: ${stateInfo.name}`);
      }
    }

    // Verify the updates
    console.log('\n📋 Current state order:');
    const states = await State.find({}).sort({ displayOrder: 1 });
    states.forEach(state => {
      console.log(`${state.displayOrder || 'N/A'}. ${state.name}`);
    });

    console.log('\n🎉 State reordering completed successfully!');
  } catch (error) {
    console.error('❌ Error reordering states:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
reorderStates();






