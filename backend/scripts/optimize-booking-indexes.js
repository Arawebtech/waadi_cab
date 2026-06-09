#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function optimizeBookingIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const bookingsCollection = db.collection('bookings');
    
    console.log('📊 Current indexes:');
    const currentIndexes = await bookingsCollection.indexes();
    currentIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });
    
    console.log('\n🚀 Adding optimized compound indexes...');
    
    // Add compound indexes for common admin query patterns
    const newIndexes = [
      // For date range + status queries (most common admin pattern)
      { key: { createdAt: -1, status: 1, _id: -1 }, name: 'createdAt_-1_status_1__id_-1' },
      
      // For status + processed_by_admin queries
      { key: { status: 1, processed_by_admin: 1, createdAt: -1 }, name: 'status_1_processed_by_admin_1_createdAt_-1' },
      
      // For visiting_state + status + date queries
      { key: { visiting_state: 1, status: 1, createdAt: -1 }, name: 'visiting_state_1_status_1_createdAt_-1' },
      
      // For tax date range queries
      { key: { tax_from_date: 1, tax_upto_date: 1, status: 1 }, name: 'tax_from_date_1_tax_upto_date_1_status_1' },
      
      // For user + date queries
      { key: { user: 1, createdAt: -1, status: 1 }, name: 'user_1_createdAt_-1_status_1' },
      
      // For search queries (bookingId, vehicle_number)
      { key: { bookingId: 1, createdAt: -1 }, name: 'bookingId_1_createdAt_-1' },
      { key: { vehicle_number: 1, createdAt: -1 }, name: 'vehicle_number_1_createdAt_-1' }
    ];
    
    for (const indexSpec of newIndexes) {
      try {
        // Check if index already exists
        const existingIndexes = await bookingsCollection.indexes();
        const exists = existingIndexes.some(idx => idx.name === indexSpec.name);
        
        if (!exists) {
          console.log(`  ✅ Creating index: ${indexSpec.name}`);
          await bookingsCollection.createIndex(indexSpec.key, { name: indexSpec.name });
        } else {
          console.log(`  ⚠️  Index already exists: ${indexSpec.name}`);
        }
      } catch (error) {
        console.log(`  ❌ Failed to create index ${indexSpec.name}:`, error.message);
      }
    }
    
    console.log('\n📊 Updated indexes:');
    const updatedIndexes = await bookingsCollection.indexes();
    updatedIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });
    
    console.log('\n✅ Index optimization completed!');
    
  } catch (error) {
    console.error('❌ Error optimizing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the optimization
optimizeBookingIndexes();
