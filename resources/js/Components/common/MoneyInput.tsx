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

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, className, placeholder, disabled }, ref) => {
    const [display, setDisplay] = useState(value ? formatMoney(value) : '')
    const [focused, setFocused] = useState(false)

    useEffect(() => {
      if (!focused) {
        setDisplay(value ? formatMoney(value) : '')
      }
    }, [value, focused])

    return (
      <Input
        ref={ref}
        inputMode="numeric"
        className={cn('font-mono tabular-nums', className)}
        placeholder={placeholder ?? 'Rp 0'}
        disabled={disabled}
        value={display}
        onFocus={() => {
          setFocused(true)
          setDisplay(value ? String(value) : '')
        }}
        onBlur={() => {
          setFocused(false)
          setDisplay(value ? formatMoney(value) : '')
        }}
        onChange={(e) => {
          const parsed = parseMoney(e.target.value)
          setDisplay(e.target.value)
          onChange(parsed)
        }}
      />
    )
  },
)

MoneyInput.displayName = 'MoneyInput'
