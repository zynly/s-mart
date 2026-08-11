import type { ReactNode } from 'react'
import { Link, usePage } from '@inertiajs/react'
import { ShoppingBag, ShieldCheck, Sparkles, UserCheck } from 'lucide-react'

type PublicLayoutProps = {
  children: ReactNode
}

const navItems = [
  { label: 'Beranda', href: '/' },
  { label: 'Katalog Produk', href: '/produk' },
  { label: 'Promo Spesial', href: '/promo' },
  { label: 'Cek Saldo Santri', href: '/cek-saldo' },
]

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { url } = usePage()

  return (
    <div className="flex min-h-screen flex-col bg-bg text-content selection:bg-mustard-500 selection:text-navy-900">
      {/* Top Banner Announcement */}
      <div className="bg-navy-950 px-4 py-2 text-center text-xs font-medium text-navy-100 shadow-inner flex items-center justify-center gap-2">
        <Sparkles className="size-3.5 text-mustard-400 animate-pulse" />
        <span>Katalog Minimarket SMK Skill Village — Transparan, Realtime & Tanpa Login</span>
        <span className="hidden sm:inline-block rounded-full bg-navy-900 px-2 py-0.5 text-[10px] text-mustard-300 font-semibold border border-navy-700">
          S-Mart Digital
        </span>
      </div>

      {/* Sticky Glassmorphism Header */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-md transition-all shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-9 items-center justify-center rounded-xl bg-navy-900 text-mustard-400 shadow-md group-hover:scale-105 transition-transform border border-navy-800">
              <ShoppingBag className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-base font-extrabold tracking-tight text-navy-900 dark:text-navy-50">
                Skillage<span className="text-mustard-500">.Mart</span>
              </span>
              <span className="text-[10px] font-medium text-content-muted leading-none">Minimarket Santri</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex bg-surface-alt/60 p-1 rounded-full border border-border">
            {navItems.map((item) => {
              const isActive = url === item.href || (item.href !== '/' && url.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-xs'
                      : 'text-content-muted hover:text-content hover:bg-surface'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/wali/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-navy-50 shadow-md transition-all hover:bg-navy-800 hover:shadow-lg active:scale-95 border border-navy-800"
            >
              <UserCheck className="size-3.5 text-mustard-400" />
              <span>Portal Wali</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 sm:px-6 lg:px-8 py-8 animate-fade-up">
        {children}
      </main>

      <footer className="border-t border-border bg-surface mt-12">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-6 px-4 sm:px-6 lg:px-8 py-10 text-xs text-content-muted sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              <p className="font-bold text-content text-sm">Skillage Mart (S-Mart)</p>
            </div>
            <p>SMK Skill Village Islamic School — Jonggol, Kabupaten Bogor</p>
            <p className="text-content-subtle">Jam Operasional: Senin–Sabtu 07.00–17.00 WIB</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-1.5 text-success font-semibold text-[11px] bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
              <ShieldCheck className="size-3.5" />
              Sistem Terintegrasi POS & Deposit Santri
            </div>
            <Link href="/admin/login" className="text-xs text-content-muted hover:text-primary transition-colors hover:underline">
              Login Akses Staff / Admin POS →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
