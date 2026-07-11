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
 * Parse payment return URL and invoke in-app navigation.
 * Supports: wadicab://payment/success?... and http(s)://host/payment/success?...
 */
export function handlePaymentReturnUrl(
  url: string,
  onNavigate: (path: string, params: URLSearchParams) => void
): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || '/';
    const host = parsed.host || '';

    const normalizeParams = (params: URLSearchParams) => {
      if (!params.get('txnid')) {
        const orderId = params.get('orderId') || params.get('order_id') || '';
        if (orderId) params.set('txnid', orderId);
      }
      if (!params.get('orderId') && params.get('txnid')) {
        params.set('orderId', params.get('txnid') || '');
      }
    };

    // HTTP(S) return from payment browser
    if (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      pathname.startsWith('/payment/')
    ) {
      normalizeParams(parsed.searchParams);
      onNavigate(pathname, parsed.searchParams);
      return true;
    }

    // wadicab://payment/success?...
    if (host === 'payment') {
      normalizeParams(parsed.searchParams);
      const subPath = pathname.replace(/^\/+/, '').toLowerCase();
      if (subPath === 'success' || subPath === 'pending' || subPath === 'failure') {
        onNavigate(`/payment/${subPath}`, parsed.searchParams);
        return true;
      }

      const status = (parsed.searchParams.get('status') || '').toLowerCase();
      const fallbackPath =
        status === 'success'
          ? '/payment/success'
          : status === 'pending'
            ? '/payment/pending'
            : '/payment/failure';
      onNavigate(fallbackPath, parsed.searchParams);
      return true;
    }

    // Custom scheme path form: wadicab://payment/success → host=payment handled above
    let routePath = pathname;
    if (host && host !== 'localhost' && !pathname.startsWith('/payment')) {
      routePath = `/${host}${pathname}`;
    }

    if (routePath.startsWith('/payment/')) {
      normalizeParams(parsed.searchParams);
      onNavigate(routePath, parsed.searchParams);
      return true;
    }

    return false;
  } catch (e) {
    console.error('Payment return URL parse error:', e);
    return false;
  }
}

/**
 * Register payment deep links + cold-start launch URL handling.
 */
export const registerPaymentDeepLinks = (
  onNavigate: (path: string, params: URLSearchParams) => void
) => {
  if (!isNativePlatform()) return;

  const processUrl = async (url: string) => {
    const handled = handlePaymentReturnUrl(url, onNavigate);
    if (handled) {
      try {
        await Browser.close();
      } catch {
        /* in-app browser may already be closed */
      }
    }
  };

  App.addListener('appUrlOpen', (event) => {
    if (event.url) {
      processUrl(event.url);
    }
  });

  // App opened from deep link while cold (was fully closed)
  App.getLaunchUrl()
    .then((result) => {
      if (result?.url) {
        processUrl(result.url);
      }
    })
    .catch(() => {});
};

/**
 * Check if running in development mode
 */
export const isDev = () => {
  return process.env.NODE_ENV === 'development';
}; 