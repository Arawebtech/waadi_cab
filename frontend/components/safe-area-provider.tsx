'use client';

import React, { createContext, useContext, useLayoutEffect, useState, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  applyNativeSafeAreaInsets,
  bindNativeSafeAreaListeners,
  configureNativeStatusBar,
} from '@/lib/native-safe-area';

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

function readInsetState() {
  const root = document.documentElement;
  const top =
    parseFloat(root.style.getPropertyValue('--app-safe-area-top')) ||
    parseFloat(getComputedStyle(root).getPropertyValue('--app-safe-area-top')) ||
    0;
  const bottom =
    parseFloat(root.style.getPropertyValue('--app-safe-area-bottom')) ||
    parseFloat(getComputedStyle(root).getPropertyValue('--app-safe-area-bottom')) ||
    0;
  return { top, bottom, left: 0, right: 0 };
}

export const SafeAreaProvider: React.FC<SafeAreaProviderProps> = ({ children }) => {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  const [isMobile, setIsMobile] = useState(isNative);
  const [isAndroid, setIsAndroid] = useState(platform === 'android');
  const [isIOS, setIsIOS] = useState(platform === 'ios');

  useLayoutEffect(() => {
    setIsMobile(isNative);
    setIsAndroid(platform === 'android');
    setIsIOS(platform === 'ios');

    if (!isNative) return;

    let cancelled = false;

    const syncInsets = () => {
      if (cancelled) return;
      applyNativeSafeAreaInsets();
      setSafeAreaInsets(readInsetState());
    };

    syncInsets();

    void configureNativeStatusBar().then(() => {
      syncInsets();
      // Re-measure after native layout settles (rotation, keyboard, status bar).
      window.requestAnimationFrame(() => {
        syncInsets();
        window.setTimeout(syncInsets, 100);
      });
    });

    const unbind = bindNativeSafeAreaListeners();

    return () => {
      cancelled = true;
      unbind();
    };
  }, [isNative, platform]);

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
