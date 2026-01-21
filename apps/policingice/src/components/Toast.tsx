"use client";

import * as React from "react";
import { Toast } from "@base-ui/react/toast";

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="absolute bottom-0 left-1/2 z-[calc(1000-var(--toast-index))] w-full max-w-xs origin-bottom -translate-x-1/2 [transform:translateX(-50%)_translateY(calc(var(--toast-index)*-0.5rem-var(--toast-index)*100%-var(--toast-swipe-movement-y)))] rounded border border-neutral-200 bg-white p-3 shadow-lg select-none [transition:transform_0.3s,opacity_0.3s] data-[ending-style]:opacity-0 data-[starting-style]:translate-y-full data-[starting-style]:opacity-0"
    >
      <Toast.Title className="text-sm text-neutral-900" />
    </Toast.Root>
  ));
}

const ToastContext = React.createContext<{
  success: (message: string) => void;
  error: (message: string) => void;
  show: (message: string) => void;
} | null>(null);

function ToastManager({ children }: { children: React.ReactNode }) {
  const toastManager = Toast.useToastManager();

  const api = React.useMemo(
    () => ({
      success: (message: string) => {
        toastManager.add({ title: message, data: { type: "success" } });
      },
      error: (message: string) => {
        toastManager.add({ title: message, data: { type: "error" } });
      },
      show: (message: string) => {
        toastManager.add({ title: message, data: { type: "default" } });
      },
    }),
    [toastManager],
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider timeout={3000}>
      <ToastManager>{children}</ToastManager>
      <Toast.Portal>
        <Toast.Viewport className="fixed right-0 bottom-4 left-0 z-50 mx-auto flex w-full max-w-xs flex-col items-center">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
