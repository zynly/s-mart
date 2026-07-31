import { useState, type ReactNode } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { Menu, ChevronDown } from 'lucide-react'
import { Sheet, SheetContent } from '@/Components/ui/sheet'
import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
import { Button } from '@/Components/ui/button'
import { useSidebarStore } from '@/Store/useSidebarStore'
import { cn } from '@/Lib/utils'
import type { PageProps } from '@/Types'

type AdminLayoutProps = {
  children: ReactNode
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Produk', href: '/admin/products' },
  { label: 'Kategori', href: '/admin/categories' },
  { label: 'Brand', href: '/admin/brands' },
  { label: 'Satuan', href: '/admin/units' },
  { label: 'Supplier', href: '/admin/suppliers' },
  { label: 'Metode Bayar', href: '/admin/payment-methods' },
  { label: 'Outlet', href: '/admin/outlets' },
  { label: 'Anggota', href: '/admin/members' },
  { label: 'Deposit', href: '/admin/deposit' },
  { label: 'Stok', href: '/admin/stock' },
  { label: 'Purchase Order', href: '/admin/purchase-orders' },
  { label: 'Pembelian', href: '/admin/purchases' },
  { label: 'Hutang', href: '/admin/debts' },
  { label: 'Piutang', href: '/admin/receivables' },
  { label: 'Konsinyasi', href: '/admin/consignment' },
  { label: 'Promo', href: '/admin/promos' },
  { label: 'Kupon', href: '/admin/coupons' },
  { label: 'Poin', href: '/admin/points' },
  { label: 'Retur Penjualan', href: '/admin/sale-returns' },
  { label: 'Write-Off', href: '/admin/write-offs' },
  { label: 'Sesi Kasir', href: '/admin/cashier-session' },
  { label: 'Kas', href: '/admin/cash' },
  { label: 'Layar Kasir', href: '/pos' },
  { label: 'Pengguna', href: '/admin/users' },
  { label: 'Role & Izin', href: '/admin/roles' },
  { label: 'Log Aktivitas', href: '/admin/activity-logs' },
  { label: 'Uji Komponen', href: '/uji-komponen' },
]

function SidebarContent() {
  return (
    <div className="flex h-full flex-col bg-navy-800 text-navy-50">
      <div className="flex h-14 items-center px-4 font-mono text-sm font-semibold tracking-wide">
        Skillage Mart
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {/* Menu lengkap & permission filtering dikerjakan di Fase UI-01. */}
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm text-navy-100 hover:bg-navy-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { collapsed, toggle } = useSidebarStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { auth } = usePage<PageProps>().props

  const initials = (auth.user?.name ?? 'SM')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex min-h-screen bg-bg">
      <aside
        className={cn(
          'hidden shrink-0 transition-all duration-200 lg:block',
          collapsed ? 'w-16' : 'w-[260px]',
        )}
      >
        <div className="fixed h-screen w-[inherit]">
          <SidebarContent />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 bg-navy-600 px-4 text-navy-50">
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
              aria-label="Lipat sidebar"
            >
              <Menu className="size-5" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-navy-500">
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
        </header>

        <main className="flex-1 bg-bg p-4">{children}</main>
      </div>
    </div>
  )
}
