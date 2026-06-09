const mongoose = require('mongoose');
const { seedData } = require('../src/utils/seedData');

// Load environment variables
require('dotenv').config();

async function runSeed() {
  try {
    console.log('🚀 Starting database seeding process...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Run seeding
    await seedData();
    
    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runSeed();
}

module.exports = runSeed; 