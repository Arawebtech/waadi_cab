import { useState, useEffect, useCallback } from 'react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export interface NetworkStatus {
  connected: boolean;
  connectionType: 'none' | 'wifi' | 'cellular' | 'unknown';
  isOnline: boolean;
}

export const useNetwork = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    connected: true,
    connectionType: 'unknown',
    isOnline: true,
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Check network status
  const checkNetworkStatus = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        // For web, use navigator.onLine
        const isOnline = navigator.onLine;
        setNetworkStatus({
          connected: isOnline,
          connectionType: isOnline ? 'wifi' : 'none',
          isOnline,
        });
        setIsInitialized(true);
        return;
      }

      // For native platforms, use Capacitor Network plugin
      const status = await Network.getStatus();
      
      setNetworkStatus({
        connected: status.connected,
        connectionType: status.connectionType,
        isOnline: status.connected,
      });
      setIsInitialized(true);
    } catch (error) {
      console.error('Error checking network status:', error);
      // Fallback to offline state
      setNetworkStatus({
        connected: false,
        connectionType: 'none',
        isOnline: false,
      });
      setIsInitialized(true);
    }
  }, []);

  // Initialize network monitoring
  useEffect(() => {
    checkNetworkStatus();

    if (!Capacitor.isNativePlatform()) {
      // Web platform: listen to online/offline events
      const handleOnline = () => {
        setNetworkStatus(prev => ({ ...prev, connected: true, isOnline: true }));
      };

      const handleOffline = () => {
        setNetworkStatus(prev => ({ ...prev, connected: false, isOnline: false }));
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // Native platform: use Capacitor Network listeners
      let networkListener: any;

      const setupNetworkListener = async () => {
        try {
          networkListener = await Network.addListener('networkStatusChange', (status) => {
            setNetworkStatus({
              connected: status.connected,
              connectionType: status.connectionType,
              isOnline: status.connected,
            });
          });
        } catch (error) {
          console.error('Error setting up network listener:', error);
        }
      };

      setupNetworkListener();

      return () => {
        if (networkListener) {
          networkListener.remove();
        }
      };
    }
  }, [checkNetworkStatus]);

  // Manual refresh function
  const refreshNetworkStatus = useCallback(() => {
    checkNetworkStatus();
  }, [checkNetworkStatus]);

  return {
    ...networkStatus,
    isInitialized,
    refreshNetworkStatus,
  };
};

