import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { RefreshCw, Radio, Users, Car, Navigation } from 'lucide-react';
import AdminAPI from '../services/api';
import StatusBadge from '../components/cab/StatusBadge';
import { GlassCard, SkeletonRows, ErrorState } from '../components/cab/PageStates';
import { formatCurrency } from '../components/cab/StatCard';
import DriverDetailsModal from '../components/cab/DriverDetailsModal';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const mapContainerStyle = { width: '100%', height: '100%', minHeight: '500px', borderRadius: '1rem' };

const MARKER_COLORS: Record<string, string> = {
  offline: '#94a3b8',
  online: '#3b82f6',
  available: '#10b981',
  on_trip: '#8b5cf6',
};

const CabLiveFleet: React.FC = () => {
  const [fleet, setFleet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverStatus, setDriverStatus] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [viewDriverId, setViewDriverId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await AdminAPI.getCabLiveFleet({ driverStatus, vehicleType });
      setFleet(data);
    } catch {
      setError('Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  }, [driverStatus, vehicleType]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const drivers = fleet?.drivers?.filter((d: any) => d.lat && d.lng) || [];
  const activeRides = fleet?.activeRides || [];

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Live Fleet Tracking</h2>
          <p className="text-sm text-slate-500">Real-time driver locations and active rides</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto refresh
          </label>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {fleet?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
          <StatCard icon={Radio} label="Online" value={fleet.stats.online} color="text-blue-600" />
          <StatCard icon={Users} label="Available" value={fleet.stats.available} color="text-emerald-600" />
          <StatCard icon={Car} label="On Trip" value={fleet.stats.onTrip} color="text-purple-600" />
          <StatCard icon={Navigation} label="Active Rides" value={fleet.stats.activeRides} color="text-amber-600" />
        </div>
      )}

      <div className="flex flex-wrap gap-3 flex-shrink-0">
        <select value={driverStatus} onChange={(e) => setDriverStatus(e.target.value)} className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm px-3 py-2">
          <option value="">All driver statuses</option>
          <option value="online">Online</option>
          <option value="available">Available</option>
          <option value="on_trip">On Trip</option>
          <option value="offline">Offline</option>
        </select>
        <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm px-3 py-2">
          <option value="">All vehicle types</option>
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
          <option value="hatchback">Hatchback</option>
          <option value="tempo">Tempo</option>
          <option value="bus">Bus</option>
        </select>
      </div>

      <GlassCard className="flex-1 min-h-[500px] overflow-hidden relative">
        {loading && !fleet ? (
          <SkeletonRows rows={10} cols={1} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !MAPS_KEY ? (
          <div className="flex items-center justify-center h-full min-h-[400px] text-slate-500">
            <p>Set REACT_APP_GOOGLE_MAPS_API_KEY in admin-dashboard/.env</p>
          </div>
        ) : (
          <LoadScript googleMapsApiKey={MAPS_KEY}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={drivers[0] ? { lat: drivers[0].lat, lng: drivers[0].lng } : DEFAULT_CENTER}
              zoom={12}
              options={{ disableDefaultUI: false, zoomControl: true, mapTypeControl: false }}
            >
              {drivers.map((d: any) => {
                const circlePath = typeof google !== 'undefined' ? google.maps.SymbolPath.CIRCLE : 0;
                return (
                <Marker
                  key={d._id}
                  position={{ lat: d.lat, lng: d.lng }}
                  icon={{
                    path: circlePath,
                    scale: 10,
                    fillColor: MARKER_COLORS[d.fleetStatus] || '#64748b',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#fff',
                  }}
                  onClick={() => setSelectedDriver(d)}
                />
              );})}
              {activeRides.map((ride: any) => {
                if (!ride.pickup?.lat || !ride.drop?.lat) return null;
                return (
                  <Polyline
                    key={ride._id}
                    path={[
                      { lat: ride.pickup.lat, lng: ride.pickup.lng },
                      { lat: ride.drop.lat, lng: ride.drop.lng },
                    ]}
                    options={{ strokeColor: '#8b5cf6', strokeWeight: 3, strokeOpacity: 0.7 }}
                  />
                );
              })}
              {selectedDriver && (
                <InfoWindow
                  position={{ lat: selectedDriver.lat, lng: selectedDriver.lng }}
                  onCloseClick={() => setSelectedDriver(null)}
                >
                  <div className="p-1 min-w-[180px] text-slate-900">
                    <p className="font-bold">{selectedDriver.driverId?.firstName} {selectedDriver.driverId?.lastName}</p>
                    <p className="text-xs">{selectedDriver.driverId?.phoneNumber}</p>
                    <StatusBadge status={selectedDriver.fleetStatus} />
                    {selectedDriver.vehicleId && (
                      <p className="text-xs mt-1">{selectedDriver.vehicleId.vehicleNumber}</p>
                    )}
                    {selectedDriver.subscription && (
                      <p className="text-xs">{selectedDriver.subscription.planName}</p>
                    )}
                    {selectedDriver.wallet && (
                      <p className="text-xs">Wallet: {formatCurrency(selectedDriver.wallet.balance)}</p>
                    )}
                    <button
                      onClick={() => { setViewDriverId(selectedDriver.driverId?._id); setSelectedDriver(null); }}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        )}
      </GlassCard>

      <DriverDetailsModal
        driverId={viewDriverId}
        open={!!viewDriverId}
        onClose={() => setViewDriverId(null)}
      />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <GlassCard className="p-4 flex items-center gap-3">
    <Icon className={`h-8 w-8 ${color}`} />
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value ?? 0}</p>
    </div>
  </GlassCard>
);

export default CabLiveFleet;
