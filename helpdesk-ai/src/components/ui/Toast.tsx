"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  persistent?: boolean; // error는 true (수동 닫기)
}

interface ToastProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

const toastConfig: Record<ToastType, { icon: React.ReactNode; className: string; iconClass: string }> = {
  success: {
    icon: <CheckCircle size={18} />,
    className: "bg-white border-l-4 border-emerald-500 shadow-lg",
    iconClass: "text-emerald-500",
  },
  error: {
    icon: <XCircle size={18} />,
    className: "bg-white border-l-4 border-red-500 shadow-lg",
    iconClass: "text-red-500",
  },
  info: {
    icon: <Info size={18} />,
    className: "bg-white border-l-4 border-indigo-500 shadow-lg",
    iconClass: "text-indigo-500",
  },
};

export function Toast({ toast, onRemove }: ToastProps) {
  const [leaving, setLeaving] = useState(false);
  const config = toastConfig[toast.type];

  const handleRemove = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 250);
  };

  useEffect(() => {
    if (!toast.persistent) {
      const timer = setTimeout(handleRemove, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.persistent]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl min-w-[280px] max-w-[380px]
        ${config.className}
        ${leaving ? "animate-toast-out" : "animate-toast-in"}
      `}
    >
      <span className={`shrink-0 mt-0.5 ${config.iconClass}`}>{config.icon}</span>
      <p className="flex-1 text-sm text-gray-800 leading-snug">{toast.message}</p>
      <button
        onClick={handleRemove}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
        aria-label="닫기"
      >
        <X size={16} />
      </button>
    </div>
  );
}
