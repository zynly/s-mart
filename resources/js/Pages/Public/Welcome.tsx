import { Link } from '@inertiajs/react'
import { Clock, MapPin, Phone, ShoppingBag } from 'lucide-react'
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
      <PublicHero />

      {activePromos.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-content">Promo Berjalan</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePromos.map((promo) => (
              <PromoCard key={promo.code} promo={promo} />
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-content">Kategori Pilihan</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`${route('produk.index')}?category_id=${category.id}`}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-4 text-center transition-colors hover:border-navy-300"
              >
                <ShoppingBag className="size-6 text-navy-600 dark:text-navy-300" />
                <span className="text-sm font-medium text-content">{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-content">Produk Pilihan</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCardPublic key={product.slug} product={product} />
            ))}
          </div>
          <Button variant="outline" asChild className="mx-auto w-fit">
            <Link href={route('produk.index')}>Lihat Semua Produk</Link>
          </Button>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard icon={Clock} title="Jam Buka" content={contact.hours} />
        <InfoCard icon={MapPin} title="Lokasi" content={contact.address} />
        <InfoCard icon={Phone} title="Kontak" content={contact.phone || 'Hubungi sekolah'} />
      </section>

      <section className="flex flex-col items-center gap-3 rounded-lg bg-navy-700 px-6 py-10 text-center dark:bg-navy-800">
        <p className="text-lg font-semibold text-navy-50">Wali santri? Pantau saldo & belanja anak Anda</p>
        <Button asChild size="lg" className="mt-2">
          <Link href="/wali/login">Masuk Portal Wali</Link>
        </Button>
      </section>
    </div>
  )
}

Welcome.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
