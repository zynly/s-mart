import type { ComponentType } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/Lib/utils'

type StatCardProps = {
  label: string
  value: string
  icon?: ComponentType<{ className?: string }>
  trend?: number
  trendLabel?: string
  color?: 'emerald' | 'amber' | 'blue' | 'indigo' | 'purple' | 'rose'
}

const COLOR_VARIANTS = {
  emerald: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    border: 'border-emerald-200/80 dark:border-emerald-800/80',
    iconBg: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30',
    accent: 'from-emerald-500 to-teal-400',
    trendBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
  },
  amber: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/30',
    border: 'border-amber-200/80 dark:border-amber-800/80',
    iconBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/30',
    accent: 'from-amber-500 to-orange-400',
    trendBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  },
  blue: {
    bg: 'bg-blue-50/70 dark:bg-blue-950/30',
    border: 'border-blue-200/80 dark:border-blue-800/80',
    iconBg: 'bg-blue-600 text-white shadow-md shadow-blue-600/30',
    accent: 'from-blue-600 to-indigo-400',
    trendBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
  },
  indigo: {
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
    border: 'border-indigo-200/80 dark:border-indigo-800/80',
    iconBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30',
    accent: 'from-indigo-600 to-violet-400',
    trendBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
  },
  purple: {
    bg: 'bg-purple-50/70 dark:bg-purple-950/30',
    border: 'border-purple-200/80 dark:border-purple-800/80',
    iconBg: 'bg-purple-600 text-white shadow-md shadow-purple-600/30',
    accent: 'from-purple-600 to-pink-400',
    trendBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
  },
  rose: {
    bg: 'bg-rose-50/70 dark:bg-rose-950/30',
    border: 'border-rose-200/80 dark:border-rose-800/80',
    iconBg: 'bg-rose-500 text-white shadow-md shadow-rose-500/30',
    accent: 'from-rose-500 to-red-400',
    trendBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
  },
}

export function StatCard({ label, value, icon: Icon, trend, trendLabel, color = 'emerald' }: StatCardProps) {
  const isPositive = (trend ?? 0) >= 0
  const style = COLOR_VARIANTS[color] ?? COLOR_VARIANTS.emerald

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white dark:bg-surface p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        style.border,
      )}
    >
      {/* Top Accent Gradient Bar */}
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', style.accent)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 font-mono text-2xl font-black tracking-tight text-navy-950 dark:text-white tabular-nums truncate">
            {value}
          </p>

          {trend !== undefined && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide shadow-2xs',
                  isPositive ? style.trendBg : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                )}
              >
                {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {Math.abs(trend)}%
              </span>
              {trendLabel && <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate">{trendLabel}</span>}
            </div>
          )}
        </div>

        {Icon && (
          <div className={cn('flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 shrink-0', style.iconBg)}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
    </div>
  )
}
