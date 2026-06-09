const mongoose = require("mongoose");
const fs = require("fs");

// 1. Read the JSON
const stateData = require("./stateData.json");

// 2. Connect to MongoDB
// mongoose.connect("mongodb+srv://waadi_cab:waadi_cab@cluster0.4i2etxy.mongodb.net/waadi_cab?retryWrites=true&w=majority&appName=Cluster0", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });


mongoose.connect("mongodb+srv://coladco:rpTtIwZuT6gbJrCR@cluster0.2a1icyn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


// 3. Define Schemas
const stateSchema = new mongoose.Schema({
  name: String,
  is_active: { type: Boolean, default: true }
});
const districtSchema = new mongoose.Schema({
  name: String,
  state_id: mongoose.Schema.Types.ObjectId,
  is_active: { type: Boolean, default: true }
});
const vehicleTypeSchema = new mongoose.Schema({
  name: String,
  state_id: mongoose.Schema.Types.ObjectId,
  is_active: { type: Boolean, default: true }
});
const planSchema = new mongoose.Schema({
  vehicle_type_id: mongoose.Schema.Types.ObjectId,
  plan_type: String,
  amount: Number,
  is_active: { type: Boolean, default: true }
});

// 4. Create Models
const State = mongoose.model("State", stateSchema);
const District = mongoose.model("District", districtSchema);
const VehicleType = mongoose.model("VehicleType", vehicleTypeSchema);
const Plan = mongoose.model("Plan", planSchema);

async function seedData() {
  try {
    // Optional cleanup (for reseeding)
    await State.deleteMany({});
    await District.deleteMany({});
    await VehicleType.deleteMany({});
    await Plan.deleteMany({});

    for (const [stateName, stateInfo] of Object.entries(stateData)) {
      const state = await State.create({ name: stateName });

      // Insert Districts
      for (const district of stateInfo.districts || []) {
        await District.create({
          name: district,
          state_id: state._id,
        });
      }

      // Insert Vehicle Types & Plans
      for (const [vehicleKey, vehiclePlans] of Object.entries(stateInfo)) {
        if (vehicleKey === "districts") continue;

        const vehicle = await VehicleType.create({
          name: vehicleKey,
          state_id: state._id,
        });

        for (const [planName, planObj] of Object.entries(vehiclePlans || {})) {
          await Plan.create({
            vehicle_type_id: vehicle._id,
            plan_type: planName,
            amount: planObj.amount
          });
        }
      }
    }

    console.log("✅ Data inserted successfully.");
    mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error:", err);
    mongoose.disconnect();
  }
}

seedData();
