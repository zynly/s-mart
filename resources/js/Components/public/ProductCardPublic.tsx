import { Link } from '@inertiajs/react'
import { Package } from 'lucide-react'
import { PriceDisplay } from '@/Components/public/PriceDisplay'
import { StockBadge } from '@/Components/public/StockBadge'
import { Badge } from '@/Components/ui/badge'
import type { PublicProduct } from '@/Types/storefront'

type ProductCardPublicProps = {
  product: PublicProduct
}

export function ProductCardPublic({ product }: ProductCardPublicProps) {
  const hasPromo = product.promoPrice !== null && product.promoPrice < product.price
  const image = product.images[0]

  return (
    <Link
      href={route('produk.show', product.slug)}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-content-muted">
            <Package className="size-10" />
          </div>
        )}
        {hasPromo && (
          <Badge className="absolute top-2 left-2 bg-danger text-white">Promo</Badge>
        )}
        <div className="absolute top-2 right-2">
          <StockBadge status={product.stockBadge} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium text-content">{product.name}</p>
        {product.category && <p className="text-xs text-content-muted">{product.category}</p>}
        <div className="mt-auto pt-1">
          <PriceDisplay price={product.price} promoPrice={product.promoPrice} />
        </div>
      </div>
    </Link>
  )
}
