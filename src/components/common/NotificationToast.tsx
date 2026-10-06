import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notification, showNotification } = useApp();

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isError = notification.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div
        className={`p-4 rounded-xl border shadow-lg flex items-start gap-3 ${
          isSuccess
            ? 'bg-white border-emerald-200 text-emerald-950'
            : isError
            ? 'bg-white border-rose-200 text-rose-950'
            : 'bg-white border-sky-200 text-sky-950'
        }`}
      >
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}

        <div className="flex-1 text-xs leading-relaxed">
          <p className="font-semibold">{notification.message}</p>
        </div>

        <button
          onClick={() => showNotification('')}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
