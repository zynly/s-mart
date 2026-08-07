import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import {
  Menu, ChevronDown, ChevronRight, Search, PanelLeftClose, PanelLeftOpen, Circle,
  LayoutDashboard, ShoppingCart, Wallet, CreditCard, Undo2, Package, Boxes, Truck,
  Users, Tag, HandCoins, BookOpen, FileBarChart, Building2, UserCog, Settings, Cpu,
  ShieldCheck, Eye, Repeat2, AlertTriangle, X, ArrowLeftRight, Eye as EyeIcon, EyeOff,
  type LucideIcon,
} from 'lucide-react'
import { Sheet, SheetContent } from '@/Components/ui/sheet'
import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip'
import { CommandDialog, CommandInput, CommandList, CommandEmpty } from '@/Components/ui/command'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
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
  ShieldCheck, Eye,
}

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle
}

// ─── Switch Role Data ───────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { key: 'admin',      label: 'Admin',          color: 'bg-blue-100 text-blue-800 border-blue-300',    icon: ShieldCheck },
  { key: 'supervisor', label: 'Supervisor',     color: 'bg-violet-100 text-violet-800 border-violet-300', icon: Eye },
  { key: 'cashier',    label: 'Kasir',          color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: ShoppingCart },
  { key: 'warehouse',  label: 'Gudang',         color: 'bg-orange-100 text-orange-800 border-orange-300', icon: Boxes },
  { key: 'treasurer',  label: 'Bendahara',      color: 'bg-amber-100 text-amber-800 border-amber-300',   icon: HandCoins },
  { key: 'wali',       label: 'Portal Wali Santri', color: 'bg-teal-100 text-teal-800 border-teal-300', icon: Users },
] as const

