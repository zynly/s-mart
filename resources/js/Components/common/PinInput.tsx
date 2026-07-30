import { useRef } from 'react'
import { cn } from '@/Lib/utils'

type PinInputProps = {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
}

export function PinInput({ length = 6, value, onChange, onComplete, disabled }: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length)

  function setDigit(index: number, digit: string) {
    const next = digits.slice()
    next[index] = digit
    const nextValue = next.join('').slice(0, length)
    onChange(nextValue)

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (nextValue.length === length && nextValue.replaceAll(/\D/g, '').length === length) {
      onComplete?.(nextValue)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)

    if (pasted.length === length) {
      onComplete?.(pasted)
      inputRefs.current[length - 1]?.focus()
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(e) => setDigit(index, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={cn(
            'h-11 w-10 rounded-lg border border-input bg-transparent text-center font-mono text-lg outline-none',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        />
      ))}
    </div>
  )
}
