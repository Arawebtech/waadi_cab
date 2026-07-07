const Joi = require('joi');
const { validateBody } = require('../middleware/validate.middleware');
const schemas = require('../validations/cab-driver.validation');

/** @deprecated Use validateBody from middleware with cab-driver.validation schemas */
function legacyValidate(schema) {
  return validateBody(schema);
}

module.exports = {
  validateUpdateProfile: legacyValidate(schemas.updateProfileBody),
  validateRegistrationStep: legacyValidate(schemas.registrationStepBody),
  validateActiveVehicle: legacyValidate(schemas.activeVehicleBody),
  validateOnlineStatus: legacyValidate(schemas.onlineStatusBody),
  validateAvailability: legacyValidate(schemas.availabilityBody),
  validateLocationUpdate: legacyValidate(schemas.locationUpdateBody),
  validateRideStatus: legacyValidate(schemas.rideStatusBody),
};
