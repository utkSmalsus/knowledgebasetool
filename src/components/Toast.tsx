import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

interface Toast {
  id: number
  message: string
  tone: 'default' | 'success' | 'error'
}

const ToastCtx = createContext<((message: string, tone?: Toast['tone']) => void) | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const push = useCallback((message: string, toneArg: Toast['tone'] = 'default') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, message, tone: toneArg }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto animate-slide-in-right rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur ${
              t.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/95 dark:text-emerald-200'
                : t.tone === 'error'
                  ? 'border-rose-200 bg-rose-50/95 text-rose-800 dark:border-rose-900 dark:bg-rose-950/95 dark:text-rose-200'
                  : 'border-slate-200 bg-white/95 text-slate-800 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
