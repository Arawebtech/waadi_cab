'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { customerAuthApi } from '../api/auth';
import {
  clearCustomerSession,
  getCustomerRefreshToken,
  getCustomerToken,
  getStoredCustomerUser,
  setCustomerSession,
} from '../api/client';
import {
  connectCustomerSocket,
  disconnectCustomerSocket,
} from '../socket';
import type { CustomerUser, Location, Ride } from '../types';

interface CustomerRideContextValue {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pickup: Location | null;
  drop: Location | null;
  activeRide: Ride | null;
  setPickup: (loc: Location | null) => void;
  setDrop: (loc: Location | null) => void;
  setActiveRide: (ride: Ride | null) => void;
  login: (payload: { accessToken: string; refreshToken: string; user: CustomerUser }) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const CustomerRideContext = createContext<CustomerRideContextValue | null>(null);

export function CustomerRideProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pickup, setPickup] = useState<Location | null>(null);
  const [drop, setDrop] = useState<Location | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  const login = useCallback(
    (payload: { accessToken: string; refreshToken: string; user: CustomerUser }) => {
      setCustomerSession(payload.accessToken, payload.refreshToken, payload.user);
      setUser(payload.user);
      connectCustomerSocket();
    },
    []
  );

  const logout = useCallback(async () => {
    const refresh = getCustomerRefreshToken();
    if (refresh) {
      try {
        await customerAuthApi.logout(refresh);
      } catch {
        /* ignore */
      }
    }
    clearCustomerSession();
    disconnectCustomerSocket();
    setUser(null);
    setActiveRide(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getCustomerToken()) {
      setUser(null);
      return;
    }
    const profile = await customerAuthApi.me();
    setUser(profile);
    setCustomerSession(getCustomerToken()!, getCustomerRefreshToken()!, profile);
  }, []);

  useEffect(() => {
    const stored = getStoredCustomerUser<CustomerUser>();
    if (stored && getCustomerToken()) {
      setUser(stored);
      connectCustomerSocket();
      customerAuthApi.me().then(setUser).catch(() => logout());
    }
    setIsLoading(false);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && getCustomerToken()),
      isLoading,
      pickup,
      drop,
      activeRide,
      setPickup,
      setDrop,
      setActiveRide,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, pickup, drop, activeRide, login, logout, refreshUser]
  );

  return <CustomerRideContext.Provider value={value}>{children}</CustomerRideContext.Provider>;
}

export function useCustomerRide() {
  const ctx = useContext(CustomerRideContext);
  if (!ctx) throw new Error('useCustomerRide must be used within CustomerRideProvider');
  return ctx;
}
