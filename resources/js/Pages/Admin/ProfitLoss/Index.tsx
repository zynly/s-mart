import { type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Money } from '@/Components/common/Money'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Card, CardContent } from '@/Components/ui/card'

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
  if (diff === 0) return <span className="text-content-muted">—</span>
  return <Money amount={diff} size="sm" showSign />
}

export default function Index({ tab, current, previous, filters }: ProfitLossIndexProps) {
  function applyFilters(next: Partial<{ from: string; to: string }>) {
    router.get(route('admin.profit-loss.index'), { from: next.from ?? filters.from, to: next.to ?? filters.to }, { preserveState: true })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Laba Rugi" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Laba Rugi' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'accounts', label: 'Bagan Akun', href: route('admin.accounts.index'), permission: 'setting.view' },
        { key: 'journals', label: 'Jurnal', href: route('admin.journals.index'), permission: 'journal.view' },
        { key: 'ledger', label: 'Buku Besar', href: route('admin.ledger.index'), permission: 'ledger.view' },
        { key: 'trial-balance', label: 'Neraca Saldo', href: route('admin.trial-balance.index'), permission: 'ledger.view' },
        { key: 'profit-loss', label: 'Laba Rugi', href: route('admin.profit-loss.index'), permission: 'ledger.view' },
        { key: 'balance-sheet', label: 'Neraca', href: route('admin.balance-sheet.index'), permission: 'ledger.view' },
        { key: 'accounting-periods', label: 'Periode', href: route('admin.accounting-periods.index'), permission: 'ledger.view' },
      ]} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5"><Label>Dari</Label><Input type="date" value={filters.from} onChange={(e) => applyFilters({ from: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Sampai</Label><Input type="date" value={filters.to} onChange={(e) => applyFilters({ to: e.target.value })} /></div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-content-muted">
            <tr><th className="p-2">Akun</th><th className="p-2 text-right">Periode Ini</th><th className="p-2 text-right">Periode Lalu</th><th className="p-2 text-right">Selisih</th></tr>
          </thead>
          <tbody>
            <tr className="border-t border-border bg-bg font-semibold"><td className="p-2" colSpan={4}>Pendapatan</td></tr>
            {current.revenue.map((line) => {
              const prevLine = previous.revenue.find((p) => p.code === line.code)
              return (
                <tr key={line.code} className="border-t border-border">
                  <td className="p-2 pl-6">{line.name}</td>
                  <td className="p-2 text-right"><Money amount={line.amount} size="sm" /></td>
                  <td className="p-2 text-right">{prevLine ? <Money amount={prevLine.amount} size="sm" /> : '—'}</td>
                  <td className="p-2 text-right"><Delta current={line.amount} previous={prevLine?.amount ?? 0} /></td>
                </tr>
              )
            })}
            <tr className="border-t border-border font-medium">
              <td className="p-2 pl-6">Total Pendapatan</td>
              <td className="p-2 text-right"><Money amount={current.totalRevenue} size="sm" /></td>
              <td className="p-2 text-right"><Money amount={previous.totalRevenue} size="sm" /></td>
              <td className="p-2 text-right"><Delta current={current.totalRevenue} previous={previous.totalRevenue} /></td>
            </tr>

            <tr className="border-t border-border bg-bg font-semibold"><td className="p-2" colSpan={4}>Beban (termasuk HPP)</td></tr>
            {current.expense.map((line) => {
              const prevLine = previous.expense.find((p) => p.code === line.code)
              return (
                <tr key={line.code} className="border-t border-border">
                  <td className="p-2 pl-6">{line.name}</td>
                  <td className="p-2 text-right"><Money amount={line.amount} size="sm" /></td>
                  <td className="p-2 text-right">{prevLine ? <Money amount={prevLine.amount} size="sm" /> : '—'}</td>
                  <td className="p-2 text-right"><Delta current={line.amount} previous={prevLine?.amount ?? 0} /></td>
                </tr>
              )
            })}
            <tr className="border-t border-border font-medium">
              <td className="p-2 pl-6">Total Beban</td>
              <td className="p-2 text-right"><Money amount={current.totalExpense} size="sm" /></td>
              <td className="p-2 text-right"><Money amount={previous.totalExpense} size="sm" /></td>
              <td className="p-2 text-right"><Delta current={current.totalExpense} previous={previous.totalExpense} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-content-muted">Laba Kotor</p><Money amount={current.grossProfit} size="lg" /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-content-muted">HPP</p><Money amount={current.totalCogs} size="lg" /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-content-muted">Laba Bersih</p><Money amount={current.netProfit} size="lg" showSign /></CardContent></Card>
      </div>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
