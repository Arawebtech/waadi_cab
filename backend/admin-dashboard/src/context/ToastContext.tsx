import React, { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'loading' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: { type?: ToastType; message: string; description?: string; duration?: number }) => string;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  loading: (message: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ type = 'info', message, description, duration = 4000 }: { type?: ToastType; message: string; description?: string; duration?: number }) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, description }]);
    if (type !== 'loading' && duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((message: string, description?: string) => toast({ type: 'success', message, description }), [toast]);
  const error = useCallback((message: string, description?: string) => toast({ type: 'error', message, description, duration: 6000 }), [toast]);
  const loading = useCallback((message: string) => toast({ type: 'loading', message, duration: 0 }), [toast]);

  const icons = { success: CheckCircle, error: XCircle, loading: Loader2, info: Info };
  const colors = {
    success: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200',
    error: 'border-red-200 bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-200',
    loading: 'border-blue-200 bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200',
    info: 'border-slate-200 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200',
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, loading, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                className={`pointer-events-auto flex gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md ${colors[t.type]}`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${t.type === 'loading' ? 'animate-spin' : ''}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t.message}</p>
                  {t.description && <p className="text-xs opacity-80 mt-0.5">{t.description}</p>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
