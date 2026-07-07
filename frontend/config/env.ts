import { base_url } from '@/environment';

function socketOrigin(apiBase: string): string {
  return apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
}

export const config = {
  apiUrl: base_url,
  graphqlUrl: `${socketOrigin(base_url)}/graphql`,
  socketUrl: socketOrigin(base_url),
  authRole: 'driver' as const,
  storageKeys: {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    user: 'userData',
    theme: 'theme',
    isOnline: 'driverIsOnline',
  },
  locationIntervalMs: 12_000,
  requestCountdownSec: 30,
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
};
