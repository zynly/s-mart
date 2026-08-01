import type { ComponentType } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/Components/ui/card'
import { cn } from '@/Lib/utils'

type StatCardProps = {
  label: string
  value: string
  icon?: ComponentType<{ className?: string }>
  trend?: number
  trendLabel?: string
}

export function StatCard({ label, value, icon: Icon, trend, trendLabel }: StatCardProps) {
  const isPositive = (trend ?? 0) >= 0

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-content-muted">{label}</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-content">{value}</p>
          {trend !== undefined && (
            <p
              className={cn(
                'mt-1 flex items-center gap-1 text-xs font-medium',
                isPositive ? 'text-success' : 'text-danger',
              )}
            >
              {isPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(trend)}%{trendLabel && <span className="text-content-muted"> {trendLabel}</span>}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-secondary p-2 text-secondary-foreground">
            <Icon className="size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
