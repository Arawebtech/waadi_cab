#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function optimizeSearchIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const bookingsCollection = db.collection('bookings');
    const usersCollection = db.collection('users');
    
    console.log('📊 Current indexes on bookings collection:');
    const currentBookingIndexes = await bookingsCollection.indexes();
    currentBookingIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });
    
    console.log('\n📊 Current indexes on users collection:');
    const currentUserIndexes = await usersCollection.indexes();
    currentUserIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });
    
    console.log('\n🚀 Adding optimized search indexes...');
    
    // Add indexes for search functionality
    const newBookingIndexes = [
      // Vehicle number search index
      { key: { vehicle_number: 1 }, name: 'vehicle_number_1' },
      // WhatsApp number search index
      { key: { whatsapp_number: 1 }, name: 'whatsapp_number_1' },
      // Booking ID text index for partial matching
      { key: { bookingId: 1 }, name: 'bookingId_1' }
    ];
    
    const newUserIndexes = [
      // Phone number search index
      { key: { phoneNumber: 1 }, name: 'phoneNumber_1' },
      // Name search indexes
      { key: { firstName: 1 }, name: 'firstName_1' },
      { key: { lastName: 1 }, name: 'lastName_1' },
      // Compound name search index
      { key: { firstName: 1, lastName: 1 }, name: 'firstName_lastName_1' }
    ];
    
    // Add booking indexes
    for (const index of newBookingIndexes) {
      try {
        await bookingsCollection.createIndex(index.key, { 
          name: index.name,
          background: true,
          sparse: true
        });
        console.log(`✅ Created booking index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`⚠️  Index ${index.name} already exists`);
        } else {
          console.error(`❌ Error creating booking index ${index.name}:`, error.message);
        }
      }
    }
    
    // Add user indexes
    for (const index of newUserIndexes) {
      try {
        await usersCollection.createIndex(index.key, { 
          name: index.name,
          background: true,
          sparse: true
        });
        console.log(`✅ Created user index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`⚠️  Index ${index.name} already exists`);
        } else {
          console.error(`❌ Error creating user index ${index.name}:`, error.message);
        }
      }
    }
    
    console.log('\n📊 Final indexes on bookings collection:');
    const finalBookingIndexes = await bookingsCollection.indexes();
    finalBookingIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });
    
    console.log('\n📊 Final indexes on users collection:');
    const finalUserIndexes = await usersCollection.indexes();
    finalUserIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });
    
    console.log('\n✅ Search indexes optimization completed!');
    console.log('\n🎯 Search capabilities now optimized for:');
    console.log('  - Phone number searches (user.phoneNumber)');
    console.log('  - Vehicle number searches (vehicle_number)');
    console.log('  - WhatsApp number searches (whatsapp_number)');
    console.log('  - Customer name searches (firstName, lastName)');
    console.log('  - Booking ID searches (bookingId)');
    
  } catch (error) {
    console.error('❌ Error optimizing search indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

optimizeSearchIndexes();
