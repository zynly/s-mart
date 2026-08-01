import { type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Money } from '@/Components/common/Money'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'

type AccountOption = { id: number; code: string; name: string }

type LedgerEntry = {
  id: number
  debit: number
  credit: number
  description: string | null
  journal_reference: string
  journal_date: string
  journal_description: string | null
  journal_type: string
}

type LedgerAccount = { id: number; code: string; name: string; normal_balance: 'debit' | 'credit' }

type LedgerIndexProps = {
  tab: string
  accounts: AccountOption[]
  account: LedgerAccount | null
  entries: LedgerEntry[]
  openingBalance: number
  filters: { account_id: number | null; from: string; to: string }
}

export default function Index({ tab, accounts, account, entries, openingBalance, filters }: LedgerIndexProps) {
  function applyFilters(next: Partial<{ account_id: string; from: string; to: string }>) {
    router.get(route('admin.ledger.index'), {
      account_id: next.account_id ?? (filters.account_id ? String(filters.account_id) : ''),
      from: next.from ?? filters.from,
      to: next.to ?? filters.to,
    }, { preserveState: true, replace: true })
  }

  const rows: { entry: LedgerEntry; balance: number }[] = []
  let runningBalance = openingBalance
  for (const entry of entries) {
    runningBalance += account?.normal_balance === 'debit' ? entry.debit - entry.credit : entry.credit - entry.debit
    rows.push({ entry, balance: runningBalance })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Buku Besar" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Buku Besar' }]} />
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
        <div className="space-y-1.5">
          <Label>Akun</Label>
          <Select value={filters.account_id ? String(filters.account_id) : ''} onValueChange={(v) => applyFilters({ account_id: v })}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Pilih akun" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Dari</Label>
          <Input type="date" value={filters.from} onChange={(e) => applyFilters({ from: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Sampai</Label>
          <Input type="date" value={filters.to} onChange={(e) => applyFilters({ to: e.target.value })} />
        </div>
      </div>

      {account === null ? (
        <p className="text-sm text-content-muted">Pilih akun untuk melihat mutasinya.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-content-muted">
              <tr>
                <th className="p-2">Tanggal</th><th className="p-2">Referensi</th><th className="p-2">Keterangan</th>
                <th className="p-2 text-right">Debit</th><th className="p-2 text-right">Kredit</th><th className="p-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border bg-bg font-medium">
                <td className="p-2" colSpan={5}>Saldo Awal</td>
                <td className="p-2 text-right"><Money amount={openingBalance} size="sm" /></td>
              </tr>
              {rows.map(({ entry, balance }) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="p-2">{new Date(entry.journal_date).toLocaleDateString('id-ID')}</td>
                  <td className="p-2 font-mono">{entry.journal_reference}</td>
                  <td className="p-2 text-content-muted">{entry.description ?? entry.journal_description ?? '—'}</td>
                  <td className="p-2 text-right">{entry.debit > 0 && <Money amount={entry.debit} size="sm" />}</td>
                  <td className="p-2 text-right">{entry.credit > 0 && <Money amount={entry.credit} size="sm" />}</td>
                  <td className="p-2 text-right"><Money amount={balance} size="sm" /></td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td className="p-4 text-center text-content-muted" colSpan={6}>Tidak ada mutasi pada periode ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
