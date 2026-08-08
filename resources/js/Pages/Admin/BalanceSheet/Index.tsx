import { type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import { Landmark, Scale, ShieldAlert, CheckCircle2, Calendar } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Money } from '@/Components/common/Money'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'

type Line = { code: string | null; name: string; amount: number }

type BalanceSheetResult = {
  assets: Line[]
  liabilities: Line[]
  equity: Line[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  isBalanced: boolean
}

type BalanceSheetIndexProps = {
  tab: string
  sheet: BalanceSheetResult
  asOf: string
}

function LineTable({ lines }: { lines: Line[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <tbody className="divide-y divide-border/60">
          {lines.map((line) => (
            <tr key={line.code ?? line.name} className="hover:bg-surface-muted/40 transition-colors">
              <td className="p-3 font-medium">
                {line.code && <span className="font-mono text-content-muted mr-2">{line.code}</span>}
                {line.name}
              </td>
              <td className="p-3 text-right font-medium">
                <Money amount={line.amount} size="sm" />
              </td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td className="p-4 text-center text-content-muted" colSpan={2}>
                Tidak ada saldo akun pada kategori ini.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function Index({ tab, sheet, asOf }: BalanceSheetIndexProps) {
  const totalPasiva = sheet.totalLiabilities + sheet.totalEquity

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Neraca (Balance Sheet)"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Neraca' }]}
        actions={
          <Badge
            className={`px-3 py-1 text-xs font-semibold ${
              sheet.isBalanced
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
          >
            {sheet.isBalanced ? '✓ Jurnal Seimbang (Balanced)' : '⚠️ TIDAK SEIMBANG'}
          </Badge>
        }
      />
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
        {/* Total Aset */}
        <Card className="relative overflow-hidden border-border/80 shadow-2xs">
          <div className="absolute right-3 top-3 rounded-lg bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
            <Landmark className="size-5" />
          </div>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-content-muted">Total Aset (Aktiva)</p>
            <div className="mt-1 text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-400">
              <Money amount={sheet.totalAssets} size="lg" />
            </div>
            <p className="mt-2 text-xs text-content-muted">Kas, Bank, Piutang & Persediaan</p>
          </CardContent>
        </Card>

        {/* Total Kewajiban */}
        <Card className="relative overflow-hidden border-border/80 shadow-2xs">
          <div className="absolute right-3 top-3 rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
            <Scale className="size-5" />
          </div>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-content-muted">Total Kewajiban (Hutang)</p>
            <div className="mt-1 text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-400">
              <Money amount={sheet.totalLiabilities} size="lg" />
            </div>
            <p className="mt-2 text-xs text-content-muted">Utang Usaha & Konsinyasi</p>
          </CardContent>
        </Card>

        {/* Total Ekuitas */}
        <Card className="relative overflow-hidden border-border/80 shadow-2xs">
          <div className="absolute right-3 top-3 rounded-lg bg-teal-500/10 p-2.5 text-teal-600 dark:text-teal-400">
            <Landmark className="size-5" />
          </div>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-content-muted">Total Ekuitas (Modal)</p>
            <div className="mt-1 text-lg sm:text-xl font-bold text-teal-700 dark:text-teal-400">
              <Money amount={sheet.totalEquity} size="lg" />
            </div>
            <p className="mt-2 text-xs text-content-muted">Modal Disetor & Laba Ditahan</p>
          </CardContent>
        </Card>

        {/* Total Pasiva */}
        <Card className={`relative overflow-hidden border border-border/80 shadow-2xs ${sheet.isBalanced ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : 'bg-rose-50/30 dark:bg-rose-950/10'}`}>
          <div className={`absolute right-3 top-3 rounded-lg p-2.5 ${sheet.isBalanced ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'}`}>
            {sheet.isBalanced ? <CheckCircle2 className="size-5" /> : <ShieldAlert className="size-5" />}
          </div>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-content-muted">Total Kewajiban + Ekuitas</p>
            <div className="mt-1 text-lg sm:text-xl font-bold text-content">
              <Money amount={totalPasiva} size="lg" />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
              {sheet.isBalanced ? (
                <span className="text-emerald-600 dark:text-emerald-400">✓ Balance dengan Aset</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">⚠️ Selisih {Math.abs(sheet.totalAssets - totalPasiva).toLocaleString()}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Per Tanggal */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-2xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-content">
          <Calendar className="size-4 text-primary" /> Tanggal Posisi Keuangan
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-content-muted">Per Tanggal</Label>
          <Input
            type="date"
            value={asOf}
            onChange={(e) =>
              router.get(route('admin.balance-sheet.index'), { as_of: e.target.value }, { preserveState: true })
            }
            className="h-8 text-xs w-40"
          />
        </div>
      </div>

      {/* Rincian Komponen Neraca */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Kolom Kiri: ASET (Aktiva) */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border-b border-border bg-blue-500/10 px-4 py-3 font-bold text-blue-900 dark:text-blue-200 flex items-center justify-between text-sm">
              <span>📦 ASET (AKTIVA)</span>
              <span className="text-xs font-mono font-normal text-content-muted">Level 1</span>
            </div>
            <LineTable lines={sheet.assets} />
          </div>

          <div className="border-t border-border bg-surface-muted/60 p-3.5 flex justify-between items-center font-bold text-sm">
            <span className="text-content">Total Aset</span>
            <span className="text-blue-700 dark:text-blue-400 font-mono text-base">
              <Money amount={sheet.totalAssets} size="sm" />
            </span>
          </div>
        </div>

        {/* Kolom Kanan: KEWAJIBAN & EKUITAS (Pasiva) */}
        <div className="flex flex-col gap-5">
          {/* Panel Kewajiban */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
            <div className="border-b border-border bg-amber-500/10 px-4 py-3 font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between text-sm">
              <span>💳 KEWAJIBAN (UTANG)</span>
              <span className="text-xs font-mono font-normal text-content-muted">Liabilities</span>
            </div>
            <LineTable lines={sheet.liabilities} />
            <div className="border-t border-border bg-surface-muted/60 p-3.5 flex justify-between items-center font-bold text-sm">
              <span className="text-content">Total Kewajiban</span>
              <span className="text-amber-700 dark:text-amber-400 font-mono text-base">
                <Money amount={sheet.totalLiabilities} size="sm" />
              </span>
            </div>
          </div>

          {/* Panel Ekuitas */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
            <div className="border-b border-border bg-teal-500/10 px-4 py-3 font-bold text-teal-900 dark:text-teal-200 flex items-center justify-between text-sm">
              <span>🏛️ EKUITAS (MODAL)</span>
              <span className="text-xs font-mono font-normal text-content-muted">Equity</span>
            </div>
            <LineTable lines={sheet.equity} />
            <div className="border-t border-border bg-surface-muted/60 p-3.5 flex justify-between items-center font-bold text-sm">
              <span className="text-content">Total Ekuitas</span>
              <span className="text-teal-700 dark:text-teal-400 font-mono text-base">
                <Money amount={sheet.totalEquity} size="sm" />
              </span>
            </div>
          </div>

          {/* Total Kewajiban + Ekuitas */}
          <div className="rounded-xl border border-border bg-surface-muted/80 p-4 flex justify-between items-center font-bold text-sm sm:text-base shadow-2xs">
            <span>Total Kewajiban + Ekuitas</span>
            <span className="font-mono text-content">
              <Money amount={totalPasiva} size="lg" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
