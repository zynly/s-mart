import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { StatCard } from '@/Components/common/StatCard'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import type { Paginated } from '@/Types'

type AccountRow = { id: number; name: string; type: string; current_balance: number; is_drawer: boolean }
type CategoryRow = { id: number; name: string; type: string }

type TransactionRow = {
  id: number
  reference: string
  type: string
  amount: number
  balance_after: number
  description: string | null
  transaction_date: string
  cash_account: { id: number; name: string }
  cash_category: { id: number; name: string } | null
  transfer_to_account: { id: number; name: string } | null
}

type CashIndexProps = {
  tab: string
  transactions: Paginated<TransactionRow>
  accounts: AccountRow[]
  categories: CategoryRow[]
  filters: { cash_account_id?: string; type?: string }
}

const TYPE_LABELS: Record<string, string> = { in: 'Masuk', out: 'Keluar', transfer: 'Transfer' }

export default function Index({ tab, transactions, accounts, categories, filters }: CashIndexProps) {
  const [accountFilter, setAccountFilter] = useState(filters.cash_account_id ?? '')

  const inForm = useForm({ cash_account_id: '', cash_category_id: '', amount: 0, description: '' })
  const outForm = useForm({ cash_account_id: '', cash_category_id: '', amount: 0, description: '' })
  const transferForm = useForm({ from_account_id: '', to_account_id: '', amount: 0 })

  function applyFilter(accountId: string) {
    setAccountFilter(accountId)
    router.get(route('admin.cash.index'), { cash_account_id: accountId }, { preserveState: true, replace: true })
  }

  const submitIn: FormEventHandler = (e) => {
    e.preventDefault()
    inForm.post(route('admin.cash.in'), { preserveScroll: true, onSuccess: () => inForm.reset() })
  }

  const submitOut: FormEventHandler = (e) => {
    e.preventDefault()
    outForm.post(route('admin.cash.out'), { preserveScroll: true, onSuccess: () => outForm.reset() })
  }

  const submitTransfer: FormEventHandler = (e) => {
    e.preventDefault()
    transferForm.post(route('admin.cash.transfer'), { preserveScroll: true, onSuccess: () => transferForm.reset() })
  }

  const columns: ColumnDef<TransactionRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'account', header: 'Akun', cell: ({ row }) => row.original.cash_account.name },
    { id: 'type', header: 'Tipe', cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type] ?? row.original.type}</Badge> },
    { id: 'category', header: 'Kategori', cell: ({ row }) => row.original.cash_category?.name ?? (row.original.transfer_to_account ? `→ ${row.original.transfer_to_account.name}` : '—') },
    { id: 'amount', header: 'Nominal', cell: ({ row }) => <Money amount={row.original.type === 'out' ? -row.original.amount : row.original.amount} showSign /> },
    { id: 'balance', header: 'Saldo Akhir', cell: ({ row }) => <Money amount={row.original.balance_after} size="sm" /> },
    { id: 'desc', header: 'Keterangan', cell: ({ row }) => row.original.description ?? '—' },
    { id: 'date', header: 'Tanggal', cell: ({ row }) => new Date(row.original.transaction_date).toLocaleDateString('id-ID') },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Kas" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Kas' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'cashier-session', label: 'Sesi Kasir', href: route('admin.cashier-session.index'), permission: 'pos.view' },
        { key: 'cash', label: 'Kas', href: route('admin.cash.index'), permission: 'cash.view' },
      ]} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {accounts.map((a) => (
          <StatCard key={a.id} label={`${a.name}${a.is_drawer ? ' (laci)' : ''}`} value={new Intl.NumberFormat('id-ID').format(a.current_balance)} />
        ))}
      </div>

      <Tabs defaultValue="buku">
        <TabsList>
          <TabsTrigger value="buku">Buku Kas</TabsTrigger>
          <TabsTrigger value="masuk">Kas Masuk</TabsTrigger>
          <TabsTrigger value="keluar">Kas Keluar</TabsTrigger>
          <TabsTrigger value="transfer">Transfer / Drop</TabsTrigger>
        </TabsList>

        <TabsContent value="buku" className="flex flex-col gap-3">
          <Select value={accountFilter || 'all'} onValueChange={(v) => applyFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Semua akun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua akun</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DataTable
            columns={columns}
            data={transactions.data}
            getRowId={(row) => String(row.id)}
            pagination={{
              page: transactions.current_page,
              perPage: transactions.per_page,
              total: transactions.total,
              onPageChange: (page) => router.get(route('admin.cash.index'), { cash_account_id: accountFilter, page }, { preserveState: true }),
            }}
          />
        </TabsContent>

        <TabsContent value="masuk">
          <form onSubmit={submitIn} className="flex max-w-md flex-col gap-4">
            <div className="space-y-1.5">
              <Label>Akun Kas</Label>
              <Select value={inForm.data.cash_account_id} onValueChange={(v) => inForm.setData('cash_account_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={inForm.data.cash_category_id} onValueChange={(v) => inForm.setData('cash_category_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.type === 'in').map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nominal</Label>
              <MoneyInput value={inForm.data.amount} onChange={(v) => inForm.setData('amount', v)} />
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan</Label>
              <Input value={inForm.data.description} onChange={(e) => inForm.setData('description', e.target.value)} />
              {inForm.errors.description && <p className="text-sm text-danger">{inForm.errors.description}</p>}
            </div>
            <Button type="submit" disabled={inForm.processing}>Catat Kas Masuk</Button>
          </form>
        </TabsContent>

        <TabsContent value="keluar">
          <form onSubmit={submitOut} className="flex max-w-md flex-col gap-4">
            <div className="space-y-1.5">
              <Label>Akun Kas</Label>
              <Select value={outForm.data.cash_account_id} onValueChange={(v) => outForm.setData('cash_account_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={outForm.data.cash_category_id} onValueChange={(v) => outForm.setData('cash_category_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.type === 'out').map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nominal</Label>
              <MoneyInput value={outForm.data.amount} onChange={(v) => outForm.setData('amount', v)} />
              {outForm.errors.amount && <p className="text-sm text-danger">{outForm.errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan</Label>
              <Input value={outForm.data.description} onChange={(e) => outForm.setData('description', e.target.value)} />
            </div>
            <Button type="submit" disabled={outForm.processing}>Catat Kas Keluar</Button>
          </form>
        </TabsContent>

        <TabsContent value="transfer">
          <form onSubmit={submitTransfer} className="flex max-w-md flex-col gap-4">
            <p className="text-xs text-content-muted">Drop cash (laci → brankas) dan setoran bank (brankas → rekening) adalah transfer antar akun, bukan pengeluaran.</p>
            <div className="space-y-1.5">
              <Label>Dari Akun</Label>
              <Select value={transferForm.data.from_account_id} onValueChange={(v) => transferForm.setData('from_account_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun asal" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ke Akun</Label>
              <Select value={transferForm.data.to_account_id} onValueChange={(v) => transferForm.setData('to_account_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transferForm.errors.to_account_id && <p className="text-sm text-danger">{transferForm.errors.to_account_id}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Nominal</Label>
              <MoneyInput value={transferForm.data.amount} onChange={(v) => transferForm.setData('amount', v)} />
              {transferForm.errors.amount && <p className="text-sm text-danger">{transferForm.errors.amount}</p>}
            </div>
            <Button type="submit" disabled={transferForm.processing}>Proses Transfer</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
