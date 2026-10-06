import React from 'react';
import { useToastStore } from '../../store/useToastStore';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success' || !toast.type;
        const isInfo = toast.type === 'info';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-slate-900/95 text-emerald-200 border-emerald-500/40 shadow-emerald-950/30'
                : isInfo
                ? 'bg-slate-900/95 text-indigo-200 border-indigo-500/40 shadow-indigo-950/30'
                : isWarning
                ? 'bg-slate-900/95 text-amber-200 border-amber-500/40 shadow-amber-950/30'
                : 'bg-slate-900/95 text-rose-200 border-rose-500/40 shadow-rose-950/30'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {isInfo && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}

              <span className="text-xs sm:text-sm font-medium leading-snug truncate text-slate-100">
                {toast.message}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    removeToast(toast.id);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
                >
                  {toast.action.label}
                </button>
              )}

              {toast.secondaryAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.secondaryAction?.onClick();
                    removeToast(toast.id);
                  }}
                  className="px-2 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  {toast.secondaryAction.label}
                </button>
              )}

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-md"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
