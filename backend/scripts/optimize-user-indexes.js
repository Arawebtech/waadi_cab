#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function optimizeUserIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('📊 Current indexes on users collection:');
    const currentIndexes = await usersCollection.indexes();
    currentIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });
    
    console.log('\n🚀 Adding optimized compound indexes for users...');
    
    // Add compound indexes for common admin query patterns
    const newIndexes = [
      // For admin user search queries
      { key: { firstName: 1, lastName: 1 }, name: 'firstName_lastName_1' },
      { key: { phoneNumber: 1 }, name: 'phoneNumber_1' },
      { key: { email: 1 }, name: 'email_1' },
      
      // For user creation date sorting
      { key: { createdAt: -1 }, name: 'createdAt_-1' },
      
      // For user type filtering
      { key: { userType: 1, createdAt: -1 }, name: 'userType_createdAt_-1' },
      
      // For active user queries
      { key: { isActive: 1, createdAt: -1 }, name: 'isActive_createdAt_-1' }
    ];
    
    for (const index of newIndexes) {
      try {
        await usersCollection.createIndex(index.key, { 
          name: index.name,
          background: true // Create index in background
        });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`⚠️  Index ${index.name} already exists`);
        } else {
          console.log(`❌ Failed to create index ${index.name}:`, error.message);
        }
      }
    }
    
    console.log('\n📊 Final indexes on users collection:');
    const finalIndexes = await usersCollection.indexes();
    finalIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });
    
    console.log('\n✅ User indexes optimization completed!');
    
  } catch (error) {
    console.error('❌ Error optimizing user indexes:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the optimization
optimizeUserIndexes();
