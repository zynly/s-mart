import { useEffect, useState, type ReactNode } from 'react'
import { Clock, Lock, Menu, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react'
import { SidebarContent } from '@/Layouts/AdminLayout'
import { useSidebarStore } from '@/Store/useSidebarStore'
import { Sheet, SheetContent } from '@/Components/ui/sheet'
import { Button } from '@/Components/ui/button'
import { cn } from '@/Lib/utils'

type PosLayoutProps = {
  children: ReactNode
  actionToolbar?: ReactNode
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
  actionToolbar,
  outletName = 'Skillage Mart',
  cashierName = 'Kasir',
  sessionLabel = 'Sesi Aktif',
  hasActiveSession = false,
  onCloseSession,
}: PosLayoutProps) {
  const { collapsed, toggle } = useSidebarStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const clock = useClock()
  const online = useOnlineStatus()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      {/* Sidebar Desktop (Fixed Frozen) */}
      <aside
        className={cn(
          'hidden shrink-0 transition-all duration-300 lg:block border-r border-navy-950 bg-navy-900',
          collapsed ? 'w-[72px]' : 'w-[250px]',
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Sidebar drawer untuk tampilan mobile */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Area Utama Kasir */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header Utama 1-Baris (Single Row Header) */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/90 bg-surface neu-flat px-4 text-navy-950 gap-3 shadow-xs">
          {/* Sisi Kiri: Sidebar Toggle & Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-navy-800 hover:bg-navy-100/80 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden text-navy-800 hover:bg-navy-100/80 lg:inline-flex"
              onClick={toggle}
              aria-label={collapsed ? 'Bentangkan sidebar' : 'Lipat sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="size-4.5" /> : <PanelLeftClose className="size-4.5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-tr from-amber-500 to-amber-300 font-sans font-black text-navy-950 text-xs shadow-xs">
                S
              </div>
              <span className="text-sm font-black tracking-wide text-navy-950 uppercase font-sans whitespace-nowrap">{outletName}</span>
            </div>
          </div>

          {/* Sisi Tengah: Tombol Pintasan Keyboard (Action Toolbar) */}
          {actionToolbar && (
            <div className="flex-1 flex items-center justify-center min-w-0 overflow-x-auto px-2">
              {actionToolbar}
            </div>
          )}

          {/* Sisi Kanan: Status Kasir & Sesi */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-navy-200/80 bg-navy-50/90 px-3 py-1 text-xs text-navy-900 font-semibold shadow-2xs" title={sessionLabel}>
              <User className="size-3.5 text-navy-600" />
              <span className="truncate max-w-[110px]">Kasir: <strong className="text-navy-950">{cashierName}</strong></span>
            </div>

            {hasActiveSession && (
              <div className="hidden md:inline-flex rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 shadow-2xs" title={sessionLabel}>
                Shift Aktif
              </div>
            )}

            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
              <span className={`size-2 rounded-full ${online ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
              <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
            </div>

            <div className="hidden md:flex items-center gap-1 rounded-full border border-navy-200/80 bg-navy-50 px-2.5 py-0.5 text-[11px] font-mono font-bold text-navy-800 shadow-2xs">
              <Clock className="size-3 text-navy-600" />
              {clock}
            </div>

            <button
              type="button"
              onClick={onCloseSession}
              className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1 text-xs font-bold transition-all duration-150 shadow-2xs active:scale-95"
            >
              <Lock className="size-3 text-red-600" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
