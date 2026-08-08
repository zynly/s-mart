import { cn } from '@/Lib/utils'
import { formatMoney } from '@/Lib/money'

type MoneyProps = {
  amount: number
  className?: string
  showSign?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  inline?: boolean
}

const sizeClass: Record<NonNullable<MoneyProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg font-semibold',
  xl: 'text-2xl font-bold',
}

export function Money({ amount, className, showSign = false, size = 'md' }: MoneyProps) {
  const sign = showSign && amount > 0 ? '+' : ''

  return (
    <span
      className={cn(
        'font-mono tabular-nums whitespace-nowrap',
        sizeClass[size],
        amount < 0 && 'text-danger',
        showSign && amount > 0 && 'text-success',
        className,
      )}
    >
      {sign}
      {formatMoney(amount)}
    </span>
  )
}
