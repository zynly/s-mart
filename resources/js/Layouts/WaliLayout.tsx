import { useState, type ReactNode } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { Home, User, UserRound, Wallet, Eye, X, LogOut } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { NotificationBell } from '@/Components/common/NotificationBell'
import { LogoutConfirmDialog } from '@/Components/common/LogoutConfirmDialog'
import { useFlashToast } from '@/Lib/useFlashToast'
import { useNotificationPoll } from '@/Lib/useNotificationPoll'
import { cn } from '@/Lib/utils'
import type { PageProps } from '@/Types'

type WaliLayoutProps = {
  children: ReactNode
  active?: 'beranda' | 'anak' | 'topup' | 'akun'
}

const bottomNav = [
  { key: 'beranda', label: 'Beranda', href: '/wali', icon: Home },
  { key: 'anak', label: 'Anak', href: '/wali/anak', icon: UserRound },
  { key: 'topup', label: 'Top-Up', href: '/wali/topup', icon: Wallet },
  { key: 'akun', label: 'Akun', href: '/wali/akun', icon: User },
] as const

export default function WaliLayout({ children, active }: WaliLayoutProps) {
  const { guardianAuth, ownerWaliPreview, allowWaliTopup = true } = usePage<PageProps>().props
  const url = usePage().url
  const { count, refresh } = useNotificationPoll(30000, 'wali.notifications.count')
  const [logoutOpen, setLogoutOpen] = useState(false)

  const navItems = bottomNav.filter((item) => item.key !== 'topup' || allowWaliTopup)

  const currentActive = active ?? (
    url.startsWith('/wali/anak') ? 'anak' :
    url.startsWith('/wali/topup') ? 'topup' :
    url.startsWith('/wali/akun') ? 'akun' : 'beranda'
  )

  useFlashToast()

  return (
    <div className="flex min-h-screen flex-col bg-bg pb-16">
      {/* Owner Preview Banner */}
      {ownerWaliPreview && (
        <div className="flex shrink-0 items-center justify-between gap-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 px-3.5 py-2 text-white shadow-sm print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="size-4 shrink-0 text-amber-200" />
            <span className="text-xs font-extrabold tracking-wide whitespace-nowrap">
              Preview Owner
            </span>
            <span className="hidden sm:inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap">
              Portal Wali Santri
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.post(route('wali.owner-preview.exit'))}
            className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold whitespace-nowrap hover:bg-white/30 active:scale-95 transition-all shrink-0"
          >
            <X className="size-3.5" />
            <span>Kembali ke Admin</span>
          </button>
        </div>
      )}

      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <p className="text-sm font-medium text-content">{guardianAuth.guardian?.name ?? 'Wali Santri'}</p>
        <div className="flex items-center gap-1">
          <NotificationBell
            unreadCount={count}
            indexRouteName="wali.notifications.index"
            readRouteName="wali.notifications.read"
            readAllRouteName="wali.notifications.read-all"
            onCountChange={refresh}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLogoutOpen(true)}
            className="h-8.5 px-3 gap-1.5 rounded-xl border border-rose-200 bg-rose-50/90 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 font-extrabold text-xs shadow-xs cursor-pointer"
          >
            <LogOut className="size-3.5 stroke-[2.2]" />
            <span>Keluar</span>
          </Button>
        </div>
      </header>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        logoutUrl={route('wali.logout')}
        title="Konfirmasi Keluar Portal Wali"
        description="Apakah Ayah/Bunda yakin ingin keluar dari portal wali santri? Anda dapat masuk kembali kapan saja."
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 py-6 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 shadow-lg">
        <div className={cn(
          "mx-auto grid max-w-md px-2 py-1.5",
          navItems.length === 3 ? "grid-cols-3" : "grid-cols-4"
        )}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentActive === item.key

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition-all duration-150',
                  isActive
                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                )}
              >
                <div className={cn(
                  'flex size-8 items-center justify-center rounded-xl transition-all duration-200',
                  isActive ? 'bg-amber-500/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400 scale-105 shadow-xs' : ''
                )}>
                  <Icon className="size-4.5" />
                </div>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
