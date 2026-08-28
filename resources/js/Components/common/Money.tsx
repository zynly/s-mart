import { cn } from '@/Lib/utils'
import { formatMoney, formatMoneyShort } from '@/Lib/money'

type MoneyProps = {
  amount: number
  className?: string
  showSign?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  inline?: boolean
  compact?: boolean
}

const sizeClass: Record<NonNullable<MoneyProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg font-semibold',
  xl: 'text-2xl font-bold',
}

export function Money({ amount, className, showSign = false, size = 'md', compact = false }: MoneyProps) {
  const sign = showSign && amount > 0 ? '+' : ''
  const displayValue = compact ? formatMoneyShort(amount) : formatMoney(amount)
  const fullValue = formatMoney(amount)

  return (
    <span
      title={compact ? fullValue : undefined}
      className={cn(
        'font-mono tabular-nums whitespace-nowrap',
        compact && 'cursor-help',
        sizeClass[size],
        amount < 0 && 'text-danger',
        showSign && amount > 0 && 'text-success',
        className,
      )}
    >
      {sign}
      {displayValue}
    </span>
  )
}
