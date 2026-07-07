/**
 * Central validation exports for the Wadi Cab backend.
 * Route files should import schemas from here or from module-specific files.
 */

module.exports = {
  ...require('./common.schemas'),
  subscription: require('./subscription.validation'),
  vehicle: require('./vehicle.validation'),
  cabCustomer: require('./cab-customer.validation'),
  cabDriver: require('./cab-driver.validation'),
  cabBooking: require('./cab-booking.validation'),
  booking: require('./booking.validation'),
  payment: require('./payment.validation'),
  user: require('./user.validation'),
  geo: require('./geo.validation'),
  admin: require('./admin.validation'),
  adminManagement: require('./admin-management.validation'),
  intercity: require('./intercity.validation'),
  joi: require('./joi.schemas'),
};
