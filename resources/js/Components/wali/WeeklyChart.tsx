import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors } from '@/Lib/chartTheme'
import { formatMoney } from '@/Lib/money'

export type WeeklyChartPoint = { date: string; label: string; total: number }

type WeeklyChartProps = {
  data: WeeklyChartPoint[]
}

/**
 * fase-16-v2.md §5 "Grafik Belanja Mingguan" — bar tipis 7 hari
 * (Sen–Min, urutan sudah dari backend), warna mustard sesuai palet
 * proyek (bukan warna baru).
 */
export function WeeklyChart({ data }: WeeklyChartProps) {
  const colors = useChartColors()
  const total = data.reduce((sum, d) => sum + d.total, 0)
  const average = data.length > 0 ? Math.round(total / data.length) : 0

  return (
    <div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} vertical={false} />
          <XAxis dataKey="label" stroke={colors.axisColor} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, fontSize: 12 }}
            formatter={(v) => formatMoney(Number(v))}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="total" fill={colors.palette[1]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-xs text-content-muted">
        Total 7 hari: {formatMoney(total)} · Rata-rata/hari: {formatMoney(average)}
      </p>
    </div>
  )
}
