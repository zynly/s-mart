import type { ReactNode } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { Home, User, UserRound, Wallet } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { NotificationBell } from '@/Components/common/NotificationBell'
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
  { key: 'anak', label: 'Anak', href: '/wali', icon: UserRound },
  { key: 'topup', label: 'Top-Up', href: '/wali/topup', icon: Wallet },
  { key: 'akun', label: 'Akun', href: '/wali/akun', icon: User },
] as const

export default function WaliLayout({ children, active }: WaliLayoutProps) {
  const { guardianAuth } = usePage<PageProps>().props
  const { count, refresh } = useNotificationPoll(30000, 'wali.notifications.count')

  useFlashToast()

  return (
    <div className="flex min-h-screen flex-col bg-bg pb-16">
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
          <Button size="sm" variant="ghost" onClick={() => router.post(route('wali.logout'))}>
            Keluar
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-surface">
        {bottomNav.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-xs',
                isActive ? 'text-primary' : 'text-content-muted',
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
