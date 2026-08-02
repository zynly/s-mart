import { Link } from '@inertiajs/react'
import { Tag } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { formatDate } from '@/Lib/date'
import type { PublicPromo } from '@/Types/storefront'

type PromoCardProps = {
  promo: PublicPromo
}

const DISCOUNT_LABEL: Record<string, (value: number) => string> = {
  percent: (v) => `Diskon ${v}%`,
  amount: (v) => `Potongan Rp${v.toLocaleString('id-ID')}`,
  fixed_price: () => 'Harga Spesial',
  free_item: () => 'Beli, Dapat Gratis',
}

export function PromoCard({ promo }: PromoCardProps) {
  const discountLabel = (DISCOUNT_LABEL[promo.discount_type] ?? (() => promo.name))(promo.discount_value)
  const firstProduct = promo.products[0]

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-danger">
        <Tag className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{discountLabel}</span>
      </div>
      <p className="font-medium text-content">{promo.name}</p>
      {promo.description && <p className="text-sm text-content-muted">{promo.description}</p>}
      {(promo.start_date || promo.end_date) && (
        <p className="text-xs text-content-muted">
          {promo.start_date ? formatDate(promo.start_date) : 'Sekarang'} – {promo.end_date ? formatDate(promo.end_date) : 'Selesai'}
        </p>
      )}
      {firstProduct && (
        <Button asChild variant="outline" size="sm" className="mt-1 w-fit">
          <Link href={route('produk.index')}>Lihat Produk</Link>
        </Button>
      )}
    </div>
  )
}
