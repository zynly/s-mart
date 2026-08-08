import { useMemo, useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Money } from '@/Components/common/Money'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Checkbox } from '@/Components/ui/checkbox'

type TrialBalanceRow = {
  account: { id: number; code: string; name: string; type: string; normal_balance: 'debit' | 'credit' }
  debit: number
  credit: number
  balance: number
}

type TrialBalanceIndexProps = {
  tab: string
  rows: TrialBalanceRow[]
  totalDebit: number
  totalCredit: number
  asOf: string
}

export default function Index({ tab, rows, totalDebit, totalCredit, asOf }: TrialBalanceIndexProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const isBalanced = totalDebit === totalCredit

  const isAllSelected = useMemo(() => {
    if (rows.length === 0) return false
    return rows.every((r) => selectedIds.includes(r.account.id))
  }, [rows, selectedIds])

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(rows.map((r) => r.account.id))
    }
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Neraca Saldo"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Neraca Saldo' }]}
        actions={
          <Badge className={isBalanced ? 'bg-success text-white' : 'bg-danger text-white'}>
            {isBalanced ? 'Seimbang' : 'TIDAK SEIMBANG'}
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

      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label>Per Tanggal</Label>
          <Input
            type="date"
            value={asOf}
            onChange={(e) => router.get(route('admin.trial-balance.index'), { as_of: e.target.value }, { preserveState: true })}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-content-muted">
            <tr>
              <th className="p-2 w-10 text-center">
                <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} aria-label="Pilih semua baris" />
              </th>
              <th className="p-2 w-12 text-center font-mono">No</th>
              <th className="p-2">Kode</th>
              <th className="p-2">Akun</th>
              <th className="p-2 text-right">Debit</th>
              <th className="p-2 text-right">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isSelected = selectedIds.includes(row.account.id)
              return (
                <tr key={row.account.id} className={`border-t border-border ${isSelected ? 'bg-primary/5' : ''}`}>
                  <td className="p-2 text-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectOne(row.account.id)}
                      aria-label={`Pilih akun ${row.account.code}`}
                    />
                  </td>
                  <td className="p-2 text-center font-mono text-xs text-content-muted">{index + 1}</td>
                  <td className="p-2 font-mono">{row.account.code}</td>
                  <td className="p-2">{row.account.name}</td>
                  <td className="p-2 text-right">{row.debit > 0 && <Money amount={row.debit} size="sm" />}</td>
                  <td className="p-2 text-right">{row.credit > 0 && <Money amount={row.credit} size="sm" />}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className={`border-t border-border font-semibold ${isBalanced ? '' : 'bg-danger/10'}`}>
              <td className="p-2" colSpan={4}>
                Total
              </td>
              <td className="p-2 text-right">
                <Money amount={totalDebit} size="sm" />
              </td>
              <td className="p-2 text-right">
                <Money amount={totalCredit} size="sm" />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
