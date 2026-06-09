const Plan = require('../models/Plan');
const VehicleType = require('../models/VehicleType');

class PlanController {
  // Helper method to get all available plan types
  static getAvailablePlanTypes() {
    return [
      'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly',
      'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 
      'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12', 'Day 13', 'Day 14',
      'Day 15', 'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20'
    ];
  }

  // Helper method to categorize plan types
  static categorizePlanTypes() {
    return {
      traditional: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
      dayBased: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 
                 'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12', 'Day 13', 'Day 14',
                 'Day 15', 'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20']
    };
  }

  // GET /plans/types - Get all available plan types
  async getPlanTypes(req, res) {
    try {
      const planTypes = PlanController.getAvailablePlanTypes();
      const categorized = PlanController.categorizePlanTypes();
      
      res.status(200).json({
        success: true,
        message: 'Plan types retrieved successfully',
        data: {
          all: planTypes,
          traditional: categorized.traditional,
          dayBased: categorized.dayBased
        }
      });
    } catch (error) {
      console.error('Get plan types error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve plan types'
      });
    }
  }

  // GET /plans?vehicle_type_id=... - Get plans by vehicle type
  async getPlans(req, res) {
    try {
      const { vehicle_type_id } = req.query;
      console.log('Getting plans for vehicle_type_id:', vehicle_type_id);

      if (!vehicle_type_id) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle type ID is required'
        });
      }

      // Check if vehicle type exists
      const vehicleType = await VehicleType.findById(vehicle_type_id);
      console.log('Vehicle type found:', vehicleType);
      
      if (!vehicleType) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle type not found'
        });
      }

      const plans = await Plan.find({ 
        vehicle_type_id: vehicle_type_id, 
        is_active: true 
      })
        .populate({
          path: 'vehicle_type_id',
          select: 'name state_id',
          populate: {
            path: 'state_id',
            select: 'name'
          }
        })
        .select('vehicle_type_id plan_type amount is_active createdAt updatedAt')
        .sort({ plan_type: 1 });
      
      console.log('Plans found:', plans.length);

      res.status(200).json({
        success: true,
        message: 'Plans retrieved successfully',
        data: plans,
        total: plans.length
      });
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve plans'
      });
    }
  }

  // POST /plans - Add a new plan
  async createPlan(req, res) {
    try {
      const { vehicle_type_id, plan_type, amount } = req.body;

      if (!vehicle_type_id || !plan_type || amount === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle type ID, plan type, and amount are required'
        });
      }

      if (amount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be positive'
        });
      }

      // Check if vehicle type exists
      const vehicleType = await VehicleType.findById(vehicle_type_id);
      if (!vehicleType) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle type not found'
        });
      }

      const plan = new Plan({ vehicle_type_id, plan_type, amount });
      const savedPlan = await plan.save();
      
      // Populate vehicle type and state information
      await savedPlan.populate({
        path: 'vehicle_type_id',
        select: 'name state_id',
        populate: {
          path: 'state_id',
          select: 'name'
        }
      });

      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        data: savedPlan
      });
    } catch (error) {
      console.error('Create plan error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Plan with this type already exists for the vehicle type'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create plan'
      });
    }
  }

  // PATCH /plans/:id - Update plan
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const { vehicle_type_id, plan_type, amount, is_active } = req.body;

      if (!vehicle_type_id || !plan_type || amount === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle type ID, plan type, and amount are required'
        });
      }

      if (amount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be positive'
        });
      }

      // Check if vehicle type exists
      const vehicleType = await VehicleType.findById(vehicle_type_id);
      if (!vehicleType) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle type not found'
        });
      }

      const plan = await Plan.findById(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      plan.vehicle_type_id = vehicle_type_id;
      plan.plan_type = plan_type;
      plan.amount = amount;
      if (is_active !== undefined) {
        plan.is_active = is_active;
      }
      
      const updatedPlan = await plan.save();
      await updatedPlan.populate({
        path: 'vehicle_type_id',
        select: 'name state_id',
        populate: {
          path: 'state_id',
          select: 'name'
        }
      });

      res.status(200).json({
        success: true,
        message: 'Plan updated successfully',
        data: updatedPlan
      });
    } catch (error) {
      console.error('Update plan error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Plan with this type already exists for the vehicle type'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update plan'
      });
    }
  }

  // PATCH /plans/:id/toggle - Toggle is_active status
  async togglePlan(req, res) {
    try {
      const { id } = req.params;

      const plan = await Plan.findById(id).populate({
        path: 'vehicle_type_id',
        select: 'name state_id',
        populate: {
          path: 'state_id',
          select: 'name'
        }
      });
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      plan.is_active = !plan.is_active;
      const updatedPlan = await plan.save();

      res.status(200).json({
        success: true,
        message: `Plan ${updatedPlan.is_active ? 'activated' : 'deactivated'} successfully`,
        data: updatedPlan
      });
    } catch (error) {
      console.error('Toggle plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle plan status'
      });
    }
  }
}

module.exports = new PlanController(); 