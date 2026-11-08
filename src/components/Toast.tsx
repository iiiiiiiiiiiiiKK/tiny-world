import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Toast() {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => clearToast(), 2600);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  const Icon = toast?.kind === 'ok' ? CheckCircle2 : toast?.kind === 'error' ? XCircle : Info;
  const color =
    toast?.kind === 'ok' ? 'text-emerald-600' : toast?.kind === 'error' ? 'text-rose-500' : 'text-sky-600';

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -14, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
        >
          <div className="flex max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg backdrop-blur">
            <Icon className={`h-4.5 w-4.5 shrink-0 ${color}`} />
            <span>{toast.text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
