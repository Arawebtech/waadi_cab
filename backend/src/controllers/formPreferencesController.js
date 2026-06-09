const FormPreferences = require('../models/FormPreferences');

class FormPreferencesController {
  // POST /users/form-preferences - Save or update form preferences
  async saveFormPreferences(req, res) {
    try {
      const { formType, preferences } = req.body;
      const userId = req.user._id;

      // Validate required fields
      if (!formType || !preferences) {
        return res.status(400).json({
          success: false,
          message: 'Form type and preferences are required'
        });
      }

      // Validate form type
      if (!['border_tax_booking', 'other_forms'].includes(formType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid form type. Must be one of: border_tax_booking, other_forms'
        });
      }

      // Validate preferences structure
      const requiredFields = [
        'visitingStateId', 'visitingStateName', 'vehicleNumber', 
        'vehicleTypeId', 'vehicleTypeName', 'whatsappNumber', 
        'entryBorderId', 'entryBorderName', 'planId', 'planType'
      ];

      for (const field of requiredFields) {
        if (!preferences[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field}`
          });
        }
      }

      // Find or create preferences
      const formPrefs = await FormPreferences.findOrCreatePreferences(
        userId,
        formType,
        preferences
      );

      res.status(200).json({
        success: true,
        message: 'Form preferences saved successfully',
        data: formPrefs.getFormattedPreferences()
      });

    } catch (error) {
      console.error('Save form preferences error:', error);
      
      // Handle validation errors
      if (error.message.includes('Invalid or inactive')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Preferences already exist for this form type'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to save form preferences'
      });
    }
  }

  // GET /users/form-preferences - Get form preferences
  async getFormPreferences(req, res) {
    try {
      const { formType } = req.query;
      const userId = req.user._id;

      if (!formType) {
        return res.status(400).json({
          success: false,
          message: 'Form type is required'
        });
      }

      // Validate form type
      if (!['border_tax_booking', 'other_forms'].includes(formType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid form type. Must be one of: border_tax_booking, other_forms'
        });
      }

      const formPrefs = await FormPreferences.findOne({ userId, formType });

      if (!formPrefs) {
        return res.status(404).json({
          success: false,
          message: 'No form preferences found for this form type'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Form preferences retrieved successfully',
        data: formPrefs.getFormattedPreferences()
      });

    } catch (error) {
      console.error('Get form preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve form preferences'
      });
    }
  }

  // DELETE /users/form-preferences - Delete form preferences
  async deleteFormPreferences(req, res) {
    try {
      const { formType } = req.query;
      const userId = req.user._id;

      if (!formType) {
        return res.status(400).json({
          success: false,
          message: 'Form type is required'
        });
      }

      // Validate form type
      if (!['border_tax_booking', 'other_forms'].includes(formType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid form type. Must be one of: border_tax_booking, other_forms'
        });
      }

      const result = await FormPreferences.findOneAndDelete({ userId, formType });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'No form preferences found for this form type'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Form preferences deleted successfully'
      });

    } catch (error) {
      console.error('Delete form preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete form preferences'
      });
    }
  }

  // GET /users/form-preferences/all - Get all form preferences for user
  async getAllFormPreferences(req, res) {
    try {
      const userId = req.user._id;

      const formPrefs = await FormPreferences.find({ userId })
        .sort({ updatedAt: -1 });

      const formattedPrefs = formPrefs.map(pref => pref.getFormattedPreferences());

      res.status(200).json({
        success: true,
        message: 'All form preferences retrieved successfully',
        data: formattedPrefs,
        total: formattedPrefs.length
      });

    } catch (error) {
      console.error('Get all form preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve form preferences'
      });
    }
  }

  // DELETE /users/form-preferences/all - Delete all form preferences for user
  async deleteAllFormPreferences(req, res) {
    try {
      const userId = req.user._id;

      const result = await FormPreferences.deleteMany({ userId });

      res.status(200).json({
        success: true,
        message: 'All form preferences deleted successfully',
        data: {
          deletedCount: result.deletedCount
        }
      });

    } catch (error) {
      console.error('Delete all form preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete form preferences'
      });
    }
  }
}

module.exports = new FormPreferencesController(); 