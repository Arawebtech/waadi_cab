import { config } from '@/config/env';

const isBrowser = typeof window !== 'undefined';

export const storage = {
  async get(key: string): Promise<string | null> {
    if (!isBrowser) return null;
    return window.localStorage.getItem(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (!isBrowser) return;
    window.localStorage.setItem(key, value);
  },

  async remove(key: string): Promise<void> {
    if (!isBrowser) return;
    window.localStorage.removeItem(key);
  },

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async setJson(key: string, value: unknown): Promise<void> {
    await this.set(key, JSON.stringify(value));
  },

  async clearAuth(): Promise<void> {
    if (!isBrowser) return;
    for (const key of Object.values(config.storageKeys)) {
      window.localStorage.removeItem(key);
    }
  },
};
