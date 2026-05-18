'use client';

import { useToastStore } from '@/store/toast.store';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map((t) => {
        const Icon =
          t.type === 'success' ? CheckCircle2 : t.type === 'error' ? XCircle : Info;
        const colors =
          t.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : t.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-blue-200 bg-blue-50 text-blue-800';
        const iconColor =
          t.type === 'success'
            ? 'text-green-500'
            : t.type === 'error'
              ? 'text-red-500'
              : 'text-blue-500';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${colors}`}
          >
            <Icon size={17} className={`flex-shrink-0 mt-0.5 ${iconColor}`} />
            <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
