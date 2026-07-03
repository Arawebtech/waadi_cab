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
    allowMixedContent: true
  }
};

export default config;
