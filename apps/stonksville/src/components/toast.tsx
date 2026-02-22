"use client";

import * as React from "react";
import { Toast } from "@base-ui/react/toast";

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="bg-popover text-popover-foreground border-border relative z-[calc(1000-var(--toast-index))] mb-2 w-full max-w-xs origin-bottom rounded border p-3 shadow-lg select-none [transition:transform_0.3s,opacity_0.3s] data-[ending-style]:opacity-0 data-[starting-style]:translate-y-full data-[starting-style]:opacity-0"
    >
      <Toast.Title className="text-sm" />
    </Toast.Root>
  ));
}

const ToastContext = React.createContext<{
  success: (message: string) => void;
  error: (message: string) => void;
  show: (message: string) => void;
} | null>(null);

const ToastManager = ({ children }: { children: React.ReactNode }) => {
  const toastManager = Toast.useToastManager();
  const managerRef = React.useRef(toastManager);
  managerRef.current = toastManager;

  const api = React.useMemo(
    () => ({
      success: (message: string) => {
        managerRef.current.add({ title: message, data: { type: "success" } });
      },
      error: (message: string) => {
        managerRef.current.add({ title: message, data: { type: "error" } });
      },
      show: (message: string) => {
        managerRef.current.add({ title: message, data: { type: "default" } });
      },
    }),
    [],
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Toast.Provider timeout={3000}>
      <ToastManager>{children}</ToastManager>
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 left-1/2 z-50 flex w-full max-w-xs -translate-x-1/2 flex-col items-center">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
};

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
