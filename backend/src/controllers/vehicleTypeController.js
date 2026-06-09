const VehicleType = require('../models/VehicleType');
const State = require('../models/State');

class VehicleTypeController {
  // GET /vehicle-types?state_id=... - List vehicle types for a state
  async getVehicleTypes(req, res) {
    try {
      const { state_id } = req.query;

      if (!state_id) {
        return res.status(400).json({
          success: false,
          message: 'State ID is required'
        });
      }

      // Check if state exists
      const state = await State.findById(state_id);
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      const vehicleTypes = await VehicleType.find({ 
        state_id: state_id, 
        is_active: true 
      })
        .populate('state_id', 'name')
        .select('name state_id is_active createdAt updatedAt')
        .sort({ name: 1 });

      res.status(200).json({
        success: true,
        message: 'Vehicle types retrieved successfully',
        data: vehicleTypes,
        total: vehicleTypes.length
      });
    } catch (error) {
      console.error('Get vehicle types error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicle types'
      });
    }
  }

  // POST /vehicle-types - Add a new vehicle type
  async createVehicleType(req, res) {
    try {
      const { name, state_id } = req.body;

      if (!name || !state_id) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle type name and state ID are required'
        });
      }

      // Check if state exists
      const state = await State.findById(state_id);
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      const vehicleType = new VehicleType({ name, state_id });
      const savedVehicleType = await vehicleType.save();
      
      // Populate state information
      await savedVehicleType.populate('state_id', 'name');

      res.status(201).json({
        success: true,
        message: 'Vehicle type created successfully',
        data: savedVehicleType
      });
    } catch (error) {
      console.error('Create vehicle type error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Vehicle type with this name already exists in the state'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create vehicle type'
      });
    }
  }

  // PATCH /vehicle-types/:id - Update vehicle type
  async updateVehicleType(req, res) {
    try {
      const { id } = req.params;
      const { name, state_id, is_active } = req.body;

      if (!name || !state_id) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle type name and state ID are required'
        });
      }

      // Check if state exists
      const state = await State.findById(state_id);
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      const vehicleType = await VehicleType.findById(id);
      if (!vehicleType) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle type not found'
        });
      }

      vehicleType.name = name;
      vehicleType.state_id = state_id;
      if (is_active !== undefined) {
        vehicleType.is_active = is_active;
      }
      
      const updatedVehicleType = await vehicleType.save();
      await updatedVehicleType.populate('state_id', 'name');

      res.status(200).json({
        success: true,
        message: 'Vehicle type updated successfully',
        data: updatedVehicleType
      });
    } catch (error) {
      console.error('Update vehicle type error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Vehicle type with this name already exists in the state'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update vehicle type'
      });
    }
  }

  // PATCH /vehicle-types/:id/toggle - Toggle is_active status
  async toggleVehicleType(req, res) {
    try {
      const { id } = req.params;

      const vehicleType = await VehicleType.findById(id).populate('state_id', 'name');
      if (!vehicleType) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle type not found'
        });
      }

      vehicleType.is_active = !vehicleType.is_active;
      const updatedVehicleType = await vehicleType.save();

      res.status(200).json({
        success: true,
        message: `Vehicle type ${updatedVehicleType.is_active ? 'activated' : 'deactivated'} successfully`,
        data: updatedVehicleType
      });
    } catch (error) {
      console.error('Toggle vehicle type error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle vehicle type status'
      });
    }
  }
}

module.exports = new VehicleTypeController(); 