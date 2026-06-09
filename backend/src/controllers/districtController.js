const District = require('../models/District');
const State = require('../models/State');

class DistrictController {
  // GET /districts?state_id=... - List districts by state (optional state_id for admin panel)
  async getDistricts(req, res) {
    try {
      const { state_id } = req.query;
      let filter = { is_active: true };
      
      // If state_id is provided, filter by state and validate state exists
      if (state_id) {
        // Check if state exists
        const state = await State.findById(state_id);
        if (!state) {
          return res.status(404).json({
            success: false,
            message: 'State not found'
          });
        }
        filter.state_id = state_id;
      }

      const districts = await District.find(filter)
        .populate('state_id', 'name')
        .select('name state_id is_active createdAt updatedAt')
        .sort({ name: 1 });

      res.status(200).json({
        success: true,
        message: 'Districts retrieved successfully',
        data: districts,
        total: districts.length
      });
    } catch (error) {
      console.error('Get districts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve districts'
      });
    }
  }

  // POST /districts - Add a new district
  async createDistrict(req, res) {
    try {
      const { name, state_id } = req.body;

      if (!name || !state_id) {
        return res.status(400).json({
          success: false,
          message: 'District name and state ID are required'
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

      const district = new District({ name, state_id });
      const savedDistrict = await district.save();
      
      // Populate state information
      await savedDistrict.populate('state_id', 'name');

      res.status(201).json({
        success: true,
        message: 'District created successfully',
        data: savedDistrict
      });
    } catch (error) {
      console.error('Create district error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'District with this name already exists in the state'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create district'
      });
    }
  }

  // PATCH /districts/:id - Update district
  async updateDistrict(req, res) {
    try {
      const { id } = req.params;
      const { name, state_id, is_active } = req.body;

      if (!name || !state_id) {
        return res.status(400).json({
          success: false,
          message: 'District name and state ID are required'
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

      const district = await District.findById(id);
      if (!district) {
        return res.status(404).json({
          success: false,
          message: 'District not found'
        });
      }

      district.name = name;
      district.state_id = state_id;
      if (is_active !== undefined) {
        district.is_active = is_active;
      }
      
      const updatedDistrict = await district.save();
      await updatedDistrict.populate('state_id', 'name');

      res.status(200).json({
        success: true,
        message: 'District updated successfully',
        data: updatedDistrict
      });
    } catch (error) {
      console.error('Update district error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'District with this name already exists in the state'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update district'
      });
    }
  }

  // PATCH /districts/:id/toggle - Toggle is_active status
  async toggleDistrict(req, res) {
    try {
      const { id } = req.params;

      const district = await District.findById(id).populate('state_id', 'name');
      if (!district) {
        return res.status(404).json({
          success: false,
          message: 'District not found'
        });
      }

      district.is_active = !district.is_active;
      const updatedDistrict = await district.save();

      res.status(200).json({
        success: true,
        message: `District ${updatedDistrict.is_active ? 'activated' : 'deactivated'} successfully`,
        data: updatedDistrict
      });
    } catch (error) {
      console.error('Toggle district error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle district status'
      });
    }
  }
}

module.exports = new DistrictController(); 