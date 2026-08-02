import type { ReactNode } from 'react'
import { Link } from '@inertiajs/react'

type PublicLayoutProps = {
  children: ReactNode
}

// T-111 (Fase 19): "Tentang" sengaja belum ada di sini — halaman itu
// (& Kontak/FAQ) ditunda ke lanjutan Fase 19, lihat docs/tickets/INDEX.md.
// Jangan pasang link ke route yang belum ada (404 di produksi).
const navItems = [
  { label: 'Beranda', href: '/' },
  { label: 'Produk', href: '/produk' },
  { label: 'Promo', href: '/promo' },
  { label: 'Cek Saldo', href: '/cek-saldo' },
]

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
          <Link href="/" className="font-mono text-lg font-semibold text-navy-700 dark:text-navy-100">
            Skillage Mart
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-content-muted hover:text-content"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/wali/login"
            className="rounded-md bg-navy-600 px-3 py-1.5 text-sm font-medium text-navy-50 hover:bg-navy-500"
          >
            Portal Wali
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-8 text-sm text-content-muted">
          <p className="font-medium text-content">Skillage Mart</p>
          <p>SMK Skill Village Islamic School — Jonggol, Kabupaten Bogor</p>
          <p>Senin–Sabtu 07.00–17.00</p>
        </div>
      </footer>
    </div>
  )
}
