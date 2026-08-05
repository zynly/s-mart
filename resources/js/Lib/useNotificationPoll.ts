import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/**
 * fase-16-v2.md §8-9 — lonceng wali harus tahu ada notifikasi baru
 * TANPA wali membuka dropdown (poll ringan, cuma satu angka lewat
 * `wali.notifications.count`, BUKAN seluruh daftar — README-v2.md
 * aturan #19: TanStack Query/polling hanya untuk hal ringan). Efek
 * saat count naik: bunyi lonceng halus (Web Audio API, tanpa aset
 * eksternal), toast Sonner, dan judul tab berubah "(N) Portal Wali".
 */
export function useNotificationPoll(intervalMs: number, countRouteName: string) {
  const [count, setCount] = useState(0)
  const prevCountRef = useRef<number | null>(null)

  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {
      // Browser memblokir audio tanpa interaksi pengguna — abaikan,
      // toast + badge tetap jalan.
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(route(countRouteName))
      const data = (await res.json()) as { count: number }

      if (prevCountRef.current !== null && data.count > prevCountRef.current) {
        playChime()
        toast.info('Ada notifikasi baru di Portal Wali.')
      }

      prevCountRef.current = data.count
      setCount(data.count)
    } catch {
      // Polling gagal (offline dsb) — diamkan, coba lagi di interval berikutnya.
    }
  }, [countRouteName, playChime])

  useEffect(() => {
    void refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs])

  useEffect(() => {
    document.title = count > 0 ? `(${count}) Portal Wali` : 'Portal Wali'
    return () => {
      document.title = 'Portal Wali'
    }
  }, [count])

  return { count, refresh }
}
