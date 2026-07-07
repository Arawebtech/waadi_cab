'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ConfirmationModal } from './ConfirmationModal';
import type { ConfirmActionOptions, ConfirmOptions } from './types';

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
  action?: () => void | Promise<void>;
  content?: React.ReactNode;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmAction: (options: ConfirmActionOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [loading, setLoading] = useState(false);
  const stateRef = useRef<ConfirmState | null>(null);
  stateRef.current = state;

  const close = useCallback((result: boolean) => {
    const current = stateRef.current;
    if (!current) return;
    current.resolve(result);
    setState(null);
    setLoading(false);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setLoading(false);
      setState({ ...options, resolve });
    });
  }, []);

  const confirmAction = useCallback(async (options: ConfirmActionOptions) => {
    const { action, ...rest } = options;
    const ok = await new Promise<boolean>((resolve) => {
      setLoading(false);
      setState({ ...rest, resolve, action });
    });
    return ok;
  }, []);

  const handleConfirm = useCallback(async () => {
    const current = stateRef.current;
    if (!current || loading) return;

    if (current.action) {
      setLoading(true);
      try {
        await current.action();
        close(true);
      } catch {
        close(false);
      }
      return;
    }

    close(true);
  }, [close, loading]);

  const handleCancel = useCallback(() => {
    if (loading) return;
    close(false);
  }, [close, loading]);

  const value = useMemo(() => ({ confirm, confirmAction }), [confirm, confirmAction]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmationModal
        open={Boolean(state)}
        title={state?.title ?? ''}
        description={state?.description}
        confirmLabel={state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        variant={state?.variant}
        icon={state?.icon}
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      >
        {state?.content}
      </ConfirmationModal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
}

/** Alias for imperative confirmation */
export async function confirmAction(
  options: ConfirmActionOptions,
  confirmFn: ConfirmContextValue['confirmAction']
) {
  return confirmFn(options);
}