// ─── Switch Role Modal ──────────────────────────────────────────────────────
function SwitchRoleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'pick' | 'pin'>('pick')
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('pick')
    setSelectedRole(null)
    setPin('')
    setShowPin(false)
    setError('')
    setLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function pickRole(roleKey: string) {
    setSelectedRole(roleKey)
    setStep('pin')
    setPin('')
    setError('')
    setTimeout(() => pinRef.current?.focus(), 100)
  }

  function handlePinInput(val: string) {
    if (/^\d{0,6}$/.test(val)) setPin(val)
  }

  function handleConfirm() {
    if (pin.length !== 6) { setError('PIN harus 6 digit.'); return }
    setLoading(true)
    setError('')

    // Portal Wali uses a different route
    const routeName = selectedRole === 'wali'
      ? 'wali.owner-preview'
      : 'admin.role-switch.switch'

    const payload = selectedRole === 'wali'
      ? { pin }
      : { role: selectedRole, pin }

    router.post(
      route(routeName),
      payload,
      {
        preserveScroll: true,
        onError: (errs) => {
          setError(errs.pin ?? errs.role ?? 'Terjadi kesalahan.')
          setLoading(false)
          setPin('')
        },
        onFinish: () => setLoading(false),
        onSuccess: () => { reset(); onClose() },
      }
    )
  }

  const roleData = ROLE_OPTIONS.find((r) => r.key === selectedRole)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-400/30 shrink-0">
              <ArrowLeftRight className="size-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-navy-950">
                {step === 'pick' ? 'Pilih Role Uji Coba' : `Konfirmasi PIN — ${roleData?.label}`}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {step === 'pick'
                  ? 'Pilih role yang ingin kamu uji coba tampilannya'
                  : 'Masukkan PIN 6-digit kamu sebagai Owner'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {step === 'pick' && (
            <div className="grid grid-cols-1 gap-2.5">
              {ROLE_OPTIONS.map((role) => {
                const Icon = role.icon
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => pickRole(role.key)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]',
                      role.color
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="font-bold text-sm">{role.label}</span>
                    <ChevronRight className="ml-auto size-4 opacity-60" />
                  </button>
                )
              })}
            </div>
          )}

          {step === 'pin' && (
            <div className="space-y-4">
              {/* Role indicator */}
              {roleData && (
                <div className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2.5', roleData.color)}>
                  <roleData.icon className="size-4 shrink-0" />
                  <span className="font-bold text-sm">Ganti ke: {roleData.label}</span>
                </div>
              )}

              {/* PIN dots display */}
              <div className="flex justify-center gap-3 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'size-4 rounded-full border-2 transition-all duration-150',
                      i < pin.length
                        ? 'bg-amber-400 border-amber-400 shadow-sm shadow-amber-400/40 scale-110'
                        : 'bg-slate-100 border-slate-300'
                    )}
                  />
                ))}
              </div>

              {/* PIN input */}
              <div className="relative">
                <input
                  ref={pinRef}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => handlePinInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && pin.length === 6) handleConfirm() }}
                  className="w-full h-11 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 pr-11 text-center text-xl font-mono font-bold tracking-widest text-navy-950 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 transition-all"
                  placeholder="••••••"
                  autoComplete="off"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPin((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-700 transition-colors"
                >
                  {showPin ? <EyeOff className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 font-bold">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setStep('pick'); setPin(''); setError('') }}
                  className="flex-1 h-9 text-xs font-bold"
                  disabled={loading}
                >
                  ← Kembali
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={pin.length !== 6 || loading}
                  className="flex-1 h-9 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-navy-950 shadow-md shadow-amber-400/30"
                >
                  {loading ? 'Memverifikasi…' : 'Konfirmasi'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Masquerade Banner (sticky top) ─────────────────────────────────────────
function MasqueradeBanner({ label }: { label: string }) {
  function exitMasquerade() {
    router.post(route('admin.role-switch.exit'))
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-white shadow-md print:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex size-6 items-center justify-center rounded-full bg-white/20 shrink-0">
          <Eye className="size-3.5" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wide">Mode Testing</span>
          <span className="text-xs font-medium opacity-90">—</span>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
            Melihat sebagai: {label}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={exitMasquerade}
        className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30 transition-all shrink-0"
      >
        <X className="size-3.5" />
        Kembali ke Owner
      </button>
    </div>
  )
}

// ─── NavLink ─────────────────────────────────────────────────────────────────
function NavLink({ item, collapsed }: { item: NavigationItem; collapsed: boolean }) {
  const { url } = usePage()
  const Icon = resolveIcon(item.icon)

  const isActive = item.active || (
    item.key === 'cashier-session' && (url.startsWith('/admin/cash') || url.startsWith('/admin/cashier-session'))
  ) || (
    item.key === 'deposit' && (url.startsWith('/admin/deposit') || url.startsWith('/admin/topup-requests'))
  ) || (
    item.key === 'sale-returns' && (url.startsWith('/admin/sale-returns') || url.startsWith('/admin/write-offs'))
  ) || (
    item.key === 'products' && (url.startsWith('/admin/products') || url.startsWith('/admin/categories') || url.startsWith('/admin/brands') || url.startsWith('/admin/units'))
  ) || (
    item.key === 'stock' && (url.startsWith('/admin/stock') || url.startsWith('/admin/opnames') || url.startsWith('/admin/transfers') || url.startsWith('/admin/stock-adjustments'))
  ) || (
    item.key === 'purchases' && (url.startsWith('/admin/purchases') || url.startsWith('/admin/purchase-orders') || url.startsWith('/admin/consignment') || url.startsWith('/admin/purchase-returns'))
  ) || (
    item.key === 'debts' && (url.startsWith('/admin/debts') || url.startsWith('/admin/receivables'))
  ) || (
    item.key === 'accounts' && (url.startsWith('/admin/accounts') || url.startsWith('/admin/journals') || url.startsWith('/admin/ledger') || url.startsWith('/admin/trial-balance') || url.startsWith('/admin/profit-loss') || url.startsWith('/admin/balance-sheet') || url.startsWith('/admin/accounting-periods'))
  ) || (
    item.key === 'promos' && (url.startsWith('/admin/promos') || url.startsWith('/admin/coupons') || url.startsWith('/admin/points'))
  ) || (
    item.key === 'users' && (url.startsWith('/admin/users') || url.startsWith('/admin/roles') || url.startsWith('/admin/activity-logs'))
  ) || (
    item.key === 'suppliers' && (url.startsWith('/admin/suppliers') || url.startsWith('/admin/outlets') || url.startsWith('/admin/payment-methods'))
  )

  const link = (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 py-2.5 text-xs transition-all duration-200 ease-in-out select-none',
        collapsed ? 'justify-center px-2 rounded-xl' : 'px-3 rounded-r-xl rounded-l-sm',
        isActive
          ? 'bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 text-white font-bold shadow-md shadow-navy-900/25 border-l-4 border-amber-400 scale-[1.01]'
          : 'border-l-4 border-transparent text-navy-800 hover:bg-navy-100/70 hover:text-navy-950 font-bold',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0 transition-all duration-200 group-hover:scale-110',
          isActive
            ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]'
            : 'text-navy-600 group-hover:text-navy-900',
        )}
      />
      {!collapsed && (
        <span className={cn('truncate tracking-wide font-bold', isActive ? 'text-white' : 'text-navy-900')}>
          {item.label}
        </span>
      )}
      {!collapsed && item.badge && (
        <Badge
          className={cn(
            'ml-auto text-[10px] px-2 py-0.5 font-bold font-mono',
            isActive ? 'bg-amber-400 text-navy-950 shadow-2xs' : 'bg-navy-100 text-navy-900 border border-navy-200',
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
  const { navigation, activeOutlet, auth, masquerade } = usePage<PageProps>().props
  const [switchOpen, setSwitchOpen] = useState(false)
  const isOwner = auth.user?.roles?.includes('owner') ?? false

  return (
    <div className="flex h-full flex-col bg-surface text-content border-r border-border/90 shadow-lg">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border/90 font-mono text-sm font-bold tracking-wider text-navy-950 bg-surface neu-flat px-4',
          collapsed ? 'justify-center px-2' : 'justify-between',
        )}
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo/logo2.png"
            alt="Skillage Mart Logo"
            className="size-8 object-contain rounded-xl p-0.5 bg-white border border-amber-300 shadow-md shrink-0"
          />
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

        {/* ── Switch Role Button (Owner only) ── */}
        {isOwner && !masquerade?.active && (
          <>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSwitchOpen(true)}
                    className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-2.5 hover:from-amber-100 hover:to-orange-100 transition-all group"
                  >
                    <Repeat2 className="size-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-navy-900 border-navy-700 text-white font-semibold text-xs">
                  Ganti Role (Testing)
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => setSwitchOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-3 py-2.5 hover:from-amber-100 hover:to-orange-100 transition-all group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-amber-100 border border-amber-200 shrink-0">
                  <Repeat2 className="size-3.5 text-amber-600 group-hover:rotate-180 transition-transform duration-300" />
                </div>
                <span className="text-xs font-bold text-amber-800">Ganti Role (Testing)</span>
                <ChevronRight className="ml-auto size-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <SwitchRoleModal open={switchOpen} onClose={() => setSwitchOpen(false)} />
          </>
        )}

        {/* ── Exit masquerade in sidebar ── */}
        {masquerade?.active && !collapsed && (
          <button
            type="button"
            onClick={() => router.post(route('admin.role-switch.exit'))}
            className="flex w-full items-center gap-2.5 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5 hover:bg-orange-100 transition-all group"
          >
            <div className="flex size-6 items-center justify-center rounded-lg bg-orange-100 border border-orange-200 shrink-0">
              <X className="size-3.5 text-orange-600" />
            </div>
            <span className="text-xs font-bold text-orange-800">Keluar Testing Mode</span>
          </button>
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
  const { auth, masquerade } = usePage<PageProps>().props

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
        {/* Masquerade Banner — only when testing mode is active */}
        {masquerade?.active && masquerade.label && (
          <MasqueradeBanner label={masquerade.label} />
        )}

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
