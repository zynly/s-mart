import { useEffect, useState, type ReactNode } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import {
  Menu, ChevronDown, ChevronRight, Search, PanelLeftClose, PanelLeftOpen, Circle,
  LayoutDashboard, ShoppingCart, Wallet, CreditCard, Undo2, Package, Boxes, Truck,
  Users, Tag, HandCoins, BookOpen, FileBarChart, Building2, UserCog, Settings, Cpu,
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
import { useFlashToast } from '@/Lib/useFlashToast'
import { cn } from '@/Lib/utils'
import type { NavigationGroup, NavigationItem, PageProps } from '@/Types'

type AdminLayoutProps = {
  children: ReactNode
}

// Halaman internal proyek, sengaja tidak masuk config/navigation.php
// (bukan modul bisnis) — ditaruh sebagai tautan kecil di footer sidebar.
const DEV_LINKS: { label: string; href: string }[] = []

// Peta eksplisit (bukan `import * as Icons`) supaya Vite bisa
// tree-shake — daftar ini persis ikon yang dipakai config/navigation.php,
// bukan seluruh set lucide-react (yang tanpa ini membengkakkan bundle
// ratusan KB, ditemukan lewat `npm run build`).
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, ShoppingCart, Wallet, CreditCard, Undo2, Package, Boxes, Truck,
  Users, Tag, HandCoins, BookOpen, FileBarChart, Building2, UserCog, Settings, Cpu,
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
        'group relative flex items-center gap-3 py-2.5 text-xs transition-all duration-200 ease-in-out select-none',
        collapsed ? 'justify-center px-2 rounded-xl' : 'px-3 rounded-r-xl rounded-l-sm',
        item.active
          ? 'bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 text-white font-bold shadow-md shadow-navy-900/25 border-l-4 border-amber-400 scale-[1.01]'
          : item.highlight
            ? 'bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-900 font-bold hover:bg-emerald-500/20'
            : 'border-l-4 border-transparent text-navy-800 hover:bg-navy-100/70 hover:text-navy-950 font-medium',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0 transition-all duration-200 group-hover:scale-110',
          item.active
            ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]'
            : item.highlight
              ? 'text-emerald-600'
              : 'text-navy-600 group-hover:text-navy-900',
        )}
      />
      {!collapsed && (
        <span className={cn('truncate tracking-wide', item.active ? 'text-white font-bold' : 'font-medium text-navy-900')}>
          {item.label}
        </span>
      )}
      {!collapsed && item.badge && (
        <Badge
          className={cn(
            'ml-auto text-[10px] px-2 py-0.5 font-bold font-mono',
            item.active ? 'bg-amber-400 text-navy-950 shadow-2xs' : 'bg-navy-100 text-navy-900 border border-navy-200',
          )}
        >
          {item.badge}
        </Badge>
      )}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="bg-navy-900 border-navy-700 text-white font-semibold text-xs">
        {item.label}
      </TooltipContent>
    </Tooltip>
  )
}

