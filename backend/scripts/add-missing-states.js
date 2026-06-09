const mongoose = require('mongoose');
const State = require('../src/models/State');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = 'mongodb+srv://coladco:rpTtIwZuT6gbJrCR@cluster0.2a1icyn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
// const MONGODB_URI = 'mongodb+srv://waadi_cab:waadi_cab@cluster0.4i2etxy.mongodb.net/waadi_cab?retryWrites=true&w=majority&appName=Cluster0';
// const MONGODB_URI = 'mongodb+srv://maithanibhaskar205_db_user:cXlnXgTJkBgGREvI@cluster0.e7ns7wa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Define the complete list of states with displayOrder
const completeStateList = [
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

async function addMissingStates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check which states exist and which are missing
    const existingStates = await State.find({});
    const existingStateNames = existingStates.map(state => state.name);
    
    console.log('📋 Existing states:', existingStateNames);
    
    // Find missing states
    const missingStates = completeStateList.filter(state => 
      !existingStateNames.includes(state.name)
    );
    
    if (missingStates.length === 0) {
      console.log('✅ All states already exist in the database');
    } else {
      console.log(`📝 Found ${missingStates.length} missing states:`, missingStates.map(s => s.name));
      
      // Add missing states
      for (const stateInfo of missingStates) {
        const newState = new State({
          name: stateInfo.name,
          displayOrder: stateInfo.displayOrder,
          is_active: true
        });
        
        await newState.save();
        console.log(`✅ Added new state: ${stateInfo.name} with displayOrder: ${stateInfo.displayOrder}`);
      }
    }

    // Update all existing states with displayOrder
    console.log('\n🔄 Updating existing states with displayOrder...');
    for (const stateInfo of completeStateList) {
      const result = await State.updateOne(
        { name: stateInfo.name },
        { $set: { displayOrder: stateInfo.displayOrder } }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ Updated ${stateInfo.name} with displayOrder: ${stateInfo.displayOrder}`);
      }
    }

    // Verify the final result
    console.log('\n📋 Final state order:');
    const finalStates = await State.find({}).sort({ displayOrder: 1 });
    finalStates.forEach(state => {
      console.log(`${state.displayOrder || 'N/A'}. ${state.name}`);
    });

    console.log('\n🎉 State management completed successfully!');
  } catch (error) {
    console.error('❌ Error managing states:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
addMissingStates();


