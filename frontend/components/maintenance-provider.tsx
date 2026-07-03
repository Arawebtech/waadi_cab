'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useMaintenance } from '../hooks/use-maintenance';

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceTitle: string;
  estimatedReturnTime?: string;
  platformFee: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const useMaintenanceContext = () => {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenanceContext must be used within a MaintenanceProvider');
  }
  return context;
};

interface MaintenanceProviderProps {
  children: ReactNode;
}

export const MaintenanceProvider: React.FC<MaintenanceProviderProps> = ({ children }) => {
  const maintenanceStatus = useMaintenance();

  // Always provide the maintenance context, don't block the entire app
  // Individual pages can decide how to handle maintenance mode
  return (
    <MaintenanceContext.Provider value={maintenanceStatus}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export default MaintenanceProvider;
