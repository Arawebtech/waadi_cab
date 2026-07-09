import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import appLogger from './logger';

/**
 * Check if the app is running on a native platform
 */
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};


export const getPlatform = () => {
  return Capacitor.getPlatform();
};

/**
 * Initialize Capacitor plugins
 */
export const initializeCapacitor = async () => {
  if (!isNativePlatform()) return;

  try {
    // Status bar + safe area are configured in SafeAreaProvider (native-safe-area.ts)
    await SplashScreen.hide();

    // Initialize network monitoring
    await initializeNetworkMonitoring();

    // Android hardware back button
    if (Capacitor.getPlatform() === 'android') {
      await App.addListener('backButton', () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    }

    appLogger.mobile('Capacitor plugins initialized', {
      sourceFile: 'capacitor.ts',
      sourceFunction: 'initializeCapacitor',
    });
    console.log('Capacitor initialized successfully');
  } catch (error) {
    console.error('Error initializing Capacitor:', error);
  }
};

/**
 * Initialize network monitoring for native platforms
 */
export const initializeNetworkMonitoring = async () => {
  if (!isNativePlatform()) return;

  try {
    // Get initial network status
    const status = await Network.getStatus();
    console.log('🌐 Initial network status:', status);

    // Set up network status change listener
    await Network.addListener('networkStatusChange', (status) => {
      appLogger.network(status.connected ? 'Network connection restored' : 'Network connection lost', {
        sourceFile: 'capacitor.ts',
        sourceFunction: 'initializeNetworkMonitoring',
        data: { connected: status.connected, connectionType: status.connectionType },
      });
      console.log('🌐 Network status changed:', status);
      
      // You can emit custom events here if needed
      if (status.connected) {
        console.log('✅ Network connection restored');
      } else {
        console.log('❌ Network connection lost');
      }
    });

    console.log('Network monitoring initialized');
  } catch (error) {
    console.error('Error initializing network monitoring:', error);
  }
};

/**
 * Status Bar utilities
 */
export const statusBar = {
  setLight: () => StatusBar.setStyle({ style: Style.Light }),
  setDark: () => StatusBar.setStyle({ style: Style.Dark }),
  hide: () => StatusBar.hide(),
  show: () => StatusBar.show(),
  setBackgroundColor: (color: string) => StatusBar.setBackgroundColor({ color }),
};

/**
 * Keyboard utilities
 */
export const keyboard = {
  hide: () => Keyboard.hide(),
  show: () => Keyboard.show(),
  addDidShowListener: (callback: any) => Keyboard.addListener('keyboardDidShow', callback),
  addDidHideListener: (callback: any) => Keyboard.addListener('keyboardDidHide', callback),
};

/**
 * App utilities
 */
export const app = {
  getInfo: () => App.getInfo(),
  getState: () => App.getState(),
  addBackButtonListener: (callback: any) => App.addListener('backButton', callback),
  addStateChangeListener: (callback: any) => App.addListener('appStateChange', callback),
  exitApp: () => App.exitApp(),
  addUrlOpenListener: (callback: any) => App.addListener('appUrlOpen', callback),
};

/**
 * Handle payment deep links: wadicab://payment/(success|failure)?...
 */
export const registerPaymentDeepLinks = (onNavigate: (path: string, params: URLSearchParams) => void) => {
  if (!isNativePlatform()) return;
  App.addListener('appUrlOpen', async (event) => {
    try {
      const url = event.url || '';
      if (!url) return;
      // Example: wadicab://payment/success?txnid=...&amount=...
      const parsed = new URL(url);
      const pathname = parsed.pathname || '/';
      const host = parsed.host || '';

      // Build route path for custom scheme where host is the first segment (e.g., host="payment")
      // - wadicab://payment/success -> host: payment, pathname: /success => route: /payment/success
      // - http(s)://book.waadi.in/payment/success -> host: book.waadi.in, pathname: /payment/success => already fine
      let routePath = pathname;
      if (host && host !== 'localhost' && !pathname.startsWith('/payment')) {
        routePath = `/${host}${pathname}`;
      }

      if (routePath.startsWith('/payment/')) {
        try { await Browser.close(); } catch {}
        if (!parsed.searchParams.get('txnid') && parsed.searchParams.get('order_id')) {
          parsed.searchParams.set('txnid', parsed.searchParams.get('order_id') || '');
        }
        onNavigate(routePath, parsed.searchParams);
        return;
      }

      if (host === 'payment') {
        try { await Browser.close(); } catch {}
        const status = (parsed.searchParams.get('status') || '').toLowerCase();
        const fallbackPath =
          status === 'success'
            ? '/payment/success'
            : status === 'pending'
              ? '/payment/pending'
              : '/payment/failure';
        onNavigate(fallbackPath, parsed.searchParams);
      }
    } catch (e) {
      console.error('Deep link handling error:', e);
    }
  });
};

/**
 * Check if running in development mode
 */
export const isDev = () => {
  return process.env.NODE_ENV === 'development';
}; 