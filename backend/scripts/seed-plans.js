const mongoose = require('mongoose');
const Plan = require('../src/models/Plan');
const VehicleType = require('../src/models/VehicleType');
const State = require('../src/models/State');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://192.168.1.8:27017/wadi_cab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedPlans = async () => {
  try {
    console.log('🌱 Starting plans seeding...');

    // Get existing states and vehicle types
    const states = await State.find({ is_active: true });
    const vehicleTypes = await VehicleType.find({ is_active: true });

    if (states.length === 0) {
      console.log('⚠️  No states found. Please seed states first.');
      return;
    }

    if (vehicleTypes.length === 0) {
      console.log('⚠️  No vehicle types found. Please seed vehicle types first.');
      return;
    }

    // Traditional plan types
    const traditionalPlans = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
    
    // Day-based plan types
    const dayBasedPlans = [
      'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7',
      'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12', 'Day 13', 'Day 14',
      'Day 15', 'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20'
    ];

    // Sample pricing for traditional plans
    const traditionalPricing = {
      'Daily': 100,
      'Weekly': 500,
      'Monthly': 1500,
      'Quarterly': 4000,
      'Yearly': 12000
    };

    // Sample pricing for day-based plans (increasing by day)
    const dayBasedPricing = {
      'Day 1': 50,
      'Day 2': 90,
      'Day 3': 130,
      'Day 4': 160,
      'Day 5': 200,
      'Day 6': 240,
      'Day 7': 280,
      'Day 8': 320,
      'Day 9': 360,
      'Day 10': 400,
      'Day 11': 440,
      'Day 12': 480,
      'Day 13': 520,
      'Day 14': 560,
      'Day 15': 600,
      'Day 16': 640,
      'Day 17': 680,
      'Day 18': 720,
      'Day 19': 760,
      'Day 20': 800
    };

    let createdPlans = 0;

    // Create plans for each vehicle type
    for (const vehicleType of vehicleTypes) {
      console.log(`📋 Creating plans for vehicle type: ${vehicleType.name}`);

      // Create traditional plans
      for (const planType of traditionalPlans) {
        const existingPlan = await Plan.findOne({
          vehicle_type_id: vehicleType._id,
          plan_type: planType
        });

        if (!existingPlan) {
          const plan = new Plan({
            vehicle_type_id: vehicleType._id,
            plan_type: planType,
            amount: traditionalPricing[planType],
            is_active: true
          });

          await plan.save();
          createdPlans++;
          console.log(`✅ Created ${planType} plan for ${vehicleType.name} - ₹${traditionalPricing[planType]}`);
        } else {
          console.log(`ℹ️  ${planType} plan already exists for ${vehicleType.name}`);
        }
      }

      // Create day-based plans
      for (const planType of dayBasedPlans) {
        const existingPlan = await Plan.findOne({
          vehicle_type_id: vehicleType._id,
          plan_type: planType
        });

        if (!existingPlan) {
          const plan = new Plan({
            vehicle_type_id: vehicleType._id,
            plan_type: planType,
            amount: dayBasedPricing[planType],
            is_active: true
          });

          await plan.save();
          createdPlans++;
          console.log(`✅ Created ${planType} plan for ${vehicleType.name} - ₹${dayBasedPricing[planType]}`);
        } else {
          console.log(`ℹ️  ${planType} plan already exists for ${vehicleType.name}`);
        }
      }
    }

    console.log(`🎉 Plans seeding completed! Created ${createdPlans} new plans.`);

    // Display summary
    const totalPlans = await Plan.countDocuments();
    const activePlans = await Plan.countDocuments({ is_active: true });
    
    console.log('\n📊 Plans Summary:');
    console.log(`Total plans: ${totalPlans}`);
    console.log(`Active plans: ${activePlans}`);
    
    // Show plans by type
    const traditionalCount = await Plan.countDocuments({
      plan_type: { $in: traditionalPlans }
    });
    const dayBasedCount = await Plan.countDocuments({
      plan_type: { $in: dayBasedPlans }
    });
    
    console.log(`Traditional plans: ${traditionalCount}`);
    console.log(`Day-based plans: ${dayBasedCount}`);

  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    throw error;
  }
};

// Run the seed function
seedPlans()
  .then(() => {
    console.log('✅ Plans seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Plans seeding failed:', error);
    process.exit(1);
  }); 