import { Link } from '@inertiajs/react'
import { Package, Sparkles } from 'lucide-react'
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-navy-300 dark:hover:border-navy-600"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-alt/40 p-3 flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="size-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-content-muted/60">
            <Package className="size-10 stroke-[1.5]" />
            <span className="text-[10px] font-medium">No Image</span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {hasPromo && (
            <Badge className="bg-gradient-to-r from-danger to-rose-600 text-white font-bold text-[10px] px-2 py-0.5 shadow-xs border-0">
              <Sparkles className="size-3 mr-0.5" /> Promo
            </Badge>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 z-10">
          <StockBadge status={product.stockBadge} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4 bg-surface">
        {product.category && (
          <span className="text-[11px] font-semibold tracking-wider text-mustard-600 dark:text-mustard-400 uppercase">
            {product.category}
          </span>
        )}
        <p className="line-clamp-2 text-xs sm:text-sm font-bold text-content leading-snug group-hover:text-primary transition-colors">
          {product.name}
        </p>

        <div className="mt-auto pt-2 flex items-end justify-between border-t border-border/50">
          <PriceDisplay price={product.price} promoPrice={product.promoPrice} />
        </div>
      </div>
    </Link>
  )
}

