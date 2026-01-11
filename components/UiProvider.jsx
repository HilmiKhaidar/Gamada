'use client'

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)
const ConfirmContext = createContext(null)

function ToastItem({ toast, onDismiss }) {
  const variantStyles =
    toast.variant === 'error'
      ? 'border-red-200'
      : toast.variant === 'success'
        ? 'border-primary/30'
        : 'border-gray-200'

  const titleStyles =
    toast.variant === 'error'
      ? 'text-red-600'
      : toast.variant === 'success'
        ? 'text-primary'
        : 'text-secondary'

  return (
    <div className={`bg-white border ${variantStyles} rounded-lg shadow-sm px-4 py-3 w-[320px]`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {toast.title ? (
            <div className={`text-sm font-semibold ${titleStyles}`}>{toast.title}</div>
          ) : null}
          {toast.message ? (
            <div className="text-sm text-gray-800 break-words">{toast.message}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-gray-500 hover:text-gray-700 text-sm"
          aria-label="Tutup"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function ConfirmModal({ state, onCancel, onConfirm }) {
  if (!state?.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white w-[92vw] max-w-md rounded-lg shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="text-base font-semibold text-black">{state.title || 'Konfirmasi'}</div>
        </div>
        <div className="px-5 py-4">
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{state.message || ''}</div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={state.loading}
          >
            {state.cancelText || 'Batal'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={state.danger ? 'btn-danger' : 'btn-primary'}
            disabled={state.loading}
          >
            {state.confirmText || 'Ya'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    cancelText: 'Batal',
    danger: false,
    loading: false,
  })
  const confirmResolverRef = useRef(null)

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((opts) => {
    const id = ++toastIdRef.current
    const toast = {
      id,
      title: opts?.title || '',
      message: opts?.message || '',
      variant: opts?.variant || 'info',
      duration: typeof opts?.duration === 'number' ? opts.duration : 3500,
    }

    setToasts((prev) => [toast, ...prev].slice(0, 4))

    if (toast.duration > 0) {
      window.setTimeout(() => {
        dismissToast(id)
      }, toast.duration)
    }

    return id
  }, [dismissToast])

  const toastApi = useMemo(() => {
    return {
      show: showToast,
      success: (message, title = 'Berhasil') =>
        showToast({ title, message, variant: 'success' }),
      error: (message, title = 'Gagal') =>
        showToast({ title, message, variant: 'error', duration: 5000 }),
      info: (message, title = 'Info') =>
        showToast({ title, message, variant: 'info' }),
    }
  }, [showToast])

  const confirm = useCallback((opts) => {
    if (confirmResolverRef.current) {
      // If a confirm is already open, resolve it as cancelled.
      try {
        confirmResolverRef.current(false)
      } catch {
        // ignore
      }
      confirmResolverRef.current = null
    }

    setConfirmState({
      open: true,
      title: opts?.title || 'Konfirmasi',
      message: opts?.message || '',
      confirmText: opts?.confirmText || 'Ya',
      cancelText: opts?.cancelText || 'Batal',
      danger: Boolean(opts?.danger),
      loading: false,
    })

    return new Promise((resolve) => {
      confirmResolverRef.current = resolve
    })
  }, [])

  const closeConfirm = useCallback((value) => {
    const resolver = confirmResolverRef.current
    confirmResolverRef.current = null
    setConfirmState((prev) => ({ ...prev, open: false, loading: false }))
    if (resolver) resolver(value)
  }, [])

  const confirmApi = useMemo(() => ({ confirm }), [confirm])

  return (
    <ToastContext.Provider value={toastApi}>
      <ConfirmContext.Provider value={confirmApi}>
        {children}

        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>

        <ConfirmModal
          state={confirmState}
          onCancel={() => closeConfirm(false)}
          onConfirm={() => closeConfirm(true)}
        />
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within UiProvider')
  return ctx
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within UiProvider')
  return ctx
}
