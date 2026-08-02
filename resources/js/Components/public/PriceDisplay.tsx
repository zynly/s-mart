import { formatMoney } from '@/Lib/money'

type PriceDisplayProps = {
  price: number
  promoPrice?: number | null
  size?: 'sm' | 'lg'
}

export function PriceDisplay({ price, promoPrice, size = 'sm' }: PriceDisplayProps) {
  const bigClass = size === 'lg' ? 'text-2xl' : 'text-base'

  if (promoPrice !== null && promoPrice !== undefined && promoPrice < price) {
    return (
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`font-mono font-semibold tabular-nums text-danger ${bigClass}`}>{formatMoney(promoPrice)}</span>
        <span className="font-mono text-sm tabular-nums text-content-muted line-through">{formatMoney(price)}</span>
      </div>
    )
  }

  return <span className={`font-mono font-semibold tabular-nums text-content ${bigClass}`}>{formatMoney(price)}</span>
}
