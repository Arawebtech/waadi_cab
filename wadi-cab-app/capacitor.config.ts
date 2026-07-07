import { CapacitorConfig } from '@capacitor/cli';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const devServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const appHostname =
  process.env.CAPACITOR_APP_HOSTNAME?.trim() || 'book.waadi.in';

const config: CapacitorConfig = {
  appId: 'com.waadi.cab.customer',
  appName: 'Wadi Cab',
  webDir: 'out',
  server: devServerUrl
    ? {
        url: devServerUrl,
        cleartext: devServerUrl.startsWith('http://'),
      }
    : {
        androidScheme: 'https',
        hostname: appHostname,
      },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: true,
      spinnerColor: '#000000',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
  },
};

export default config;
