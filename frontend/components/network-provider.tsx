'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useNetwork, NetworkStatus } from '@/hooks/use-network';

interface NetworkContextType extends NetworkStatus {
  refreshNetworkStatus: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetworkContext = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  return context;
};

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const networkStatus = useNetwork();

  return (
    <NetworkContext.Provider value={networkStatus}>
      {children}
    </NetworkContext.Provider>
  );
};








