const typeDefs = `#graphql
  type Location {
    address: String!
    lat: Float!
    lng: Float!
    placeId: String
  }

  type FareBreakdown {
    base: Float
    distance: Float
    time: Float
    surge: Float
    night: Float
    waiting: Float
    toll: Float
    intercity: Float
    discount: Float
    total: Float!
  }

  type User {
    id: ID!
    email: String!
    name: String
    role: String!
    phone: String
    avatar: String
    darkMode: Boolean
    referralCode: String
  }

  type VehicleType {
    id: ID!
    name: String!
    slug: String!
    icon: String
    capacity: Int
    baseFare: Float!
    perKmRate: Float!
    perMinRate: Float!
    minFare: Float!
    isIntercity: Boolean
  }

  type DriverInfo {
    id: ID!
    name: String
    phone: String
    avatar: String
    rating: Float
  }

  type Booking {
    id: ID!
    bookingNumber: String!
    status: String!
    tripType: String!
    intercityType: String
    pickup: Location!
    drop: Location!
    distanceKm: Float
    durationMin: Float
    fare: FareBreakdown!
    paymentMethod: String
    paymentStatus: String
    scheduledAt: String
    vehicleType: VehicleType
    driver: DriverInfo
    createdAt: String
  }

  type FareEstimate {
    vehicleId: ID!
    vehicleType: VehicleType!
    fare: FareBreakdown!
    etaMin: Int
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  type Wallet {
    balance: Float!
    currency: String!
  }

  type Coupon {
    id: ID!
    code: String!
    title: String!
    discountType: String!
    discountValue: Float!
  }

  type IntercityPackage {
    id: ID!
    name: String!
    fromCity: String!
    toCity: String!
    basePrice: Float!
    tripType: String!
  }

  input LocationInput {
    address: String!
    lat: Float!
    lng: Float!
    placeId: String
  }

  type Query {
    me: User
    vehicleTypes: [VehicleType!]!
    intercityPackages(fromCity: String, toCity: String): [IntercityPackage!]!
    coupons: [Coupon!]!
    myBookings(status: String): [Booking!]!
    booking(id: ID!): Booking
    wallet: Wallet
    fareEstimate(pickup: LocationInput!, drop: LocationInput!, tripType: String, couponCode: String): [FareEstimate!]!
  }

  type Mutation {
    requestOtp(email: String!, role: String!, purpose: String!): Boolean!
    register(email: String!, name: String!, role: String!, otp: String!): AuthPayload!
    login(email: String!, role: String!, otp: String!): AuthPayload!
    createBooking(
      pickup: LocationInput!
      drop: LocationInput!
      vehicleId: ID!
      tripType: String
      intercityType: String
      paymentMethod: String
      couponCode: String
      scheduledAt: String
    ): Booking!
    cancelBooking(id: ID!, reason: String): Booking!
    rateBooking(id: ID!, rating: Int!, review: String): Boolean!
    setDriverOnline(isOnline: Boolean!, isAvailable: Boolean): Boolean!
    acceptBooking(id: ID!): Booking!
  }
`;

module.exports = typeDefs;
