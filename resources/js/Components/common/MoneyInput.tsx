import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@/Components/ui/input'
import { formatMoney, parseMoney } from '@/Lib/money'
import { cn } from '@/Lib/utils'

type MoneyInputProps = {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

function formatWithDots(val: number): string {
  if (!val) return ''
  return val.toLocaleString('id-ID')
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, className, placeholder, disabled }, ref) => {
    const [display, setDisplay] = useState(value ? formatWithDots(value) : '')

    useEffect(() => {
      setDisplay(value ? formatWithDots(value) : '')
    }, [value])

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn('font-mono tabular-nums', className)}
        placeholder={placeholder ?? 'Rp 0'}
        disabled={disabled}
        value={display}
        onChange={(e) => {
          const parsed = parseMoney(e.target.value)
          setDisplay(parsed ? formatWithDots(parsed) : '')
          onChange(parsed)
        }}
      />
    )
  },
)

MoneyInput.displayName = 'MoneyInput'
