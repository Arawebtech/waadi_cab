const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found - ${req.method} ${req.originalUrl}`,
    availableRoutes: {
      auth: [
        'POST /api/v1/auth/signup',
        'POST /api/v1/auth/verify-signup', 
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/verify-login',
        'POST /api/v1/auth/refresh-token',
        'GET /api/v1/auth/profile',
        'POST /api/v1/auth/logout'
      ],
      users: [
        'GET /api/v1/users/profile',
        'PUT /api/v1/users/profile',
        'POST /api/v1/users/vehicles',
        'GET /api/v1/users/vehicles',
        'PUT /api/v1/users/vehicles/:id',
        'DELETE /api/v1/users/vehicles/:id',
        'GET /api/v1/users/dashboard',
        'GET /api/v1/users/fetch-dashboard'
      ],
      states: [
        'GET /api/v1/states',
        'POST /api/v1/states',
        'PATCH /api/v1/states/:id/toggle'
      ],
      districts: [
        'GET /api/v1/districts?state_id=...',
        'POST /api/v1/districts',
        'PATCH /api/v1/districts/:id/toggle'
      ],
      vehicleTypes: [
        'GET /api/v1/vehicle-types?state_id=...',
        'POST /api/v1/vehicle-types',
        'PATCH /api/v1/vehicle-types/:id/toggle'
      ],
      plans: [
        'GET /api/v1/plans?vehicle_type_id=...',
        'POST /api/v1/plans',
        'PATCH /api/v1/plans/:id/toggle'
      ],
      bookings: [
        'POST /api/v1/bookings 🔒',
        'GET /api/v1/bookings 🔒',
        'GET /api/v1/bookings/stats 🔒',
        'GET /api/v1/bookings/:id 🔒',
        'PATCH /api/v1/bookings/:id/status 🔒',
        'DELETE /api/v1/bookings/:id 🔒'
      ],
      payment: [
        'POST /api/v1/payment/initiate 🔒',
        'POST /api/v1/payment/success',
        'POST /api/v1/payment/failure',
        'GET /api/v1/payment/status/:txnid 🔒',
        'GET /api/v1/payment/test 🔒'
      ]
    }
  });
};

module.exports = notFound; 