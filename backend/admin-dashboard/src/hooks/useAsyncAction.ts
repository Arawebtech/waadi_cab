import { useCallback, useState } from 'react';
import { useToast } from '../context/ToastContext';

export function useAsyncAction() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const toast = useToast();

  const run = useCallback(async <T,>(
    key: string,
    fn: () => Promise<T>,
    opts?: { successMessage?: string; errorMessage?: string; loadingMessage?: string }
  ): Promise<T | null> => {
    if (loadingKey) return null;
    setLoadingKey(key);
    const loadingId = opts?.loadingMessage ? toast.loading(opts.loadingMessage) : undefined;
    try {
      const result = await fn();
      if (loadingId) toast.dismiss(loadingId);
      if (opts?.successMessage) toast.success(opts.successMessage);
      return result;
    } catch (err: any) {
      if (loadingId) toast.dismiss(loadingId);
      toast.error(opts?.errorMessage || 'Action failed', err?.response?.data?.message || err?.message);
      return null;
    } finally {
      setLoadingKey(null);
    }
  }, [loadingKey, toast]);

  const isLoading = (key: string) => loadingKey === key;

  return { run, isLoading, loadingKey };
}
