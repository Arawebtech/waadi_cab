const State = require('../models/State');

class StateController {
  // GET /states - List active states
  async getStates(req, res) {
    try {
      const states = await State.find({ is_active: true })
        .select('name statecode displayOrder is_active createdAt updatedAt')
        .sort({ displayOrder: 1, name: 1 }); // Sort by displayOrder first, then by name

      res.status(200).json({
        success: true,
        message: 'States retrieved successfully',
        data: states,
        total: states.length
      });
    } catch (error) {
      console.error('Get states error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve states'
      });
    }
  }

  // POST /states - Add a new state
  async createState(req, res) {
    try {
      const { name, statecode, displayOrder, defaultEntryDistrict } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'State name is required'
        });
      }

      // If no displayOrder provided, find the next available order
      let finalDisplayOrder = displayOrder;
      if (!finalDisplayOrder) {
        const lastState = await State.findOne().sort({ displayOrder: -1 });
        finalDisplayOrder = lastState ? lastState.displayOrder + 1 : 1;
      }

      const state = new State({ 
        name, 
        statecode: statecode || null,
        displayOrder: finalDisplayOrder,
        defaultEntryDistrict: defaultEntryDistrict || null
      });
      const savedState = await state.save();

      res.status(201).json({
        success: true,
        message: 'State created successfully',
        data: savedState
      });
    } catch (error) {
      console.error('Create state error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'State with this name already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create state'
      });
    }
  }

  // PATCH /states/:id - Update state
  async updateState(req, res) {
    try {
      const { id } = req.params;
      const { name, statecode, is_active, displayOrder, defaultEntryDistrict } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'State name is required'
        });
      }

      const state = await State.findById(id);
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      state.name = name;
      if (statecode !== undefined) {
        state.statecode = statecode;
      }
      if (is_active !== undefined) {
        state.is_active = is_active;
      }
      if (displayOrder !== undefined) {
        state.displayOrder = displayOrder;
      }
      if (defaultEntryDistrict !== undefined) {
        state.defaultEntryDistrict = defaultEntryDistrict;
      }
      
      const updatedState = await state.save();

      res.status(200).json({
        success: true,
        message: 'State updated successfully',
        data: updatedState
      });
    } catch (error) {
      console.error('Update state error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'State with this name already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update state'
      });
    }
  }

  // GET /states/admin - List all states with default entry districts for admin panel
  async getStatesForAdmin(req, res) {
    try {
      const states = await State.find()
        .populate('defaultEntryDistrict', 'name')
        .select('name statecode displayOrder is_active defaultEntryDistrict createdAt updatedAt')
        .sort({ displayOrder: 1, name: 1 });

      res.status(200).json({
        success: true,
        message: 'States retrieved successfully for admin',
        data: states,
        total: states.length
      });
    } catch (error) {
      console.error('Get states for admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve states for admin'
      });
    }
  }

  // PATCH /states/:id/toggle - Toggle is_active status
  async toggleState(req, res) {
    try {
      const { id } = req.params;
      
      const state = await State.findById(id);
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      state.is_active = !state.is_active;
      const updatedState = await state.save();

      res.status(200).json({
        success: true,
        message: `State ${updatedState.is_active ? 'activated' : 'deactivated'} successfully`,
        data: updatedState
      });
    } catch (error) {
      console.error('Toggle state error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle state status'
      });
    }
  }

  // DELETE /states/:id - Hard delete state
  async deleteState(req, res) {
    try {
      const { id } = req.params;
      
      const state = await State.findById(id);
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      // Check if state has any districts
      const District = require('../models/District');
      const districtCount = await District.countDocuments({ state_id: id });
      
      if (districtCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete state. It has ${districtCount} district(s) associated with it. Please delete all districts first.`
        });
      }

      // Check if state has any bookings
      const Booking = require('../models/Booking');
      const bookingCount = await Booking.countDocuments({ visiting_state: id });
      
      if (bookingCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete state. It has ${bookingCount} booking(s) associated with it.`
        });
      }

      await State.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'State deleted successfully'
      });
    } catch (error) {
      console.error('Delete state error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete state'
      });
    }
  }
}

module.exports = new StateController(); 