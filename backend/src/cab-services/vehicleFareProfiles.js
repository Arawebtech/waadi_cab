const FARE_PROFILES = {
  hatchback: { name: 'Mini', slug: 'mini', baseFare: 40, perKmRate: 12, perMinRate: 1.5, minFare: 60 },
  sedan: { name: 'Sedan', slug: 'sedan', baseFare: 50, perKmRate: 14, perMinRate: 1.8, minFare: 80 },
  suv: { name: 'SUV', slug: 'suv', baseFare: 70, perKmRate: 18, perMinRate: 2, minFare: 120 },
  tempo: { name: 'Tempo', slug: 'tempo', baseFare: 80, perKmRate: 20, perMinRate: 2.2, minFare: 150 },
  bus: { name: 'Bus', slug: 'bus', baseFare: 120, perKmRate: 25, perMinRate: 2.5, minFare: 200 },
};

function fareProfileForVehicle(vehicle) {
  if (!vehicle) return FARE_PROFILES.sedan;
  return FARE_PROFILES[vehicle.vehicleType] || FARE_PROFILES.sedan;
}

function listFareProfiles() {
  return Object.entries(FARE_PROFILES).map(([key, profile]) => ({
    _id: key,
    ...profile,
    vehicleType: key,
    isActive: true,
    isIntercity: false,
  }));
}

module.exports = { FARE_PROFILES, fareProfileForVehicle, listFareProfiles };
