import { base_url } from '@/environment';

function socketOrigin(apiBase: string): string {
  return apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
}

export const config = {
  apiUrl: base_url,
  graphqlUrl: `${socketOrigin(base_url)}/graphql`,
  socketUrl: socketOrigin(base_url),
  authRole: 'customer' as const,
  storageKeys: {
    accessToken: 'customer_ride_access_token',
    refreshToken: 'customer_ride_refresh_token',
    user: 'customer_ride_user',
    theme: 'theme',
  },
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCTjIuJCIGVBepXcshha11KlWPl3rYtjMQ',
};
