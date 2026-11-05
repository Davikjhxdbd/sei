import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cx } from './ui';

type Tone = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<{
  push: (message: string, tone?: Tone) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cx(
              'mmv-fade-in pointer-events-auto flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] shadow-lift',
              item.tone === 'success'
                ? 'border-emerald-200 bg-surface text-emerald-900'
                : 'border-red-200 bg-surface text-red-800',
            )}
          >
            {item.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            )}
            <span className="flex-1 leading-relaxed">{item.message}</span>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() =>
                setItems((current) => current.filter((entry) => entry.id !== item.id))
              }
              className="text-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return context;
}
