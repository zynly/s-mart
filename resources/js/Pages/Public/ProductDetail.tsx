import { Head, Link } from '@inertiajs/react'
import { ChevronRight } from 'lucide-react'
import type { ReactElement } from 'react'
import PublicLayout from '@/Layouts/PublicLayout'
import { ProductGallery } from '@/Components/public/ProductGallery'
import { PriceDisplay } from '@/Components/public/PriceDisplay'
import { StockBadge } from '@/Components/public/StockBadge'
import { ProductCardPublic } from '@/Components/public/ProductCardPublic'
import { Badge } from '@/Components/ui/badge'
import type { PublicProduct } from '@/Types/storefront'

type ProductDetailProps = {
  product: PublicProduct
  related: PublicProduct[]
}

export default function ProductDetail({ product, related }: ProductDetailProps) {
  return (
    <div className="flex flex-col gap-8 py-4">
      <Head title={`${product.name} - Skillage Mart`} />

      <nav className="flex items-center gap-1 text-sm text-content-muted">
        <Link href={route('home')} className="hover:text-content">Beranda</Link>
        <ChevronRight className="size-3.5" />
        <Link href={route('produk.index')} className="hover:text-content">Produk</Link>
        {product.category && (
          <>
            <ChevronRight className="size-3.5" />
            <span>{product.category}</span>
          </>
        )}
        <ChevronRight className="size-3.5" />
        <span className="text-content">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} alt={product.name} />

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-content">{product.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.category && <Badge variant="outline">{product.category}</Badge>}
              {product.brand && <Badge variant="outline">{product.brand}</Badge>}
            </div>
          </div>

          <PriceDisplay price={product.price} promoPrice={product.promoPrice} size="lg" />
          <StockBadge status={product.stockBadge} />

          {product.description && <p className="text-sm whitespace-pre-line text-content-muted">{product.description}</p>}

          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-content-muted">
            <p>Tersedia di Skillage Mart, SMK Skill Village Islamic School, Jonggol.</p>
            <p className="mt-1">Harga dapat berubah sewaktu-waktu. Silakan cek langsung di toko.</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-content">Produk Serupa</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCardPublic key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

ProductDetail.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
