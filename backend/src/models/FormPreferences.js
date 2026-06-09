const mongoose = require('mongoose');

const formPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  formType: {
    type: String,
    required: [true, 'Form type is required'],
    enum: ['border_tax_booking', 'other_forms'],
    index: true
  },
  preferences: {
    visitingStateId: {
      type: String,
      required: [true, 'Visiting state ID is required']
    },
    visitingStateName: {
      type: String,
      required: [true, 'Visiting state name is required']
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required']
    },
    vehicleTypeId: {
      type: String,
      required: [true, 'Vehicle type ID is required']
    },
    vehicleTypeName: {
      type: String,
      required: [true, 'Vehicle type name is required']
    },
    whatsappNumber: {
      type: String,
      required: [true, 'WhatsApp number is required']
    },
    entryBorderId: {
      type: String,
      required: [true, 'Entry border ID is required']
    },
    entryBorderName: {
      type: String,
      required: [true, 'Entry border name is required']
    },
    planId: {
      type: String,
      required: [true, 'Plan ID is required']
    },
    planType: {
      type: String,
      required: [true, 'Plan type is required']
    }
  }
}, {
  timestamps: true
});

// Compound index for unique preferences per user per form type
formPreferencesSchema.index({ userId: 1, formType: 1 }, { unique: true });

// Pre-save middleware to validate referenced IDs
formPreferencesSchema.pre('save', async function(next) {
  try {
    const State = mongoose.model('State');
    const VehicleType = mongoose.model('VehicleType');
    const Plan = mongoose.model('Plan');

    // Validate state exists and is active
    const state = await State.findById(this.preferences.visitingStateId);
    if (!state || !state.is_active) {
      throw new Error('Invalid or inactive visiting state');
    }

    // Validate vehicle type exists and is active
    const vehicleType = await VehicleType.findById(this.preferences.vehicleTypeId);
    if (!vehicleType || !vehicleType.is_active) {
      throw new Error('Invalid or inactive vehicle type');
    }

    // Validate plan exists and is active
    const plan = await Plan.findById(this.preferences.planId);
    if (!plan || !plan.is_active) {
      throw new Error('Invalid or inactive plan');
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to get formatted preferences
formPreferencesSchema.methods.getFormattedPreferences = function() {
  return {
    id: this._id,
    userId: this.userId,
    formType: this.formType,
    preferences: this.preferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find or create preferences
formPreferencesSchema.statics.findOrCreatePreferences = async function(userId, formType, preferences) {
  try {
    let formPrefs = await this.findOne({ userId, formType });
    
    if (formPrefs) {
      // Update existing preferences
      formPrefs.preferences = preferences;
      await formPrefs.save();
    } else {
      // Create new preferences
      formPrefs = new this({
        userId,
        formType,
        preferences
      });
      await formPrefs.save();
    }
    
    return formPrefs;
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('FormPreferences', formPreferencesSchema); 