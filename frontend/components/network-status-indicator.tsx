'use client';

import React from 'react';
import { Wifi, WifiOff, Smartphone } from 'lucide-react';
import { useNetworkContext } from './network-provider';

export const NetworkStatusIndicator: React.FC = () => {
  const { connected, connectionType, isInitialized } = useNetworkContext();

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isInitialized) {
    return (
      <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 text-xs text-yellow-800 z-40">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span>Checking...</span>
        </div>
      </div>
    );
  }

  return (
   <></>
  );
};








