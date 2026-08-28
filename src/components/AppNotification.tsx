"use client";

import {
  CheckCircle2,
  X,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

type AppNotificationProps = {
  message: string;
  onClose: () => void;
};

// ============================================================
// COMPONENT
// ============================================================

export default function AppNotification({
  message,
  onClose,
}: AppNotificationProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed right-5 top-5 z-[200] w-[360px] max-w-[calc(100%-2rem)]">

      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

          <CheckCircle2
            size={21}
          />

        </div>

        <p className="min-w-0 flex-1 text-[15px] font-bold text-emerald-900">
          {message}
        </p>

        <button
          type="button"
          onClick={
            onClose
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close notification"
        >
          <X size={18} />
        </button>

      </div>

    </div>
  );
}