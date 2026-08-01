import { useEffect, useState, type ReactNode } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import {
  Menu, ChevronDown, ChevronRight, Search, PanelLeftClose, PanelLeftOpen, Circle,
  LayoutDashboard, ShoppingCart, Wallet, CreditCard, Undo2, Package, Boxes, Truck,
  Users, Tag, HandCoins, BookOpen, FileBarChart, Building2, UserCog,
  type LucideIcon,
} from 'lucide-react'
import { Sheet, SheetContent } from '@/Components/ui/sheet'
import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip'
import { CommandDialog, CommandInput, CommandList, CommandEmpty } from '@/Components/ui/command'
import { ThemeToggle } from '@/Components/common/ThemeToggle'
import { NotificationBell } from '@/Components/common/NotificationBell'
import { useSidebarStore } from '@/Store/useSidebarStore'
import { cn } from '@/Lib/utils'
import type { NavigationGroup, NavigationItem, PageProps } from '@/Types'

type AdminLayoutProps = {
  children: ReactNode
}

// Halaman internal proyek, sengaja tidak masuk config/navigation.php
// (bukan modul bisnis) — ditaruh sebagai tautan kecil di footer sidebar.
const DEV_LINKS = [{ label: 'Uji Komponen', href: '/uji-komponen' }]

// Peta eksplisit (bukan `import * as Icons`) supaya Vite bisa
// tree-shake — daftar ini persis ikon yang dipakai config/navigation.php,
// bukan seluruh set lucide-react (yang tanpa ini membengkakkan bundle
// ratusan KB, ditemukan lewat `npm run build`).
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, ShoppingCart, Wallet, CreditCard, Undo2, Package, Boxes, Truck,
  Users, Tag, HandCoins, BookOpen, FileBarChart, Building2, UserCog,
}

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle
}

function NavLink({ item, collapsed }: { item: NavigationItem; collapsed: boolean }) {
  const Icon = resolveIcon(item.icon)

  const link = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 rounded-md border-l-4 border-transparent py-2 text-sm text-navy-100 transition-colors hover:bg-navy-700',
        collapsed ? 'justify-center px-2' : 'px-2.5',
        item.active && 'border-gold bg-navy-700 font-medium text-white',
        item.highlight && !item.active && 'bg-teal/20 text-teal-100',
      )}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- resolusi ikon dinamis by-name dari lucide-react, pola umum yang tidak dikenali heuristik React Compiler (sama seperti DataTable.tsx dgn TanStack Table) */}
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <Badge className="ml-auto bg-gold text-navy-900">{item.badge}</Badge>
      )}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

function NavGroup({ group, collapsed }: { group: NavigationGroup; collapsed: boolean }) {
  const { openGroups, toggleGroup } = useSidebarStore()
  const hasActive = group.items.some((item) => item.active)
  const isOpen = collapsed || hasActive || openGroups.includes(group.group)

  // Grup dengan satu item (mis. "Dashboard") tidak perlu header
  // collapsible — langsung tampil sebagai item biasa.
  const soleItem = group.items[0]

  if (group.items.length === 1 && group.group === 'Dashboard' && soleItem) {
    return <NavLink item={soleItem} collapsed={collapsed} />
  }

  return (
    <div>
      {!collapsed && (
        <button
          type="button"
          onClick={() => toggleGroup(group.group)}
          className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs font-semibold tracking-wide text-navy-300 uppercase hover:text-navy-100"
        >
          {group.group}
          {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
      )}
      {isOpen && (
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <NavLink key={item.key} item={item} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { navigation } = usePage<PageProps>().props

  return (
    <div className="flex h-full flex-col bg-navy-800 text-navy-50">
      <div className={cn('flex h-14 shrink-0 items-center font-mono text-sm font-semibold tracking-wide', collapsed ? 'justify-center px-2' : 'px-4')}>
        {collapsed ? 'SM' : 'Skillage Mart'}
      </div>
      <TooltipProvider>
        <nav className="flex-1 space-y-3 overflow-y-auto px-2 pb-2">
          {navigation.map((group) => (
            <NavGroup key={group.group} group={group} collapsed={collapsed} />
          ))}
        </nav>
      </TooltipProvider>
      <div className="shrink-0 space-y-0.5 border-t border-navy-700 px-2 py-2">
        {!collapsed && DEV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="block rounded-md px-2.5 py-1.5 text-xs text-navy-400 hover:bg-navy-700 hover:text-navy-100">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { collapsed, toggle } = useSidebarStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { auth } = usePage<PageProps>().props

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const initials = (auth.user?.name ?? 'SM')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside
        className={cn(
          'hidden shrink-0 transition-all duration-200 lg:block',
          collapsed ? 'w-16' : 'w-[260px]',
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-navy-600 px-4 text-navy-50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-navy-50 hover:bg-navy-500 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden text-navy-50 hover:bg-navy-500 lg:inline-flex"
              onClick={toggle}
              aria-label={collapsed ? 'Bentangkan sidebar' : 'Lipat sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </Button>
            <Button
              variant="ghost"
              className="hidden items-center gap-2 text-navy-200 hover:bg-navy-500 hover:text-navy-50 sm:inline-flex"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-4" />
              <span className="text-sm">Cari…</span>
              <kbd className="rounded border border-navy-400 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" className="text-navy-50 hover:bg-navy-500 sm:hidden" onClick={() => setSearchOpen(true)} aria-label="Cari">
              <Search className="size-4" />
            </Button>
            <NotificationBell className="text-navy-50 hover:bg-navy-500" />
            <ThemeToggle className="text-navy-50 hover:bg-navy-500" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-md px-2 py-1 hover:bg-navy-500">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-navy-400 text-xs text-navy-50">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={route('profile.edit')}>Profil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.post(route('logout'))}>Keluar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-bg p-4">{children}</main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Pencarian" description="Pencarian global">
        <CommandInput placeholder="Cari produk, anggota, nota…" />
        <CommandList>
          <CommandEmpty>Pencarian global tersedia di Fase 15.</CommandEmpty>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
