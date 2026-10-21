import { AnimatePresence, motion } from 'motion/react';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import styles from './Toaster.module.css';

interface Toast {
  readonly id: number;
  readonly message: string;
}

interface ToastContextValue {
  show(message: string): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const VISIBLE_MS = 4_000;
let nextId = 0;

/** Kurze, sich selbst schließende Meldungen am unteren Bildschirmrand. */
export function ToastProvider(props: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);

  const show = useCallback((message: string) => {
    const toast = { id: nextId++, message };
    setToasts((current) => [...current.slice(-2), toast]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== toast.id)), VISIBLE_MS);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {props.children}
      <div className={styles.region} role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              className={styles.toast}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast braucht einen ToastProvider');
  return context;
}
