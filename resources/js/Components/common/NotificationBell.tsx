import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Bell } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu'
import { cn } from '@/Lib/utils'
import type { PageProps } from '@/Types'

type NotificationItem = {
  id: string
  data: { title: string; message: string; url: string; dedupe_key: string }
  read_at: string | null
  created_at: string
}

function xsrfToken() {
  return decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '')
}

function timeAgo(iso: string) {
  const diffMinutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMinutes < 1) return 'Baru saja'
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} jam lalu`
  return `${Math.round(diffHours / 24)} hari lalu`
}

type NotificationBellProps = {
  className?: string
  // fase-16-v2.md §8-9 — dipakai ulang untuk lonceng wali (bukan cuma
  // admin). Default tetap perilaku admin lama (route admin.notifications.*,
  // count dari prop global `unreadNotificationsCount`) supaya AdminLayout
  // tidak perlu berubah sama sekali.
  unreadCount?: number
  indexRouteName?: string
  readRouteName?: string
  readAllRouteName?: string
  // Dipanggil setelah tandai (semua) dibaca, sebagai pengganti
  // router.reload({only:['unreadNotificationsCount']}) — wali pakai
  // polling lokal (useNotificationPoll), bukan prop Inertia, jadi
  // count-nya perlu di-refresh lewat callback ini.
  onCountChange?: () => void
}

export function NotificationBell({
  className,
  unreadCount,
  indexRouteName = 'admin.notifications.index',
  readRouteName = 'admin.notifications.read',
  readAllRouteName = 'admin.notifications.read-all',
  onCountChange,
}: NotificationBellProps) {
  const { unreadNotificationsCount } = usePage<PageProps>().props
  const count = unreadCount ?? unreadNotificationsCount
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<NotificationItem[] | null>(null)

  async function loadNotifications() {
    setLoading(true)
    try {
      const res = await fetch(route(indexRouteName))
      const data = await res.json()
      setItems(data.notifications)
    } finally {
      setLoading(false)
    }
  }

  function refreshCount() {
    if (onCountChange) {
      onCountChange()
    } else {
      router.reload({ only: ['unreadNotificationsCount'] })
    }
  }

  async function markAsRead(id: string) {
    await fetch(route(readRouteName, id), {
      method: 'POST',
      headers: { 'X-XSRF-TOKEN': xsrfToken() },
    })
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)) ?? null)
    refreshCount()
  }

  async function markAllAsRead() {
    await fetch(route(readAllRouteName), {
      method: 'POST',
      headers: { 'X-XSRF-TOKEN': xsrfToken() },
    })
    setItems((prev) => prev?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? null)
    refreshCount()
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && items === null) void loadNotifications()
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={cn('relative', className)} aria-label="Notifikasi">
          <Bell className="size-4" />
          {count > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
              {count > 9 ? '9+' : count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium text-content">Notifikasi</p>
          {count > 0 && (
            <button type="button" onClick={markAllAsRead} className="text-xs text-primary hover:underline">
              Tandai semua dibaca
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && <p className="p-4 text-center text-sm text-content-muted">Memuat…</p>}
          {!loading && items?.length === 0 && <p className="p-4 text-center text-sm text-content-muted">Tidak ada notifikasi.</p>}
          {!loading && items?.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                if (!n.read_at) void markAsRead(n.id)
                if (n.data?.url) {
                  router.visit(n.data.url)
                }
              }}
              className={cn(
                'flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-secondary/50',
                !n.read_at && 'bg-secondary/30',
              )}
            >
              <p className="text-sm font-medium text-content">{n.data?.title || 'Notifikasi'}</p>
              <p className="text-xs text-content-muted">{n.data?.message || (typeof n.data === 'string' ? n.data : '')}</p>
              <p className="text-[10px] text-content-muted">{n.created_at ? timeAgo(n.created_at) : ''}</p>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
