// const mongoose = require('mongoose');
// const State = require('../src/models/State');
// const District = require('../src/models/District');


// const MONGODB_URI = 'mongodb+srv://waadi_cab:waadi_cab@cluster0.4i2etxy.mongodb.net/waadi_cab?retryWrites=true&w=majority&appName=Cluster0';

// // Default entry districts mapping
// const defaultEntryDistricts = [
//   { stateName: 'UTTAR PRADESH', districtName: 'GHAZIPUR' },
//   { stateName: 'HARYANA', districtName: 'GURGAON' },
//   { stateName: 'PUNJAB', districtName: 'MOHALI' },
//   { stateName: 'RAJASTHAN', districtName: 'ALWAR' },
//   { stateName: 'HIMACHAL PRADESH', districtName: 'PARWANOO' },
//   { stateName: 'UTTRAKHAND', districtName: 'DEHRADU' },
//   { stateName: 'GUJRAT', districtName: 'SHAMLAJI' },
//   { stateName: 'JHARKHAND', districtName: 'DHANBAD' },
//   { stateName: 'MAHARASHTRA', districtName: 'AURANGABAD' },
//   { stateName: 'ODISHA', districtName: 'PURI' }
//   // Note: MADHYA PRADESH removed as it has no districts
// ];

// async function addDefaultEntryDistricts() {
//   try {
//     console.log('Connecting to MongoDB...');
//     await mongoose.connect(MONGODB_URI);
//     console.log('Connected to MongoDB successfully!');

//     for (const mapping of defaultEntryDistricts) {
//       console.log(`\nProcessing: ${mapping.stateName} -> ${mapping.districtName}`);
      
//       // Find the state
//       const state = await State.findOne({ 
//         name: { $regex: new RegExp(mapping.stateName, 'i') } 
//       });
      
//       if (!state) {
//         console.log(`❌ State not found: ${mapping.stateName}`);
//         continue;
//       }
      
//       console.log(`✅ Found state: ${state.name} (ID: ${state._id})`);
      
//       // Find the district
//       const district = await District.findOne({ 
//         name: { $regex: new RegExp(mapping.districtName, 'i') },
//         state_id: state._id
//       });
      
//       if (!district) {
//         console.log(`❌ District not found: ${mapping.districtName} in state ${state.name}`);
//         continue;
//       }
      
//       console.log(`✅ Found district: ${district.name} (ID: ${district._id})`);
      
//       // Update the state with default entry district
//       await State.findByIdAndUpdate(state._id, {
//         defaultEntryDistrict: district._id
//       });
      
//       console.log(`✅ Updated state ${state.name} with default entry district: ${district.name}`);
//     }
    
//     console.log('\n🎉 Default entry districts assignment completed!');
    
//     // Display summary
//     console.log('\n📊 Summary of states with default entry districts:');
//     const statesWithDefaults = await State.find({ defaultEntryDistrict: { $exists: true, $ne: null } })
//       .populate('defaultEntryDistrict')
//       .sort('displayOrder');
    
//     statesWithDefaults.forEach(state => {
//       console.log(`  ${state.name}: ${state.defaultEntryDistrict?.name || 'None'}`);
//     });
    
//   } catch (error) {
//     console.error('❌ Error:', error);
//   } finally {
//     await mongoose.disconnect();
//     console.log('\nDisconnected from MongoDB');
//   }
// }

// // Run the script
// addDefaultEntryDistricts();



const mongoose = require('mongoose');
const State = require('../src/models/State');
const District = require('../src/models/District');

const MONGODB_URI =
  'mongodb+srv://waadi_cab:waadi_cab@cluster0.4i2etxy.mongodb.net/waadi_cab?retryWrites=true&w=majority&appName=Cluster0';

// Default entry districts mapping
const defaultEntryDistricts = [
  { stateName: 'UTTAR PRADESH', districtName: 'GHAZIPUR' },
  { stateName: 'HARYANA', districtName: 'GURGAON' },
  { stateName: 'PUNJAB', districtName: 'MOHALI' },
  { stateName: 'RAJASTHAN', districtName: 'ALWAR' },
  { stateName: 'HIMACHAL PRADESH', districtName: 'PARWANOO' },
  { stateName: 'UTTRAKHAND', districtName: 'DEHRADUN' },
  { stateName: 'GUJRAT', districtName: 'SHAMLAJI' },
  { stateName: 'JHARKHAND', districtName: 'DHANBAD' },
  { stateName: 'MAHARASHTRA', districtName: 'AURANGABAD' },
  { stateName: 'ODISHA', districtName: 'PURI' }
];

async function addDefaultEntryDistricts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    for (const mapping of defaultEntryDistricts) {
      console.log(`\n🔄 Processing: ${mapping.stateName} -> ${mapping.districtName}`);

      // Find State
      const state = await State.findOne({
        name: { $regex: new RegExp(`^${mapping.stateName}$`, 'i') }
      });

      if (!state) {
        console.log(`❌ State not found: ${mapping.stateName}`);
        continue;
      }

      console.log(`✅ Found state: ${state.name}`);

      // Find District
      let district = await District.findOne({
        name: { $regex: new RegExp(`^${mapping.districtName}$`, 'i') },
        state_id: state._id
      });

      // Create District if not exists
      if (!district) {
        district = await District.create({
          name: mapping.districtName,
          state_id: state._id,
          is_active: true
        });

        console.log(`✅ Created district: ${district.name}`);
      } else {
        console.log(`✅ District already exists: ${district.name}`);
      }

      // Update State with Default Entry District
      await State.findByIdAndUpdate(
        state._id,
        {
          defaultEntryDistrict: district._id
        },
        { new: true }
      );

      console.log(
        `✅ Updated state "${state.name}" with default entry district "${district.name}"`
      );
    }

    console.log('\n🎉 Default entry districts assignment completed!');

    // Summary
    console.log('\n📊 Summary:');

    const statesWithDefaults = await State.find({
      defaultEntryDistrict: { $exists: true, $ne: null }
    })
      .populate('defaultEntryDistrict')
      .sort({ displayOrder: 1 });

    statesWithDefaults.forEach((state) => {
      console.log(
        `${state.name} => ${
          state.defaultEntryDistrict
            ? state.defaultEntryDistrict.name
            : 'Not Assigned'
        }`
      );
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
  }
}

// Run Script
addDefaultEntryDistricts();