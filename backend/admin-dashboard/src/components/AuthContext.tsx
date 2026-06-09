import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  updateCredentials: (username: string, currentPassword: string, newPassword: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = 'wadi_admin_auth';
const CREDENTIALS_STORAGE_KEY = 'wadi_admin_credentials';
const DEFAULT_CREDENTIALS = {
  username: 'waadiadmin',
  password: 'javid9911',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const getStoredCredentials = useCallback(() => {
    try {
      const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (!stored) return DEFAULT_CREDENTIALS;

      const parsed = JSON.parse(stored) as { username?: string; password?: string };
      if (!parsed.username || !parsed.password) return DEFAULT_CREDENTIALS;

      return {
        username: parsed.username,
        password: parsed.password,
      };
    } catch {
      return DEFAULT_CREDENTIALS;
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      setIsAuthenticated(stored === 'true');
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const credentials = getStoredCredentials();
    const valid = username === credentials.username && password === credentials.password;
    if (valid) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } catch {}
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, [getStoredCredentials]);

  const updateCredentials = useCallback((username: string, currentPassword: string, newPassword: string) => {
    const credentials = getStoredCredentials();
    if (currentPassword !== credentials.password) return false;

    try {
      localStorage.setItem(
        CREDENTIALS_STORAGE_KEY,
        JSON.stringify({
          username: username.trim(),
          password: newPassword,
        })
      );
    } catch {}
    return true;
  }, [getStoredCredentials]);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
    setIsAuthenticated(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login,
      updateCredentials,
      logout,
    }),
    [isAuthenticated, login, updateCredentials, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


