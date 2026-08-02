import { Link } from '@inertiajs/react'
import { Button } from '@/Components/ui/button'

export function PublicHero() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-navy-800 to-navy-600 px-6 py-16 text-center dark:from-navy-900 dark:to-navy-700">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative flex flex-col items-center gap-4">
        <p className="font-mono text-3xl font-semibold text-navy-50 sm:text-4xl">Skillage Mart</p>
        <p className="max-w-md text-navy-100">Minimarket SMK Skill Village Islamic School</p>
        <p className="max-w-lg text-sm text-navy-200">
          Belanja mudah dengan saldo deposit santri — lihat katalog produk & harga tanpa perlu login.
        </p>
        <div className="mt-2 flex gap-3">
          <Button asChild size="lg">
            <Link href={route('produk.index')}>Lihat Produk</Link>
          </Button>
          <Button variant="outline" size="lg" className="border-navy-200 bg-transparent text-navy-50 hover:bg-navy-700/50" asChild>
            <Link href="/wali/login">Portal Wali</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
