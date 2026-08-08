import { type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import { TrendingUp, ShoppingBag, Coins, Wallet, Calendar, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Money } from '@/Components/common/Money'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Card, CardContent } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'

type Line = { code: string; name: string; amount: number }

type ProfitLossResult = {
  revenue: Line[]
  expense: Line[]
  totalRevenue: number
  totalExpense: number
  totalCogs: number
  grossProfit: number
  netProfit: number
}

type ProfitLossIndexProps = {
  tab: string
  current: ProfitLossResult
  previous: ProfitLossResult
  filters: { from: string; to: string }
}

function Delta({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous
  if (diff === 0) return <span className="text-content-muted text-xs">—</span>
  return (
    <div className={`inline-flex items-center gap-0.5 text-xs font-semibold ${diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {diff > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      <Money amount={Math.abs(diff)} size="sm" />
    </div>
  )
}

export default function Index({ tab, current, previous, filters }: ProfitLossIndexProps) {
  function applyFilters(next: Partial<{ from: string; to: string }>) {
    router.get(route('admin.profit-loss.index'), { from: next.from ?? filters.from, to: next.to ?? filters.to }, { preserveState: true })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Laba Rugi" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Laba Rugi' }]} />
      <PageTabs
        current={tab}
        tabs={[
          { key: 'accounts', label: 'Bagan Akun', href: route('admin.accounts.index'), permission: 'setting.view' },
          { key: 'journals', label: 'Jurnal', href: route('admin.journals.index'), permission: 'journal.view' },
          { key: 'ledger', label: 'Buku Besar', href: route('admin.ledger.index'), permission: 'ledger.view' },
          { key: 'trial-balance', label: 'Neraca Saldo', href: route('admin.trial-balance.index'), permission: 'ledger.view' },
          { key: 'profit-loss', label: 'Laba Rugi', href: route('admin.profit-loss.index'), permission: 'ledger.view' },
          { key: 'balance-sheet', label: 'Neraca', href: route('admin.balance-sheet.index'), permission: 'ledger.view' },
          { key: 'accounting-periods', label: 'Periode', href: route('admin.accounting-periods.index'), permission: 'ledger.view' },
        ]}
      />

      {/* KPI STATS CARDS AT THE TOP */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pendapatan */}
        <Card className="relative overflow-hidden border-border/80 shadow-2xs">
          <div className="absolute right-3 top-3 rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-5" />
          </div>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-content-muted">Total Pendapatan</p>
            <div className="mt-1 text-lg sm:text-xl font-bold text-content">
              <Money amount={current.totalRevenue} size="lg" />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-content-muted">
              <span>vs Periode Lalu:</span>
              <Delta current={current.totalRevenue} previous={previous.totalRevenue} />
            </div>
          </CardContent>
        </Card>

        {/* Laba Kotor */}
        <Card className="relative overflow-hidden border-border/80 shadow-2xs">
          <div className="absolute right-3 top-3 rounded-lg bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
            <Coins className="size-5" />
          </div>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-content-muted">Laba Kotor (Gross Profit)</p>
            <div className="mt-1 text-lg sm:text-xl font-bold text-content">
              <Money amount={current.grossProfit} size="lg" />
            </div>
            <p className="mt-2 text-xs text-content-muted">Pendapatan - HPP</p>
          </CardContent>
        </Card>

        {/* HPP (Harga Pokok Penjualan) */}
        <Card className="relative overflow-hidden border-border/80 shadow-2xs">
          <div className="absolute right-3 top-3 rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
            <ShoppingBag className="size-5" />
          </div>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-content-muted">HPP (Harga Pokok Penjualan)</p>
            <div className="mt-1 text-lg sm:text-xl font-bold text-content">
              <Money amount={current.totalCogs} size="lg" />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-content-muted">
              <span>Beban Pokok Barang Sold</span>
            </div>
          </CardContent>
        </Card>

        {/* Laba Bersih */}
        <Card className={`relative overflow-hidden border border-border/80 shadow-2xs ${current.netProfit >= 0 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : 'bg-rose-50/30 dark:bg-rose-950/10'}`}>
          <div className={`absolute right-3 top-3 rounded-lg p-2.5 ${current.netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'}`}>
            <Wallet className="size-5" />
          </div>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-content-muted">Laba Bersih (Net Profit)</p>
            <div className={`mt-1 text-lg sm:text-xl font-bold ${current.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              <Money amount={current.netProfit} size="lg" showSign />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-content-muted">
              <span>vs Periode Lalu:</span>
              <Delta current={current.netProfit} previous={previous.netProfit} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Rentang Tanggal */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-2xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-content">
          <Calendar className="size-4 text-primary" /> Filter Periode Laporan
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-content-muted">Dari</Label>
            <Input type="date" value={filters.from} onChange={(e) => applyFilters({ from: e.target.value })} className="h-8 text-xs w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-content-muted">Sampai</Label>
            <Input type="date" value={filters.to} onChange={(e) => applyFilters({ to: e.target.value })} className="h-8 text-xs w-36" />
          </div>
        </div>
      </div>

      {/* Tabel Detail Laporan Laba Rugi */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="border-b border-border bg-surface-muted/50 text-left font-semibold text-content-muted">
              <tr>
                <th className="p-3.5">Akun Akuntansi</th>
                <th className="p-3.5 text-right w-40">Periode Ini</th>
                <th className="p-3.5 text-right w-40">Periode Lalu</th>
                <th className="p-3.5 text-right w-36">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {/* Header Pendapatan */}
              <tr className="bg-emerald-500/10 font-bold text-emerald-800 dark:text-emerald-300">
                <td className="p-3.5" colSpan={4}>
                  📈 PENDAPATAN
                </td>
              </tr>
              {current.revenue.map((line) => {
                const prevLine = previous.revenue.find((p) => p.code === line.code)
                return (
                  <tr key={line.code} className="hover:bg-surface-muted/40 transition-colors">
                    <td className="p-3 pl-8 font-medium">
                      <span className="font-mono text-content-muted mr-2">{line.code}</span>
                      {line.name}
                    </td>
                    <td className="p-3 text-right font-medium">
                      <Money amount={line.amount} size="sm" />
                    </td>
                    <td className="p-3 text-right text-content-muted">
                      {prevLine ? <Money amount={prevLine.amount} size="sm" /> : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Delta current={line.amount} previous={prevLine?.amount ?? 0} />
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-border bg-surface-muted/60 font-bold">
                <td className="p-3 pl-8 text-content">Total Pendapatan</td>
                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                  <Money amount={current.totalRevenue} size="sm" />
                </td>
                <td className="p-3 text-right text-content-muted">
                  <Money amount={previous.totalRevenue} size="sm" />
                </td>
                <td className="p-3 text-right">
                  <Delta current={current.totalRevenue} previous={previous.totalRevenue} />
                </td>
              </tr>

              {/* Header Beban */}
              <tr className="bg-rose-500/10 font-bold text-rose-800 dark:text-rose-300">
                <td className="p-3.5" colSpan={4}>
                  📉 BEBAN & HPP
                </td>
              </tr>
              {current.expense.map((line) => {
                const prevLine = previous.expense.find((p) => p.code === line.code)
                return (
                  <tr key={line.code} className="hover:bg-surface-muted/40 transition-colors">
                    <td className="p-3 pl-8 font-medium">
                      <span className="font-mono text-content-muted mr-2">{line.code}</span>
                      {line.name}
                    </td>
                    <td className="p-3 text-right font-medium">
                      <Money amount={line.amount} size="sm" />
                    </td>
                    <td className="p-3 text-right text-content-muted">
                      {prevLine ? <Money amount={prevLine.amount} size="sm" /> : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Delta current={line.amount} previous={prevLine?.amount ?? 0} />
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-border bg-surface-muted/60 font-bold">
                <td className="p-3 pl-8 text-content">Total Beban</td>
                <td className="p-3 text-right text-rose-600 dark:text-rose-400">
                  <Money amount={current.totalExpense} size="sm" />
                </td>
                <td className="p-3 text-right text-content-muted">
                  <Money amount={previous.totalExpense} size="sm" />
                </td>
                <td className="p-3 text-right">
                  <Delta current={current.totalExpense} previous={previous.totalExpense} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
