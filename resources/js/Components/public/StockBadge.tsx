import { Badge } from '@/Components/ui/badge'

type StockBadgeProps = {
  status: 'available' | 'limited' | 'out'
}

const CONFIG: Record<StockBadgeProps['status'], { label: string; className: string }> = {
  available: { label: 'Tersedia', className: 'bg-success text-white' },
  limited: { label: 'Stok Terbatas', className: 'bg-warning text-white' },
  out: { label: 'Habis', className: 'bg-danger text-white' },
}

export function StockBadge({ status }: StockBadgeProps) {
  const { label, className } = CONFIG[status]

  return <Badge className={className}>{label}</Badge>
}
