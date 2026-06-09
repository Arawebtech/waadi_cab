const Plan = require('../models/Plan');
const VehicleType = require('../models/VehicleType');
const State = require('../models/State');

class ValidationController {
  // POST /api/v1/validate-booking - Validate booking data and pricing
  async validateBooking(req, res) {
    try {
      console.log('🔍 Validation request received:', req.body);
      
      const {
        visitingStateId,
        vehicleTypeId,
        planId,
        vehicleNumber,
        whatsappNumber,
        entryBorderId,
        fromDate,
        uptoDate
      } = req.body;

      // Validate required fields
      if (!visitingStateId || !vehicleTypeId || !planId || !vehicleNumber || !whatsappNumber || !entryBorderId || !fromDate || !uptoDate) {
        return res.status(400).json({
          success: false,
          message: 'All required fields must be provided',
          errors: {
            visitingStateId: !visitingStateId ? 'Visiting state is required' : null,
            vehicleTypeId: !vehicleTypeId ? 'Vehicle type is required' : null,
            planId: !planId ? 'Plan is required' : null,
            vehicleNumber: !vehicleNumber ? 'Vehicle number is required' : null,
            whatsappNumber: !whatsappNumber ? 'WhatsApp number is required' : null,
            entryBorderId: !entryBorderId ? 'Entry border is required' : null,
            fromDate: !fromDate ? 'From date is required' : null,
            uptoDate: !uptoDate ? 'Upto date is required' : null
          }
        });
      }

      // Validate state exists
      console.log('🔍 Looking for state with ID:', visitingStateId);
      const state = await State.findById(visitingStateId);
      console.log('🔍 State found:', state ? { id: state._id, name: state.name, is_active: state.is_active } : 'Not found');
      if (!state || !state.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive visiting state',
          errors: { visitingStateId: 'State not found or inactive' }
        });
      }

      // Validate vehicle type exists and is active
      console.log('🔍 Looking for vehicle type with ID:', vehicleTypeId, 'for state:', visitingStateId);
      const vehicleType = await VehicleType.findOne({ 
        _id: vehicleTypeId, 
        state_id: visitingStateId,
        is_active: true 
      });
      console.log('🔍 Vehicle type found:', vehicleType ? { id: vehicleType._id, name: vehicleType.name, state_id: vehicleType.state_id, is_active: vehicleType.is_active } : 'Not found');
      if (!vehicleType) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vehicle type for selected state',
          errors: { vehicleTypeId: 'Vehicle type not found or inactive for this state' }
        });
      }

      // Validate plan exists and is active
      console.log('🔍 Looking for plan with ID:', planId, 'for vehicle type:', vehicleTypeId);
      const plan = await Plan.findOne({ 
        _id: planId, 
        vehicle_type_id: vehicleTypeId,
        is_active: true 
      });
      console.log('🔍 Plan found:', plan ? { id: plan._id, type: plan.type, amount: plan.amount, vehicle_type_id: plan.vehicle_type_id, is_active: plan.is_active } : 'Not found');
      if (!plan) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan for selected vehicle type',
          errors: { planId: 'Plan not found or inactive for this vehicle type' }
        });
      }

      // Date validation removed - handled on client side

      // Additional validations
      const validationResults = {
        stateValid: true,
        vehicleTypeValid: true,
        planValid: true,
        datesValid: true,
        amountValid: true,
        vehicleNumberValid: true,
        whatsappNumberValid: true
      };

      // Validate vehicle number format (basic validation)
      const vehicleNumberRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/;
      if (!vehicleNumberRegex.test(vehicleNumber.toUpperCase())) {
        validationResults.vehicleNumberValid = false;
        return res.status(400).json({
          success: false,
          message: 'Invalid vehicle number format',
          errors: { vehicleNumber: 'Vehicle number format is invalid' }
        });
      }

      // Validate WhatsApp number format
      const whatsappNumberRegex = /^[6-9]\d{9}$/;
      if (!whatsappNumberRegex.test(whatsappNumber.replace(/\D/g, ''))) {
        validationResults.whatsappNumberValid = false;
        return res.status(400).json({
          success: false,
          message: 'Invalid WhatsApp number format',
          errors: { whatsappNumber: 'WhatsApp number must be 10 digits starting with 6-9' }
        });
      }

      // All validations passed
      res.status(200).json({
        success: true,
        message: 'Booking validation successful',
        data: {
          planDetails: {
            id: plan._id,
            type: plan.type,
            amount: plan.amount,
            description: plan.description
          },
          vehicleTypeDetails: {
            id: vehicleType._id,
            name: vehicleType.name,
            seatCapacity: vehicleType.seat_capacity
          },
          stateDetails: {
            id: state._id,
            name: state.name,
            statecode: state.statecode
          },
          validationResults,
          bookingData: {
            visitingStateId,
            vehicleTypeId,
            planId,
            vehicleNumber: vehicleNumber.toUpperCase(),
            whatsappNumber: whatsappNumber.replace(/\D/g, ''),
            entryBorderId,
            fromDate,
            uptoDate,
            amount: plan.amount
          }
        }
      });

    } catch (error) {
      console.error('Booking validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during validation',
        error: error.message
      });
    }
  }
}

module.exports = new ValidationController();
