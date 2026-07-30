export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(amount))

  return `${sign}Rp ${formatted}`
}

export function formatMoneyShort(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)

  if (abs >= 1_000_000_000) return `${sign}Rp ${trimZero(abs / 1_000_000_000)}M`
  if (abs >= 1_000_000) return `${sign}Rp ${trimZero(abs / 1_000_000)}jt`
  if (abs >= 1_000) return `${sign}Rp ${trimZero(abs / 1_000)}rb`

  return formatMoney(amount)
}

export function parseMoney(input: string): number {
  const clean = input.replace(/[^0-9-]/g, '')

  return clean ? parseInt(clean, 10) : 0
}

export function roundMoney(amount: number, step = 100): number {
  if (step <= 0) return amount

  return Math.round(amount / step) * step
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/,0$/, '').replace('.', ',').replace(/,0$/, '')
}
