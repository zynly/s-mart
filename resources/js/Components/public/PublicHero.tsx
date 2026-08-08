import { Link } from '@inertiajs/react'
import { Button } from '@/Components/ui/button'
import { ShoppingBag, ArrowRight, ShieldCheck, Sparkles, Wallet, Store } from 'lucide-react'

export function PublicHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-8 sm:p-12 text-white shadow-2xl border border-navy-700/60">
      {/* Decorative Background Mesh Glows */}
      <div className="absolute -top-24 -left-24 size-80 rounded-full bg-mustard-500/20 blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-navy-400/20 blur-3xl pointer-events-none animate-pulse-glow" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto gap-6">
        {/* Floating Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-mustard-400/30 bg-navy-900/80 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-mustard-300 shadow-md">
          <Sparkles className="size-3.5 text-mustard-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>Minimarket Digital SMK Skill Village Islamic School</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Belanja Praktis & Transparan di <span className="text-transparent bg-clip-text bg-gradient-to-r from-mustard-300 via-mustard-400 to-amber-200">Skillage Mart</span>
        </h1>

        {/* Hero Description */}
        <p className="text-sm sm:text-base text-navy-100/90 max-w-xl font-normal leading-relaxed">
          Katalog resmi produk minimarket sekolah — pantau harga real-time, ketersediaan stok, dan transaksi saldo deposit santri secara transparan tanpa ribet.
        </p>

        {/* Hero CTA Action Group */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Button
            asChild
            size="lg"
            className="rounded-2xl bg-gradient-to-r from-mustard-500 to-amber-500 hover:from-mustard-400 hover:to-amber-400 text-navy-950 font-bold px-7 shadow-lg shadow-mustard-500/25 hover:shadow-mustard-500/40 transition-all transform hover:-translate-y-0.5"
          >
            <Link href={route('produk.index')} className="flex items-center gap-2">
              <ShoppingBag className="size-4" />
              <span>Jelajahi Katalog</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-2xl border-navy-500/60 bg-navy-900/60 backdrop-blur-sm text-navy-100 hover:bg-navy-800 hover:text-white px-7 transition-all"
            asChild
          >
            <Link href="/wali/login" className="flex items-center gap-2">
              <Wallet className="size-4 text-mustard-400" />
              <span>Portal Wali Santri</span>
            </Link>
          </Button>
        </div>

        {/* Feature Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-6 pt-6 border-t border-navy-800/80 text-xs">
          <div className="flex items-center justify-center gap-2 bg-navy-900/40 p-3 rounded-2xl border border-navy-700/40">
            <Store className="size-4 text-mustard-400 shrink-0" />
            <span className="text-navy-100 font-medium">Stok Minimarket Realtime</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-navy-900/40 p-3 rounded-2xl border border-navy-700/40">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            <span className="text-navy-100 font-medium">Deposit Card Integrated</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-navy-900/40 p-3 rounded-2xl border border-navy-700/40">
            <Sparkles className="size-4 text-sky-400 shrink-0" />
            <span className="text-navy-100 font-medium">Katalog Tanpa Login</span>
          </div>
        </div>
      </div>
    </div>
  )
}

