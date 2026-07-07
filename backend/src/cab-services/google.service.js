const env = require('../config/env');
const { decodePolyline } = require('../utils/polyline');
const logger = require('../utils/logger');

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchGoogle(endpoint, params) {
  if (!env.google.apiKey) return null;
  const url = new URL(`https://maps.googleapis.com/maps/api/${endpoint}/json`);
  Object.entries({ ...params, key: env.google.apiKey }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    logger.warn(`Google API ${endpoint}: ${data.status}`);
    return null;
  }
  return data;
}

async function getRouteMetrics(origin, destination) {
  const data = await fetchGoogle('distancematrix', {
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${destination.lat},${destination.lng}`,
    mode: 'driving',
  });

  if (data?.rows?.[0]?.elements?.[0]?.status === 'OK') {
    const el = data.rows[0].elements[0];
    return {
      distanceKm: el.distance.value / 1000,
      durationMin: Math.ceil(el.duration.value / 60),
      source: 'google',
    };
  }

  const distanceKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMin: Math.ceil(distanceKm * 2.5),
    source: 'estimate',
  };
}

async function geocodeAddress(address) {
  const data = await fetchGoogle('geocode', { address });
  const result = data?.results?.[0];
  if (!result) return null;
  return {
    address: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    placeId: result.place_id,
  };
}

async function getDirections(origin, destination) {
  const data = await fetchGoogle('directions', {
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode: 'driving',
    departure_time: 'now',
  });

  const route = data?.routes?.[0];
  if (route?.overview_polyline?.points) {
    const leg = route.legs?.[0];
    const points = decodePolyline(route.overview_polyline.points);
    return {
      points,
      distanceKm: leg ? leg.distance.value / 1000 : haversineKm(origin.lat, origin.lng, destination.lat, destination.lng),
      durationMin: leg ? Math.ceil((leg.duration_in_traffic?.value || leg.duration.value) / 60) : null,
      source: 'google',
    };
  }

  return {
    points: [
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng },
    ],
    distanceKm: haversineKm(origin.lat, origin.lng, destination.lat, destination.lng),
    durationMin: Math.ceil(haversineKm(origin.lat, origin.lng, destination.lat, destination.lng) * 2.5),
    source: 'estimate',
  };
}

async function searchPlaces(query, location) {
  const params = { input: query, inputtype: 'textquery', fields: 'formatted_address,name,geometry,place_id' };
  if (location) params.locationbias = `circle:50000@${location.lat},${location.lng}`;

  const data = await fetchGoogle('place/findplacefromtext', params);
  return (data?.candidates || []).map((p) => ({
    placeId: p.place_id,
    description: `${p.name}, ${p.formatted_address}`,
    mainText: p.name,
    secondaryText: p.formatted_address,
    lat: p.geometry?.location?.lat,
    lng: p.geometry?.location?.lng,
  }));
}

module.exports = { getRouteMetrics, getDirections, geocodeAddress, searchPlaces, haversineKm };
