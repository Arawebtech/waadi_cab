# Wadi Cab Backend API

A backend API for the Wadi Cab application, providing authentication and user management functionality.

## 🚀 Features

- **Authentication & Authorization**
  - Phone number-based signup/login with OTP verification
  - JWT token-based authentication with refresh tokens
  - Role-based access control (driver, owner, agent)

- **User Management**
  - User profile management
  - Vehicle registration and management
  - User dashboard

- **OTP Service**
  - Integration with MessageCentral for 4-digit OTP delivery
  - Rate limiting and retry mechanisms

- **Payment Integration**
  - PayU payment gateway integration with SHA512 hash generation
  - Automatic payment initiation on booking creation
  - Secure payment verification and callback handling
  - Transaction status tracking and booking status updates

- **Plan Management**
  - Traditional plans: Daily, Weekly, Monthly, Quarterly, Yearly
  - Day-based plans: Day 1 through Day 14 for flexible pricing
  - Vehicle type-specific pricing
  - Plan activation/deactivation management

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **MessageCentral** - OTP service provider
- **Express Validator** - Input validation
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- MessageCentral account for OTP service

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wadi_cab/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the backend root directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb+srv://waadiwaadiwaadiwaadi:fiobqiJywsLWHFpl@cluster0.4qff0b8.mongodb.net/wadi_cab?retryWrites=true&w=majority&appName=Cluster0

   # JWT Configuration
   JWT_SECRET=wadi_cab_super_secret_jwt_key_2024_make_it_very_long_and_secure_for_production_use
   JWT_EXPIRE=7d
   JWT_REFRESH_SECRET=wadi_cab_super_secret_refresh_jwt_key_2024_make_it_very_long_and_secure
   JWT_REFRESH_EXPIRE=30d

   # OTP Service Configuration
   OTP_BASE_URL=https://cpaas.messagecentral.com/verification/v3
   OTP_AUTH_TOKEN=your_auth_token_here
   OTP_CUSTOMER_ID=your_customer_id_here
   OTP_COUNTRY_CODE=91

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # PayU Payment Gateway Configuration
   PAYU_KEY=your_payu_key_here
   PAYU_SALT=your_payu_salt_here
   PAYU_SUCCESS_URL= https://api.waadi.in/api/v1/payment/success
   PAYU_FAILURE_URL= https://api.waadi.in/api/v1/payment/failure
   FRONTEND_URL=https://book.waadi.in
   ```

4. **Seed the Database** (optional)
   ```bash
   # Seed basic data
   npm run seed
   
   # Seed plans (including day-based plans)
   npm run seed:plans
   ```

5. **Start the Server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The server will start on ` https://api.waadi.in/`

## 📚 API Documentation

### Base URL
```
 https://api.waadi.in/api/v1
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## 🔗 API Endpoints

### **Authentication Routes** (`/auth`)

#### 1. **POST** `/auth/signup`
Register a new user (sends OTP)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "9876543210",
  "userType": "driver"
}
```

#### 2. **POST** `/auth/verify-signup`
Verify OTP and complete signup
```json
{
  "phoneNumber": "9876543210",
  "otp": "1234",
  "verificationId": "verification_id_from_step_1",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "driver"
}
```

#### 3. **POST** `/auth/login`
Login user (sends OTP)
```json
{
  "phoneNumber": "9876543210"
}
```

#### 4. **POST** `/auth/verify-login`
Verify OTP and complete login
```json
{
  "phoneNumber": "9876543210",
  "otp": "1234",
  "verificationId": "verification_id_from_login"
}
```

#### 5. **POST** `/auth/resend-otp`
Resend OTP
```json
{
  "phoneNumber": "9876543210",
  "purpose": "signup"
}
```

#### 6. **POST** `/auth/refresh-token`
Refresh access token
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### 7. **GET** `/auth/profile` 🔒
Get current user profile

#### 8. **POST** `/auth/logout` 🔒
Logout user

### **User Routes** (`/users`)

#### 1. **GET** `/users/profile` 🔒
Get user profile

