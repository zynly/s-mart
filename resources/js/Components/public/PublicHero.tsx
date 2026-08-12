import { Link } from '@inertiajs/react'
import { Button } from '@/Components/ui/button'
import { ShoppingBag, ArrowRight, ShieldCheck, Sparkles, Wallet, Store, LogIn } from 'lucide-react'

export function PublicHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy-950 p-5 sm:p-7 text-white shadow-md border border-navy-800">
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto gap-3.5">
        {/* Tag */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-mustard-400/30 bg-navy-900 px-3 py-1 text-[11px] font-semibold text-mustard-300 shadow-xs">
          <Sparkles className="size-3 text-mustard-400" />
          <span>Minimarket Digital SMK Skill Village</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-mono text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
          Belanja Praktis & Transparan di <span className="text-mustard-400">Skillage Mart</span>
        </h1>

        {/* Hero Description */}
        <p className="text-xs sm:text-sm text-navy-200 max-w-lg font-normal leading-relaxed">
          Katalog resmi produk minimarket sekolah — pantau harga real-time, ketersediaan stok, dan transaksi saldo deposit santri secara transparan.
        </p>

        {/* Hero CTA Action Group */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-mustard-500 hover:bg-mustard-400 text-navy-950 font-bold px-5 py-2 text-xs shadow-xs transition-all hover:-translate-y-0.5"
          >
            <Link href={route('produk.index')} className="flex items-center gap-1.5">
              <ShoppingBag className="size-3.5" />
              <span>Jelajahi Katalog</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-navy-700 bg-navy-900 text-navy-100 hover:bg-navy-800 hover:text-white px-5 py-2 text-xs transition-all"
            asChild
          >
            <Link href="/login" className="flex items-center gap-1.5">
              <LogIn className="size-3.5 text-mustard-400" />
              <span>Login Portal</span>
            </Link>
          </Button>
        </div>

        {/* Feature Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full mt-3 pt-3 border-t border-navy-800/80 text-[11px]">
          <div className="flex items-center justify-center gap-1.5 bg-navy-900/80 p-2 rounded-xl border border-navy-800/80">
            <Store className="size-3.5 text-mustard-400 shrink-0" />
            <span className="text-navy-100 font-medium truncate">Stok Realtime</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-navy-900/80 p-2 rounded-xl border border-navy-800/80">
            <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
            <span className="text-navy-100 font-medium truncate">Deposit Integrated</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-navy-900/80 p-2 rounded-xl border border-navy-800/80">
            <Sparkles className="size-3.5 text-sky-400 shrink-0" />
            <span className="text-navy-100 font-medium truncate">Katalog Tanpa Login</span>
          </div>
        </div>
      </div>
    </div>
  )
}



