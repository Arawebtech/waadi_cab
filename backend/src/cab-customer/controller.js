const authService = require('./auth.service');
const rideService = require('./ride.service');
const googleService = require('../cab-services/google.service');
const chatService = require('../cab-driver/chat.service');
const { paginated } = require('../utils/apiResponse');

function success(res, data, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function handleError(res, err) {
  const status = err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'Something went wrong',
    ...(err.retryAfterSeconds ? { retryAfterSeconds: err.retryAfterSeconds } : {}),
    ...(err.rideId ? { rideId: err.rideId } : {}),
  });
}

exports.requestOtp = async (req, res) => {
  try {
    const data = await authService.requestOtp({
      email: req.body.email,
      purpose: req.body.purpose,
    });
    return success(res, data, 'OTP sent');
  } catch (err) {
    return handleError(res, err);
  }
};

exports.resendOtp = exports.requestOtp;

exports.register = async (req, res) => {
  try {
    const data = await authService.registerWithOtp({
      email: req.body.email,
      name: req.body.name,
      otp: req.body.otp,
      phone: req.body.phone,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return success(res, data, 'Registered', 201);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.login = async (req, res) => {
  try {
    const data = await authService.loginWithOtp({
      email: req.body.email,
      otp: req.body.otp,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return success(res, data, 'Logged in');
  } catch (err) {
    return handleError(res, err);
  }
};

exports.refresh = async (req, res) => {
  try {
    const data = await authService.refreshSession(req.body.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.logout = async (req, res) => {
  await authService.logout(req.body.refreshToken);
  return success(res, {});
};

exports.me = async (req, res) => {
  return success(res, authService.sanitizeCustomer(req.customer));
};

exports.updateProfile = async (req, res) => {
  try {
    const Customer = require('../models/Customer');
    const customer = await Customer.findByIdAndUpdate(
      req.customer._id,
      {
        fullName: req.body.name || req.body.fullName,
        phone: req.body.phone,
        language: req.body.language,
        darkMode: req.body.darkMode,
      },
      { new: true, runValidators: true }
    );
    return success(res, authService.sanitizeCustomer(customer));
  } catch (err) {
    return handleError(res, err);
  }
};

exports.vehicleTypes = async (_req, res) => {
  try {
    const data = await rideService.getVehicleTypes();
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.fareEstimate = async (req, res) => {
  try {
    const data = await rideService.getFareEstimate(req.body);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getDirections = async (req, res) => {
  try {
    const origin = { lat: +req.query.originLat, lng: +req.query.originLng };
    const destination = { lat: +req.query.destLat, lng: +req.query.destLng };
    const data = await googleService.getDirections(origin, destination);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.searchPlaces = async (req, res) => {
  try {
    const origin =
      req.query.lat && req.query.lng
        ? { lat: +req.query.lat, lng: +req.query.lng }
        : undefined;
    const data = await googleService.searchPlaces(req.query.q, origin);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.geocodeAddress = async (req, res) => {
  try {
    const data = await googleService.geocodeAddress(req.query.q);
    if (!data) return res.status(404).json({ success: false, message: 'Address not found' });
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.liveDrivers = async (req, res) => {
  try {
    const data = await rideService.getLiveDrivers(+req.query.lat, +req.query.lng, +req.query.radiusKm || 5);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.intercityPackages = async (req, res) => {
  try {
    const data = await rideService.listIntercityPackages(req.query.fromCity, req.query.toCity);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.createBooking = async (req, res) => {
  try {
    const io = req.app.get('io');
    const data = await rideService.createRide(req.customer._id, req.body, io);
    return success(res, data, 'Ride requested', 201);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.myBookings = async (req, res) => {
  try {
    const data = await rideService.getCustomerRides(req.customer._id, {
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return paginated(res, data.items, data.pagination, 'Rides retrieved');
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getBooking = async (req, res) => {
  try {
    const data = await rideService.getRideForCustomer(req.customer._id, req.params.id);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.activeBooking = async (req, res) => {
  try {
    const data = await rideService.getActiveRide(req.customer._id);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const io = req.app.get('io');
    const data = await rideService.cancelRide(req.customer._id, req.params.id, req.body.reason, io);
    return success(res, data, 'Ride cancelled');
  } catch (err) {
    return handleError(res, err);
  }
};

exports.rateBooking = async (req, res) => {
  try {
    const data = await rideService.rateRide(req.customer._id, req.params.id, req.body);
    return success(res, data, 'Rating submitted');
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getTripOtp = async (req, res) => {
  try {
    const CabRide = require('../models/CabRide');
    const ride = await CabRide.findOne({ _id: req.params.id, customerId: req.customer._id });
    if (!ride?.tripOtp) {
      return res.status(404).json({ success: false, message: 'OTP not available' });
    }
    return success(res, { otp: ride.tripOtp });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.savedPlaces = async (req, res) => {
  try {
    const data = await rideService.listSavedPlaces(req.customer._id);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.savePlace = async (req, res) => {
  try {
    const data = await rideService.savePlace(req.customer._id, req.body);
    return success(res, data, 'Place saved');
  } catch (err) {
    return handleError(res, err);
  }
};

exports.wallet = async (req, res) => {
  try {
    const data = await rideService.getWallet(req.customer._id);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.transactions = async (_req, res) => success(res, []);

exports.getInvoice = async (req, res) => {
  try {
    const ride = await rideService.getRideForCustomer(req.customer._id, req.params.id);
    if (ride.status !== 'TRIP_COMPLETED') {
      return res.status(400).json({ success: false, message: 'Invoice available after trip completion' });
    }
    return success(res, rideService.buildInvoice(ride));
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const data = await chatService.listMessagesForCustomer(req.customer._id, req.params.id, req.query);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const msg = await chatService.sendCustomerMessage(req.customer._id, req.params.id, req.body);
    req.app.get('io')?.to(`ride:${req.params.id}`).emit('cab-ride:chat', msg);
    return success(res, msg, 'Message sent', 201);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.payForRide = async (req, res) => {
  try {
    const data = await rideService.payForRide(
      req.customer._id,
      req.params.id,
      req.body.paymentMethod,
      req.app.get('io')
    );
    return success(res, data, 'Payment recorded');
  } catch (err) {
    return handleError(res, err);
  }
};

const cabPaymentService = require('./cabPayment.service');

exports.initiateRidePayment = async (req, res) => {
  try {
    const rideId = req.body.rideId || req.params.id;
    const data = await cabPaymentService.initiateRidePayment(req.customer._id, rideId, req);
    return success(res, data, 'Payment initiated');
  } catch (err) {
    return handleError(res, err);
  }
};

exports.verifyRidePayment = async (req, res) => {
  try {
    const txnId = req.body.txnId || req.body.txnid;
    const data = await cabPaymentService.verifyAndSettleRidePayment(req.customer._id, txnId);
    if (data.ride) {
      await rideService.emitRideStatus(req.app.get('io'), data.ride);
    }
    return success(res, data, data.alreadyPaid ? 'Already paid' : 'Payment verified');
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getRidePaymentStatus = async (req, res) => {
  try {
    const data = await cabPaymentService.getRidePaymentStatus(req.customer._id, req.params.txnId);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
};
