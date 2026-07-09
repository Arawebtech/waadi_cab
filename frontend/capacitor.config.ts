// import { CapacitorConfig } from '@capacitor/cli';
// import { loadEnvConfig } from '@next/env';

// // Load .env so CAPACITOR_* vars work during `npx cap sync`
// loadEnvConfig(process.cwd());

// /**
//  * Live reload (optional):
//  *   1. Set CAPACITOR_SERVER_URL in .env.local to your dev/tunnel frontend URL
//  *   2. Run: npm run dev && npx cap sync android
//  *
//  * Production / bundled APK:
//  *   Unset CAPACITOR_SERVER_URL, run npm run build && npx cap sync android
//  */
// const devServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();
// const appHostname =
//   process.env.CAPACITOR_APP_HOSTNAME?.trim() || 'book.waadi.in';

// const config: CapacitorConfig = {
//   appId: 'com.MP.Waadi_App',
//   appName: 'Waadi Cab',
//   webDir: 'out',
//   server: devServerUrl
//     ? {
//         url: devServerUrl,
//         cleartext: devServerUrl.startsWith('http://'),
//       }
//     : {
//         // WebView origin must match a backend CORS allowlist entry
//         androidScheme: 'https',
//         hostname: appHostname,
//       },
//   plugins: {
//     SplashScreen: {
//       launchShowDuration: 2000,
//       backgroundColor: '#ffffff',
//       showSpinner: true,
//       spinnerColor: '#3b82f6',
//     },
//     StatusBar: {
//       style: 'dark',
//       backgroundColor: '#ffffff',
//       overlaysWebView: true,
//     },
//     CapacitorUpdater: {
//       autoUpdate: false,
//       updateUrl: 'https://api.waadi.in/api/v1/app-version/check',
//     },
//   },
//   android: {
//     backgroundColor: '#ffffff',
//     allowMixedContent: true,
//   },
// };

// export default config;


import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waadi.cab',
  appName: 'Waadi Cab',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      spinnerColor: "#3b82f6"
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
      overlaysWebView: false
    },
    CapacitorUpdater: {
      autoUpdate: false,
      updateUrl: 'https://api.waadi.in/api/v1/app-version/check'
    }
  },
  // Android-specific settings for better navigation bar handling
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    // Capacitor 7.1+: reserve WebView space below status/navigation bars on Android 15+
    adjustMarginsForEdgeToEdge: 'auto',
  }
};

export default config;
