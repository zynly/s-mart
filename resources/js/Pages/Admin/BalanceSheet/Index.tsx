import { type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Money } from '@/Components/common/Money'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'

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
    <table className="w-full text-sm">
      <tbody>
        {lines.map((line) => (
          <tr key={line.code ?? line.name} className="border-t border-border">
            <td className="p-2">{line.code && <span className="font-mono text-content-muted">{line.code} </span>}{line.name}</td>
            <td className="p-2 text-right"><Money amount={line.amount} size="sm" /></td>
          </tr>
        ))}
        {lines.length === 0 && <tr><td className="p-2 text-content-muted" colSpan={2}>Tidak ada saldo.</td></tr>}
      </tbody>
    </table>
  )
}

export default function Index({ tab, sheet, asOf }: BalanceSheetIndexProps) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Neraca"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Neraca' }]}
        actions={<Badge className={sheet.isBalanced ? 'bg-success text-white' : 'bg-danger text-white'}>{sheet.isBalanced ? 'Seimbang' : 'TIDAK SEIMBANG'}</Badge>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'accounts', label: 'Bagan Akun', href: route('admin.accounts.index'), permission: 'setting.view' },
        { key: 'journals', label: 'Jurnal', href: route('admin.journals.index'), permission: 'journal.view' },
        { key: 'ledger', label: 'Buku Besar', href: route('admin.ledger.index'), permission: 'ledger.view' },
        { key: 'trial-balance', label: 'Neraca Saldo', href: route('admin.trial-balance.index'), permission: 'ledger.view' },
        { key: 'profit-loss', label: 'Laba Rugi', href: route('admin.profit-loss.index'), permission: 'ledger.view' },
        { key: 'balance-sheet', label: 'Neraca', href: route('admin.balance-sheet.index'), permission: 'ledger.view' },
        { key: 'accounting-periods', label: 'Periode', href: route('admin.accounting-periods.index'), permission: 'ledger.view' },
      ]} />

      <div className="space-y-1.5 w-fit">
        <Label>Per Tanggal</Label>
        <Input type="date" value={asOf} onChange={(e) => router.get(route('admin.balance-sheet.index'), { as_of: e.target.value }, { preserveState: true })} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border">
          <div className="border-b border-border bg-surface p-2 font-semibold">Aset</div>
          <LineTable lines={sheet.assets} />
          <div className="flex justify-between border-t border-border p-2 font-semibold"><span>Total Aset</span><Money amount={sheet.totalAssets} size="sm" /></div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border">
            <div className="border-b border-border bg-surface p-2 font-semibold">Kewajiban</div>
            <LineTable lines={sheet.liabilities} />
            <div className="flex justify-between border-t border-border p-2 font-semibold"><span>Total Kewajiban</span><Money amount={sheet.totalLiabilities} size="sm" /></div>
          </div>

          <div className="rounded-md border border-border">
            <div className="border-b border-border bg-surface p-2 font-semibold">Ekuitas</div>
            <LineTable lines={sheet.equity} />
            <div className="flex justify-between border-t border-border p-2 font-semibold"><span>Total Ekuitas</span><Money amount={sheet.totalEquity} size="sm" /></div>
          </div>

          <div className="flex justify-between rounded-md bg-bg p-3 font-semibold">
            <span>Total Kewajiban + Ekuitas</span>
            <Money amount={sheet.totalLiabilities + sheet.totalEquity} size="sm" />
          </div>
        </div>
      </div>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