#### 2. **PUT** `/users/profile` 🔒
Update user profile
```json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

#### 3. **POST** `/users/vehicles` 🔒
Add a new vehicle
```json
{
  "vehicleNumber": "DL01AB1234",
  "vehicleType": "private",
  "seatCapacity": "5(4+1)",
  "fuelType": "petrol",
  "isDefault": true
}
```

#### 4. **GET** `/users/vehicles` 🔒
Get user vehicles

#### 5. **PUT** `/users/vehicles/:vehicleId` 🔒
Update vehicle details

#### 6. **DELETE** `/users/vehicles/:vehicleId` 🔒
Delete a vehicle

#### 7. **GET** `/users/dashboard` 🔒
Get user dashboard data

#### 8. **GET** `/users/fetch-dashboard` 🔒
Fetch enhanced dashboard with active passes and recent activity

**Response:**
```json
{
  "success": true,
  "message": "Dashboard data fetched successfully",
  "data": {
    "summary": {
      "totalActivePasses": 3,
      "totalSpent": 12400,
      "totalSpentFormatted": "₹12,400",
      "expiringSoonCount": 1
    },
    "activePasses": [
      {
        "id": "booking_id",
        "bookingId": "WCB123456",
        "state": "Gujarat",
        "passType": "Weekly Pass",
        "vehicleInfo": "6+1 Seater",
        "vehicleNumber": "GJ01AB1234",
        "amount": 1050,
        "validFrom": "2024-12-01",
        "validUpto": "2024-12-22",
        "daysUntilExpiry": 2,
        "isExpiringSoon": true,
        "status": "Active"
      }
    ],
    "recentActivity": [
      {
        "type": "Payment Successful",
        "description": "Gujarat • ₹1,050",
        "state": "Gujarat",
        "amount": 1050,
        "status": "paid",
        "timeAgo": "2h ago"
      },
      {
        "type": "Pass Activated",
        "description": "Haryana • ₹4,000",
        "state": "Haryana",
        "amount": 4000,
        "status": "paid",
        "timeAgo": "1d ago"
      }
    ],
    "user": {
      "name": "John Doe",
      "phoneNumber": "9876543210",
      "greeting": "Good morning"
    }
  }
}
```

### **Payment Routes** (`/payment`)

#### 1. **POST** `/payment/initiate` 🔒
Initiate payment for a booking
```json
{
  "bookingId": "booking_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentUrl": "https://test.payu.in/_payment",
    "paymentData": {
      "key": "payu_key",
      "txnid": "ORDER_BOOKING123_timestamp",
      "amount": "100.00",
      "productinfo": "Border Tax Pass - Daily - State Name",
      "firstname": "John",
      "email": "john@example.com",
      "phone": "9876543210",
      "hash": "generated_hash",
      "surl": "success_url",
      "furl": "failure_url"
    }
  }
}
```

#### 2. **POST** `/payment/success`
Handle PayU success callback (called by PayU)

#### 3. **POST** `/payment/failure`
Handle PayU failure callback (called by PayU)

#### 4. **GET** `/payment/status/:txnid` 🔒
Get payment status by transaction ID

#### 5. **GET** `/payment/test` 🔒
Test PayU configuration

🔒 = Requires authentication

## 📄 Data Models

### User Model
- Personal information (name, phone)
- User type (driver, owner, agent)
- Vehicle management
- Authentication details

### OTP Model
- OTP verification and tracking
- Rate limiting support

## 🧪 Testing

Test the API using the provided Postman collection:
- Import `Wadi_Cab_API.postman_collection.json` into Postman
- Set up environment variables for base URL and tokens

## 🔒 Security Features

- Rate limiting to prevent abuse
- Input validation and sanitization
- JWT token authentication
- Secure password hashing
- CORS protection
- Security headers with Helmet

## 🚀 Future Enhancements

This system includes authentication, user management, booking management, and payment integration. Ready for expansion with:
- Admin dashboard
- Real-time notifications
- Advanced booking analytics
- Multi-payment gateway support

## 📝 License

This project is licensed under the MIT License. 