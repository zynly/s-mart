import { useMemo, useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import { Search, ChevronsUpDown, Check, BookOpen } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Money } from '@/Components/common/Money'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Checkbox } from '@/Components/ui/checkbox'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { formatDate } from '@/Lib/date'

type AccountOption = {
  id: number
  code: string
  name: string
  type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
}

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

const TYPE_LABELS: Record<string, string> = {
  asset: 'Aset',
  liability: 'Kewajiban',
  equity: 'Ekuitas',
  revenue: 'Pendapatan',
  expense: 'Beban',
}

const TYPE_BADGE: Record<string, string> = {
  asset: 'bg-blue-600 text-white',
  liability: 'bg-amber-600 text-white',
  equity: 'bg-teal-600 text-white',
  revenue: 'bg-emerald-600 text-white',
  expense: 'bg-rose-600 text-white',
}

export default function Index({ tab, accounts, account, entries, openingBalance, filters }: LedgerIndexProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [accountSearch, setAccountSearch] = useState('')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')

  const selectedAccountObj = useMemo(() => {
    if (!filters.account_id) return null
    return accounts.find((a) => a.id === Number(filters.account_id)) ?? null
  }, [accounts, filters.account_id])

  const filteredAccountOptions = useMemo(() => {
    let list = accounts
    if (selectedTypeFilter !== 'all') {
      list = list.filter((a) => a.type === selectedTypeFilter)
    }
    if (accountSearch.trim()) {
      const q = accountSearch.toLowerCase()
      list = list.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
    }
    return list
  }, [accounts, selectedTypeFilter, accountSearch])

  function applyFilters(next: Partial<{ account_id: string; from: string; to: string }>) {
    router.get(
      route('admin.ledger.index'),
      {
        account_id: next.account_id ?? (filters.account_id ? String(filters.account_id) : ''),
        from: next.from ?? filters.from,
        to: next.to ?? filters.to,
      },
      { preserveState: true, replace: true }
    )
  }

  const rows: { entry: LedgerEntry; balance: number }[] = []
  let runningBalance = openingBalance
  for (const entry of entries) {
    runningBalance += account?.normal_balance === 'debit' ? entry.debit - entry.credit : entry.credit - entry.debit
    rows.push({ entry, balance: runningBalance })
  }

  const isAllSelected = useMemo(() => {
    if (entries.length === 0) return false
    return entries.every((e) => selectedIds.includes(e.id))
  }, [entries, selectedIds])

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(entries.map((e) => e.id))
    }
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Buku Besar" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Buku Besar' }]} />
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

      {/* Filter Bar & Pemilih Akun (Searchable Combobox) */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-2xs">
        <div className="space-y-1.5 flex-1 min-w-[280px]">
          <Label className="text-xs font-semibold text-content-muted">Pilih Akun Buku Besar</Label>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-full justify-between h-9 px-3 text-xs sm:text-sm font-normal border-border bg-surface"
              >
                {selectedAccountObj ? (
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                      {selectedAccountObj.code}
                    </span>
                    <span className="truncate font-medium">{selectedAccountObj.name}</span>
                  </div>
                ) : (
                  <span className="text-content-muted flex items-center gap-2">
                    <BookOpen className="size-4 text-content-muted shrink-0" /> Pilih akun untuk melihat mutasi...
                  </span>
                )}
                <ChevronsUpDown className="size-4 shrink-0 opacity-50 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] sm:w-[420px] p-2" align="start">
              {/* Bar Pencarian */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
                <Input
                  placeholder="Cari kode atau nama akun..."
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                  autoFocus
                />
              </div>

              {/* Filter Cepat Tipe Akun */}
              <div className="flex flex-wrap gap-1 border-b border-border pb-2 mb-2">
                <button
                  type="button"
                  onClick={() => setSelectedTypeFilter('all')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    selectedTypeFilter === 'all'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-surface-muted text-content-muted hover:text-content'
                  }`}
                >
                  Semua
                </button>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTypeFilter(key)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                      selectedTypeFilter === key
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-surface-muted text-content-muted hover:text-content'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Scrollable List (Maksimal Tinggi Terkontrol) */}
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {filteredAccountOptions.length === 0 ? (
                  <p className="p-4 text-center text-xs text-content-muted">Akun tidak ditemukan.</p>
                ) : (
                  filteredAccountOptions.map((a) => {
                    const isSelected = Number(filters.account_id) === a.id
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          applyFilters({ account_id: String(a.id) })
                          setComboboxOpen(false)
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-md text-left text-xs transition-colors ${
                          isSelected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-surface-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-content-muted font-bold text-xs">{a.code}</span>
                          <span className="truncate text-content">{a.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.type && (
                            <Badge className={`${TYPE_BADGE[a.type]} text-[9px] px-1.5 py-0`}>
                              {TYPE_LABELS[a.type]}
                            </Badge>
                          )}
                          {isSelected && <Check className="size-3.5 text-primary" />}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-content-muted">Dari Tanggal</Label>
          <Input type="date" value={filters.from} onChange={(e) => applyFilters({ from: e.target.value })} className="h-9 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-content-muted">Sampai Tanggal</Label>
          <Input type="date" value={filters.to} onChange={(e) => applyFilters({ to: e.target.value })} className="h-9 text-xs" />
        </div>
      </div>

      {account === null ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-content-muted">
          <BookOpen className="size-8 mx-auto mb-2 text-content-muted/60" />
          <p className="text-sm font-medium">Pilih akun buku besar pada pemilih akun di atas untuk melihat mutasi transaksi.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-left font-semibold text-content-muted">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} aria-label="Pilih semua mutasi" />
                  </th>
                  <th className="p-3 w-12 text-center font-mono">No</th>
                  <th className="p-3 w-28">Tanggal</th>
                  <th className="p-3 w-32 font-mono">Referensi</th>
                  <th className="p-3">Keterangan Jurnal</th>
                  <th className="p-3 text-right w-32">Debit</th>
                  <th className="p-3 text-right w-32">Kredit</th>
                  <th className="p-3 text-right w-36">Saldo Mutasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr className="bg-surface-muted/70 font-bold text-content">
                  <td className="p-3" colSpan={7}>
                    Saldo Awal Per Tanggal {formatDate(filters.from)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    <Money amount={openingBalance} size="sm" />
                  </td>
                </tr>
                {rows.map(({ entry, balance }, index) => {
                  const isSelected = selectedIds.includes(entry.id)
                  return (
                    <tr key={entry.id} className={`transition-colors hover:bg-surface-muted/40 ${isSelected ? 'bg-primary/5' : ''}`}>
                      <td className="p-3 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(entry.id)}
                          aria-label={`Pilih mutasi ${entry.journal_reference}`}
                        />
                      </td>
                      <td className="p-3 text-center font-mono text-xs text-content-muted">{index + 1}</td>
                      <td className="p-3 text-content-muted whitespace-nowrap">{formatDate(entry.journal_date)}</td>
                      <td className="p-3 font-mono font-semibold text-primary whitespace-nowrap">{entry.journal_reference}</td>
                      <td className="p-3 text-content">{entry.description ?? entry.journal_description ?? '—'}</td>
                      <td className="p-3 text-right font-medium">
                        {entry.debit > 0 ? <Money amount={entry.debit} size="sm" /> : '—'}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {entry.credit > 0 ? <Money amount={entry.credit} size="sm" /> : '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-content">
                        <Money amount={balance} size="sm" />
                      </td>
                    </tr>
                  )
                })}
                {entries.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-content-muted" colSpan={8}>
                      Tidak ada mutasi transaksi pada periode tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
