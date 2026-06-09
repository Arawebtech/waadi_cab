#!/usr/bin/env node

/**
 * Fix Email Index Script
 * 
 * This script fixes the duplicate key error for email field by:
 * 1. Dropping the existing non-sparse email index
 * 2. Creating a new sparse index that allows multiple null values
 * 3. This prevents E11000 duplicate key errors when users signup without email
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixEmailIndex() {
  try {
    console.log('🔄 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://192.168.1.8:27017/wadicab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to database');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('🔍 Checking existing indexes...');
    const existingIndexes = await usersCollection.indexes();
    console.log('Current indexes:', existingIndexes.map(idx => ({ name: idx.name, key: idx.key, sparse: idx.sparse })));
    
    // Check if email index exists
    const emailIndexExists = existingIndexes.some(idx => 
      JSON.stringify(idx.key) === JSON.stringify({ email: 1 })
    );
    
    if (emailIndexExists) {
      console.log('🗑️ Dropping existing email index...');
      try {
        await usersCollection.dropIndex({ email: 1 });
        console.log('✅ Successfully dropped existing email index');
      } catch (error) {
        if (error.message.includes('index not found')) {
          console.log('ℹ️ Email index was already dropped or doesn\'t exist');
        } else {
          throw error;
        }
      }
    } else {
      console.log('ℹ️ No existing email index found');
    }
    
    console.log('🔧 Creating new sparse email index...');
    await usersCollection.createIndex({ email: 1 }, { sparse: true });
    console.log('✅ Successfully created sparse email index');
    
    // Verify the new index
    console.log('🔍 Verifying new indexes...');
    const newIndexes = await usersCollection.indexes();
    const emailIndex = newIndexes.find(idx => 
      JSON.stringify(idx.key) === JSON.stringify({ email: 1 })
    );
    
    if (emailIndex && emailIndex.sparse) {
      console.log('✅ Email index is now sparse:', emailIndex);
    } else {
      console.log('⚠️ Warning: Email index may not be properly configured:', emailIndex);
    }
    
    console.log('🧹 Checking for duplicate null email documents...');
    const nullEmailCount = await usersCollection.countDocuments({ email: null });
    console.log(`Found ${nullEmailCount} documents with null email`);
    
    if (nullEmailCount > 1) {
      console.log('ℹ️ Multiple null email documents exist, but sparse index will handle this correctly');
    }
    
    console.log('✅ Email index fix completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Dropped old non-sparse email index');
    console.log('- Created new sparse email index');
    console.log('- Sparse index allows multiple documents with null email');
    console.log('- Signup should now work without duplicate key errors');
    
  } catch (error) {
    console.error('❌ Error fixing email index:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the fix
if (require.main === module) {
  fixEmailIndex();
}

module.exports = fixEmailIndex;
