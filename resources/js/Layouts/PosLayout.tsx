import { useEffect, useState, type ReactNode } from 'react'
import { Clock, Lock, User } from 'lucide-react'

type PosLayoutProps = {
  children: ReactNode
  outletName?: string
  cashierName?: string
  sessionLabel?: string
  hasActiveSession?: boolean
  onCloseSession?: () => void
}

function useClock(): string {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const setOn = () => setOnline(true)
    const setOff = () => setOnline(false)
    window.addEventListener('online', setOn)
    window.addEventListener('offline', setOff)
    return () => {
      window.removeEventListener('online', setOn)
      window.removeEventListener('offline', setOff)
    }
  }, [])

  return online
}

export default function PosLayout({
  children,
  outletName = 'Skillage Mart',
  cashierName = '-',
  sessionLabel = 'Belum ada sesi',
  hasActiveSession = false,
  onCloseSession,
}: PosLayoutProps) {
  // REVISI-UI-KASIR.md §1.8 — kromatik layar kasir (header/footer navy,
  // konten gray-50/putih) SENGAJA terlepas dari preferensi terang/gelap
  // pengguna, supaya tampilan kasir konsisten di semua kondisi. Class
  // `dark` tetap dipaksa di <html> (dipakai komponen shadcn generik yang
  // belum di-restyle eksplisit di halaman ini), TAPI warna literal di
  // bawah (bg-gray-50, bg-white, dst.) tidak terpengaruh oleh class itu.
  // Preferensi asli TIDAK diubah di localStorage — dikembalikan persis
  // saat keluar (unmount).
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    root.classList.add('dark')

    return () => {
      root.classList.toggle('dark', wasDark)
    }
  }, [])

  const clock = useClock()
  const online = useOnlineStatus()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <header className="flex h-14 shrink-0 items-center gap-4 bg-navy-900 px-6">
        <span className="text-xl font-bold tracking-wide text-white">{outletName.toUpperCase()}</span>

        <div className="ml-4 flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-navy-700 bg-navy-800 px-3 py-1.5 text-sm text-white" title={sessionLabel}>
            <User className="size-4" />
            Kasir: {cashierName}
          </div>

          {hasActiveSession && (
            <div className="rounded-full border border-blue-500 bg-navy-700 px-3 py-1.5 text-sm text-white" title={sessionLabel}>
              Shift Aktif
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-full bg-navy-800 px-3 py-1.5 text-sm text-white">
            <span className={`size-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
            {online ? 'Online' : 'Offline'}
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-navy-800 px-3 py-1.5 text-sm text-white">
            <Clock className="size-4" />
            {clock}
          </div>
        </div>

        <div className="ml-auto">
          <button
            type="button"
            onClick={onCloseSession}
            className="flex items-center gap-2 rounded-full border border-white/30 bg-transparent px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
          >
            <Lock className="size-4" />
            Keluar
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
