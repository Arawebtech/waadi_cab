// Seed data utilities - currently only for auth and user functionality

async function seedUsers() {
  try {
    console.log('🌱 Starting user data seeding...');
    
    // TODO: Add sample users if needed in the future
    console.log('ℹ️  No user data to seed currently');
    
    return [];
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

async function seedData() {
  try {
    console.log('🚀 Starting database seeding process...');
    
    await seedUsers();
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('💥 Database seeding failed:', error);
    throw error;
  }
}

module.exports = {
  seedData,
  seedUsers
}; 