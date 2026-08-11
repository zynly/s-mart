import { Link } from '@inertiajs/react'
import { Clock, MapPin, Phone, ShoppingBag, ArrowRight, Tag, Sparkles, UserCheck, Layers } from 'lucide-react'
import type { ReactElement } from 'react'
import PublicLayout from '@/Layouts/PublicLayout'
import { PublicHero } from '@/Components/public/PublicHero'
import { PromoCard } from '@/Components/public/PromoCard'
import { ProductCardPublic } from '@/Components/public/ProductCardPublic'
import { InfoCard } from '@/Components/public/InfoCard'
import { Button } from '@/Components/ui/button'
import type { PublicProduct, PublicPromo } from '@/Types/storefront'

type WelcomeProps = {
  featuredProducts: PublicProduct[]
  activePromos: PublicPromo[]
  categories: { id: number; name: string }[]
  contact: { address: string; phone: string; email: string; hours: string }
}

export default function Welcome({ featuredProducts, activePromos, categories, contact }: WelcomeProps) {
  return (
    <div className="flex flex-col gap-16 py-4">
      {/* Hero Section */}
      <PublicHero />

      {/* Promo Berjalan */}
      {activePromos.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <Tag className="size-4" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-content">Promo & Diskon Berjalan</h2>
            </div>
            <Link
              href="/promo"
              className="text-xs font-bold text-primary hover:text-navy-700 flex items-center gap-1 hover:underline"
            >
              Lihat Semua Promo <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePromos.map((promo) => (
              <PromoCard key={promo.code} promo={promo} />
            ))}
          </div>
        </section>
      )}

      {/* Kategori Pilihan */}
      {categories.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-mustard-500/10 text-mustard-600">
                <Layers className="size-3.5" />
              </div>
              <h2 className="text-base font-extrabold tracking-tight text-content">Kategori Pilihan</h2>
            </div>
            <span className="text-[11px] text-content-muted font-medium">Temukan kebutuhan harian santri</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
            {categories.map((category, idx) => (
              <Link
                key={category.id}
                href={`${route('produk.index')}?category_id=${category.id}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
                className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/80 bg-surface p-2.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-navy-300 dark:hover:border-navy-600"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt/80 text-navy-700 group-hover:bg-navy-900 group-hover:text-mustard-400 transition-colors">
                  <ShoppingBag className="size-4 stroke-[1.8]" />
                </div>
                <span className="text-[11px] font-bold text-content group-hover:text-primary transition-colors line-clamp-1">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Produk Pilihan */}
      {featuredProducts.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-navy-600/10 text-navy-600">
                <Sparkles className="size-4" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-content">Produk Favorit & Terpopuler</h2>
            </div>
            <Link
              href={route('produk.index')}
              className="text-xs font-bold text-primary hover:text-navy-700 flex items-center gap-1 hover:underline"
            >
              Katalog Lengkap <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCardPublic key={product.slug} product={product} />
            ))}
          </div>
          <div className="flex justify-center pt-2">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-xl border-border px-8 font-bold text-content hover:bg-surface-alt hover:border-navy-300"
            >
              <Link href={route('produk.index')} className="flex items-center gap-2">
                <span>Lihat Seluruh Produk ({featuredProducts.length}+ Item)</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Info Lokasi & Kontak */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard icon={Clock} title="Jam Operasional Toko" content={contact.hours} />
        <InfoCard icon={MapPin} title="Lokasi Minimarket" content={contact.address} />
        <InfoCard icon={Phone} title="Layanan & Informasi" content={contact.phone || 'Informasi Sekolah / Minimarket'} />
      </section>

      {/* Banner Wali Santri */}
      <section className="relative overflow-hidden rounded-3xl bg-navy-950 p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-navy-800">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="hidden sm:flex size-14 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-mustard-400 border border-navy-700">
            <UserCheck className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-extrabold text-white">Wali Santri SMK Skill Village?</h3>
            <p className="text-xs sm:text-sm text-navy-200 max-w-md">
              Pantau saldo deposit, riwayat belanja harian anak Anda, serta ajukan top-up online dengan aman melalui Portal Wali.
            </p>
          </div>
        </div>
        <Button
          asChild
          size="lg"
          className="rounded-xl bg-mustard-500 hover:bg-mustard-400 text-navy-950 font-extrabold px-6 shadow-md shrink-0"
        >
          <Link href="/wali/login">Masuk Portal Wali Santri →</Link>
        </Button>
      </section>
    </div>
  )
}

Welcome.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>

