import { useState, useCallback } from "react";

interface ToastData {
  id: number;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message: string) => showToast(message, "success"), [showToast]);
  const error = useCallback((message: string) => showToast(message, "error"), [showToast]);
  const warning = useCallback((message: string) => showToast(message, "warning"), [showToast]);
  const info = useCallback((message: string) => showToast(message, "info"), [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
}
