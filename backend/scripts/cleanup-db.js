const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Get bookings collection
    const bookingsCollection = db.collection('bookings');
    
    // List existing indexes
    console.log('📋 Checking existing indexes on bookings collection...');
    const indexes = await bookingsCollection.listIndexes().toArray();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));
    
    // Remove problematic indexes
    const indexesToRemove = ['passId_1'];
    
    for (const indexName of indexesToRemove) {
      try {
        await bookingsCollection.dropIndex(indexName);
        console.log(`✅ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.code === 27) {
          console.log(`ℹ️  Index ${indexName} does not exist (already removed)`);
        } else {
          console.log(`⚠️  Could not drop index ${indexName}:`, error.message);
        }
      }
    }
    
    // Optional: Clear all bookings if needed (uncomment if you want to start fresh)
    // console.log('🗑️  Clearing all bookings...');
    // await bookingsCollection.deleteMany({});
    // console.log('✅ All bookings cleared');
    
    // Check for duplicate bookings without bookingId and clean them up
    console.log('🔍 Checking for bookings without bookingId...');
    const bookingsWithoutId = await bookingsCollection.find({ bookingId: { $exists: false } }).toArray();
    
    if (bookingsWithoutId.length > 0) {
      console.log(`Found ${bookingsWithoutId.length} bookings without bookingId`);
      
      // Generate bookingId for existing bookings
      for (const booking of bookingsWithoutId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const bookingId = `WC${timestamp}${random}`.toUpperCase();
        
        await bookingsCollection.updateOne(
          { _id: booking._id },
          { $set: { bookingId: bookingId } }
        );
      }
      console.log(`✅ Updated ${bookingsWithoutId.length} bookings with new bookingId`);
    } else {
      console.log('✅ All bookings already have bookingId');
    }
    
    // Recreate proper indexes
    console.log('🔧 Creating proper indexes...');
    await bookingsCollection.createIndex({ bookingId: 1 }, { unique: true });
    await bookingsCollection.createIndex({ user: 1, status: 1 });
    await bookingsCollection.createIndex({ user: 1, createdAt: -1 });
    console.log('✅ Proper indexes created');
    
    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  cleanupDatabase()
    .then(() => {
      console.log('✅ Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = cleanupDatabase; 