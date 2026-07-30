import type { ReactNode } from 'react'
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
