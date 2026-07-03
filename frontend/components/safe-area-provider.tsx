'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

interface SafeAreaContextType {
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
}

const SafeAreaContext = createContext<SafeAreaContextType | undefined>(undefined);

export const useSafeArea = () => {
  const context = useContext(SafeAreaContext);
  if (context === undefined) {
    throw new Error('useSafeArea must be used within a SafeAreaProvider');
  }
  return context;
};

interface SafeAreaProviderProps {
  children: ReactNode;
}

export const SafeAreaProvider: React.FC<SafeAreaProviderProps> = ({ children }) => {
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect platform
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    
    setIsMobile(isNative);
    setIsAndroid(platform === 'android');
    setIsIOS(platform === 'ios');

    // Get safe area insets from CSS environment variables
    const getSafeAreaInsets = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      const top = parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0');
      const right = parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0');
      const bottom = parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0');
      const left = parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0');

      setSafeAreaInsets({ top, right, bottom, left });
    };

    // Initial calculation
    getSafeAreaInsets();

    // Recalculate on resize (orientation change)
    window.addEventListener('resize', getSafeAreaInsets);
    window.addEventListener('orientationchange', getSafeAreaInsets);

    // Recalculate when CSS custom properties change
    const observer = new MutationObserver(getSafeAreaInsets);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => {
      window.removeEventListener('resize', getSafeAreaInsets);
      window.removeEventListener('orientationchange', getSafeAreaInsets);
      observer.disconnect();
    };
  }, []);

  const value: SafeAreaContextType = {
    safeAreaInsets,
    isMobile,
    isAndroid,
    isIOS,
  };

  return (
    <SafeAreaContext.Provider value={value}>
      {children}
    </SafeAreaContext.Provider>
  );
};








