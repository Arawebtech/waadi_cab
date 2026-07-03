import { useState, useEffect, useCallback } from 'react';

interface MaintenanceStatus {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceTitle: string;
  estimatedReturnTime?: string;
  platformFee: number;
  isLoading: boolean;
  error: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.waadi.in/api/v1';
// Allow overriding app-status endpoint independently (e.g., 127.0.0.1:3001/app-status)
const APP_STATUS_URL =
  process.env.NEXT_PUBLIC_APP_STATUS_URL || `${API_BASE_URL}/app-status`;

export const useMaintenance = () => {
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus>({
    isMaintenanceMode: false,
    maintenanceMessage: '',
    maintenanceTitle: '',
    estimatedReturnTime: undefined,
    platformFee: 20, // Default platform fee
    isLoading: true,
    error: null,
  });

  const checkMaintenanceStatus = useCallback(async () => {
    try {
      setMaintenanceStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch(APP_STATUS_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMaintenanceStatus({
          isMaintenanceMode: data.data.isMaintenanceMode,
          maintenanceMessage: data.data.maintenanceMessage,
          maintenanceTitle: data.data.maintenanceTitle,
          estimatedReturnTime: data.data.estimatedReturnTime,
          platformFee: data.data.platformFee || 20,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(data.message || 'Failed to check maintenance status');
      }
    } catch (error) {
      setMaintenanceStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check maintenance status',
      }));
    }
  }, []);

  // Check maintenance status on mount and periodically
  useEffect(() => {
    checkMaintenanceStatus();
    
    // Check every 60 seconds (reduced frequency to prevent excessive API calls)
    const interval = setInterval(checkMaintenanceStatus, 60000);
    
    return () => clearInterval(interval);
  }, []); // Remove checkMaintenanceStatus from dependencies to prevent infinite loop

  return {
    ...maintenanceStatus,
    refetch: checkMaintenanceStatus,
  };
};
