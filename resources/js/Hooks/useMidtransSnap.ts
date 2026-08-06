import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: SnapPayOptions) => void
    }
  }
}

type SnapPayOptions = {
  onSuccess?: (result: unknown) => void
  onPending?: (result: unknown) => void
  onError?: (result: unknown) => void
  onClose?: () => void
}

/**
 * Muat snap.js sekali (lazy, saat halaman top-up dibuka) — client key
 * aman diekspos ke frontend (beda dari server key). `clientKey` &
 * `isProduction` dikirim dari controller lewat props Inertia.
 */
export function useMidtransSnap(clientKey: string | null, isProduction: boolean): { pay: (token: string, options?: SnapPayOptions) => void } {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!clientKey || loadedRef.current || window.snap) return

    const script = document.createElement('script')
    script.src = isProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.dataset.clientKey = clientKey
    document.head.appendChild(script)
    loadedRef.current = true

    return () => {
      document.head.removeChild(script)
    }
  }, [clientKey, isProduction])

  return {
    pay: (token, options) => {
      if (!window.snap) {
        options?.onError?.('Snap.js belum siap dimuat — coba lagi sebentar.')
        return
      }
      window.snap.pay(token, options)
    },
  }
}
