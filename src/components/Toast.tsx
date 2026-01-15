'use client'
import * as React from 'react'
import { Toast } from '@base-ui/react/toast'

type ToastType = 'default' | 'success' | 'error'

interface ToastData {
  type?: ToastType
}

function ToastList() {
  const { toasts } = Toast.useToastManager<ToastData>()

  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="absolute bottom-0 left-1/2 z-[calc(1000-var(--toast-index))] w-full max-w-xs -translate-x-1/2 origin-bottom rounded border border-neutral-200 bg-white p-3 shadow-lg select-none data-[ending-style]:opacity-0 data-[starting-style]:translate-y-full data-[starting-style]:opacity-0 [transition:transform_0.3s,opacity_0.3s] [transform:translateX(-50%)_translateY(calc(var(--toast-index)*-0.5rem-var(--toast-index)*100%-var(--toast-swipe-movement-y)))]"
    >
      <Toast.Title
        className={`text-sm ${
          toast.data?.type === 'error'
            ? 'text-red-600'
            : toast.data?.type === 'success'
              ? 'text-green-600'
              : 'text-neutral-900'
        }`}
      />
    </Toast.Root>
  ))
}

const ToastContext = React.createContext<{
  success: (message: string) => void
  error: (message: string) => void
  show: (message: string) => void
} | null>(null)

function ToastManager({ children }: { children: React.ReactNode }) {
  const toastManager = Toast.useToastManager<ToastData>()

  const api = React.useMemo(
    () => ({
      success: (message: string) => {
        toastManager.add({ title: message, data: { type: 'success' } })
      },
      error: (message: string) => {
        toastManager.add({ title: message, data: { type: 'error' } })
      },
      show: (message: string) => {
        toastManager.add({ title: message, data: { type: 'default' } })
      },
    }),
    [toastManager],
  )

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider timeout={3000}>
      <ToastManager>{children}</ToastManager>
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 left-0 right-0 z-50 mx-auto flex w-full max-w-xs flex-col items-center">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
