import { useEffect, type ReactNode } from 'react'
import { Wifi } from 'lucide-react'
import { Button } from '@/Components/ui/button'

type PosLayoutProps = {
  children: ReactNode
  outletName?: string
  cashierName?: string
  sessionLabel?: string
  onCloseSession?: () => void
}

export default function PosLayout({
  children,
  outletName = 'Skillage Mart',
  cashierName = '-',
  sessionLabel = 'Belum ada sesi',
  onCloseSession,
}: PosLayoutProps) {
  // REVISI-R1-v2.md §2.5 — layar kasir SELALU navy-gelap, terlepas dari
  // preferensi terang/gelap pengguna (dipakai berjam-jam, latar terang
  // bikin mata cepat lelah & angka total tenggelam). Preferensi asli
  // TIDAK diubah di localStorage (`setTheme`/`toggleTheme` tidak
  // dipanggil) — hanya class `dark` di <html> yang dipaksa selama
  // layar kasir terbuka, dikembalikan persis ke preferensi semula saat
  // keluar (unmount).
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    root.classList.add('dark')

    return () => {
      root.classList.toggle('dark', wasDark)
    }
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-navy-700 px-3 text-xs text-navy-50">
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold">{outletName}</span>
          <span className="text-navy-200">Kasir: {cashierName}</span>
          <span className="text-navy-200">{sessionLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <Wifi className="size-4 text-success" />
          <Button size="xs" variant="secondary" onClick={onCloseSession}>
            Tutup Sesi
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
