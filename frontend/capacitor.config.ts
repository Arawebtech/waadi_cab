import { CapacitorConfig } from '@capacitor/cli';
import { loadEnvConfig } from '@next/env';

// Load .env.local / .env so CAPACITOR_SERVER_URL works during `npx cap sync`
loadEnvConfig(process.cwd());

/**
 * Live reload (no rebuild per JS change):
 *   1. Start Next dev server + dev tunnel on port 3000
 *   2. Set CAPACITOR_SERVER_URL in .env.local to your frontend tunnel URL
 *   3. Run: npm run cap:sync:dev
 *   4. Open Android Studio → Run app once
 *   5. Edit React/TS code → save → refresh app (or HMR if supported)
 *
 * Production / bundled build:
 *   Unset CAPACITOR_SERVER_URL, run npm run build:mobile, install APK
 */
const devServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const appHostname =
  process.env.CAPACITOR_APP_HOSTNAME?.trim() || 'mdk7v2f6-3000.inc1.devtunnels.ms';

const config: CapacitorConfig = {
  appId: 'com.waadi.cab',
  appName: 'Waadi Cab',
  webDir: 'out',
  server: devServerUrl
    ? {
        url: devServerUrl,
        cleartext: devServerUrl.startsWith('http://'),
      }
    : {
        // Bundled static app — origin must match Cashfree-whitelisted domain
        androidScheme: 'https',
        hostname: appHostname,
      },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: true,
      spinnerColor: '#3b82f6',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
    CapacitorUpdater: {
      autoUpdate: false,
      updateUrl: 'https://api.waadi.in/api/v1/app-version/check',
    },
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
  },
};

export default config;
