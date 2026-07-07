const { listFareProfiles } = require('../cab-services/vehicleFareProfiles');
const Vehicle = require('../models/Vehicle');
const DriverLocation = require('../models/DriverLocation');
const googleService = require('../cab-services/google.service');

const TYPE_ICONS = { mini: '🚗', sedan: '🚙', suv: '🚐', tempo: '🛺', bus: '🚌' };
const SLUG_TO_DB = { mini: 'hatchback', hatchback: 'hatchback' };

function dbTypeToSlug(dbType) {
  const profile = listFareProfiles().find((p) => p.vehicleType === dbType);
  return profile?.slug || dbType;
}

function slugToDbType(slug) {
  return SLUG_TO_DB[slug] || slug;
}

async function buildVehicleCatalog() {
  const profiles = listFareProfiles();
  const seatAgg = await Vehicle.aggregate([
    { $match: { isActive: { $ne: false } } },
    { $group: { _id: '$vehicleType', seatCapacity: { $max: '$seatCapacity' }, count: { $sum: 1 } } },
  ]);
  const seatMap = Object.fromEntries(seatAgg.map((s) => [s._id, s]));

  return profiles.map((p) => ({
    id: p.slug,
    slug: p.slug,
    name: p.name,
    icon: TYPE_ICONS[p.slug] || '🚗',
    capacity: seatMap[p.vehicleType]?.seatCapacity || (p.slug === 'suv' ? 6 : 4),
    baseFare: p.baseFare,
    perKmRate: p.perKmRate,
    perMinRate: p.perMinRate,
    minFare: p.minFare,
    dbVehicleType: p.vehicleType,
    registeredCount: seatMap[p.vehicleType]?.count || 0,
  }));
}

async function getVehicleTypes() {
  return buildVehicleCatalog();
}

async function findVehicleType(slug) {
  const catalog = await buildVehicleCatalog();
  return catalog.find((v) => v.slug === slug || v.id === slug) || catalog[0];
}

async function countNearbyDriversBySlug(lat, lng, radiusKm = 8) {
  const drivers = await DriverLocation.find({
    isOnline: true,
    isAvailable: true,
    'location.coordinates.0': { $exists: true },
  }).lean();

  const vehicleIds = [...new Set(drivers.map((d) => d.vehicleId).filter(Boolean))];
  const vehicles = vehicleIds.length
    ? await Vehicle.find({ _id: { $in: vehicleIds } }).select('vehicleType seatCapacity').lean()
    : [];
  const vehicleMap = Object.fromEntries(vehicles.map((v) => [String(v._id), v]));

  const counts = {};
  for (const d of drivers) {
    const [dlng, dlat] = d.location.coordinates;
    const dist = googleService.haversineKm(lat, lng, dlat, dlng);
    if (dist > radiusKm) continue;
    const vt = d.vehicleId ? vehicleMap[String(d.vehicleId)]?.vehicleType : null;
    const slug = vt ? dbTypeToSlug(vt) : 'sedan';
    counts[slug] = (counts[slug] || 0) + 1;
  }
  return counts;
}

module.exports = { buildVehicleCatalog, getVehicleTypes, findVehicleType, countNearbyDriversBySlug, slugToDbType, dbTypeToSlug };