function NavGroup({ group, collapsed }: { group: NavigationGroup; collapsed: boolean }) {
  const { openGroups, toggleGroup } = useSidebarStore()
  const hasActive = group.items.some((item) => item.active)
  const isOpen = collapsed || hasActive || openGroups.includes(group.group)

  const soleItem = group.items[0]

  if (group.items.length === 1 && group.group === 'Dashboard' && soleItem) {
    return <NavLink item={soleItem} collapsed={collapsed} />
  }

  return (
    <div className="space-y-1">
      {!collapsed && (
        <button
          type="button"
          onClick={() => toggleGroup(group.group)}
          className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-black tracking-widest text-navy-800 uppercase hover:text-navy-950 transition-colors"
        >
          <span>{group.group}</span>
          {isOpen ? <ChevronDown className="size-3.5 text-navy-600" /> : <ChevronRight className="size-3.5 text-navy-600" />}
        </button>
      )}
      {isOpen && (
        <div className="space-y-1 pl-0.5">
          {group.items.map((item) => (
            <NavLink key={item.key} item={item} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  )
}

export function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { navigation, activeOutlet } = usePage<PageProps>().props

  return (
    <div className="flex h-full flex-col bg-surface text-content border-r border-border/90 shadow-lg">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border/90 font-mono text-sm font-bold tracking-wider text-navy-950 bg-surface neu-flat px-4',
          collapsed ? 'justify-center px-2' : 'justify-between',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 font-sans font-black text-navy-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40">
            S
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-navy-950 font-sans">
                Skillage Mart
              </span>
              <span className="text-[10px] font-semibold text-navy-700 tracking-wider uppercase font-mono">Retail POS System</span>
            </div>
          )}
        </div>
      </div>
      <TooltipProvider>
        <nav className="flex-1 space-y-3.5 overflow-y-auto px-2.5 py-3.5">
          {navigation.map((group) => (
            <NavGroup key={group.group} group={group} collapsed={collapsed} />
          ))}
        </nav>
      </TooltipProvider>
      <div className="shrink-0 space-y-2 border-t border-border/90 bg-surface neu-flat px-3 py-3">
        {!collapsed && activeOutlet && (
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-xs text-emerald-950 font-medium shadow-2xs">
            <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] shrink-0" />
            <p className="truncate font-semibold text-navy-900">Outlet: <span className="text-emerald-800 font-bold">{activeOutlet.name}</span></p>
          </div>
        )}
        {!collapsed && DEV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-1.5 text-xs text-navy-700 hover:bg-navy-100/80 hover:text-navy-950 font-medium transition-colors">
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

  useFlashToast()

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

  // REVISI-R1-v2.md §3.5 — dialog pencarian harus tertutup begitu
  // navigasi Inertia terjadi (klik hasil pencarian/tombol back/dst),
  // bukan tertinggal terbuka menutupi halaman baru.
  useEffect(() => {
    return router.on('navigate', () => setSearchOpen(false))
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
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 bg-surface border-b border-border/90 px-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-content hover:bg-navy-100 dark:hover:bg-navy-700/80 rounded-lg lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden text-content hover:bg-navy-100 dark:hover:bg-navy-700/80 rounded-lg lg:inline-flex"
              onClick={toggle}
              aria-label={collapsed ? 'Bentangkan sidebar' : 'Lipat sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </Button>
            <Button
              variant="outline"
              className="hidden items-center gap-2.5 border-border bg-bg text-content-muted hover:bg-navy-50 hover:border-amber-400/70 hover:text-content sm:inline-flex rounded-xl px-3.5 py-1.5 transition-all duration-200"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-4 text-amber-500" />
              <span className="text-xs font-medium">Cari sesuatu…</span>
              <kbd className="rounded bg-amber-400 text-navy-950 font-mono font-bold text-[10px] px-1.5 py-0.5 shadow-2xs">Ctrl K</kbd>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" className="text-content hover:bg-navy-100 dark:hover:bg-navy-700/80 sm:hidden" onClick={() => setSearchOpen(true)} aria-label="Cari">
              <Search className="size-4" />
            </Button>
            <NotificationBell className="text-content hover:bg-navy-100 dark:hover:bg-navy-700/80" />
            <ThemeToggle className="text-content hover:bg-navy-100 dark:hover:bg-navy-700/80" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2.5 rounded-xl px-2.5 py-1 hover:bg-navy-100 dark:hover:bg-navy-700/60 transition-colors">
                  <Avatar className="size-8 ring-2 ring-amber-400/80 shadow-md shadow-amber-400/20">
                    <AvatarFallback className="bg-gradient-to-tr from-amber-500 to-amber-300 font-extrabold text-xs text-navy-950">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs font-semibold text-content md:inline-block truncate max-w-[120px]">{auth.user?.name}</span>
                  <ChevronDown className="size-3.5 text-content-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={route('profile.edit')}>Profil Saya</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.post(route('logout'))} className="text-red-500 focus:text-red-600">
                  Keluar dari Sistem
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-bg p-4 sm:p-6 lg:p-8">{children}</main>
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
