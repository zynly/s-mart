import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowDownCircle, ArrowLeftRight, ArrowRight, ArrowUpCircle, Banknote,
  BookOpen, Building2, Check, CheckCircle2, Coins, Edit2, Info, Landmark,
  Lock, Plus, Power, Receipt, ShieldCheck, Store, Wallet, XCircle,
} from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Checkbox } from '@/Components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Switch } from '@/Components/ui/switch'
import { formatDate } from '@/Lib/date'
import { cn } from '@/Lib/utils'
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

type FullAccountRow = {
  id: number
  code: string
  name: string
  type: string
  outlet_id: number
  outlet: { id: number; name: string } | null
  is_drawer: boolean
  is_default: boolean
  is_active: boolean
  current_balance: number
}
type OutletRef = { id: number; name: string }

type CashIndexProps = {
  tab: string
  transactions: Paginated<TransactionRow>
  accounts: AccountRow[]
  categories: CategoryRow[]
  allAccounts: FullAccountRow[]
  outlets: OutletRef[]
  filters: { cash_account_id?: string; type?: string }
}

const TYPE_LABELS: Record<string, string> = { in: 'Kas Masuk', out: 'Kas Keluar', transfer: 'Transfer / Drop' }
const TYPE_BADGES: Record<string, string> = {
  in: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  out: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  transfer: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
}

const emptyAccountForm = {
  code: '', name: '', type: 'cash' as 'cash' | 'bank' | 'ewallet', outlet_id: '',
  bank_name: '', account_number: '', account_holder: '', opening_balance: 0,
  is_default: false, is_drawer: true, is_active: true,
}

export default function Index({
  tab = 'cash',
  transactions,
  accounts = [],
  categories = [],
  allAccounts = [],
  outlets = [],
  filters = {},
}: CashIndexProps) {
  const safeAccounts = Array.isArray(accounts) ? accounts : []
  const safeCategories = Array.isArray(categories) ? categories : []
  const safeAllAccounts = Array.isArray(allAccounts) ? allAccounts : []
  const safeOutlets = Array.isArray(outlets) ? outlets : []
  const safeTransactions = Array.isArray(transactions?.data) ? transactions.data : []

  const [accountFilter, setAccountFilter] = useState(filters.cash_account_id ?? '')
  const [editingAccount, setEditingAccount] = useState<FullAccountRow | null>(null)
  const [accountFormOpen, setAccountFormOpen] = useState(false)

  const inForm = useForm({ cash_account_id: safeAccounts[0] ? String(safeAccounts[0].id) : '', cash_category_id: '', amount: 0, description: '' })
  const outForm = useForm({ cash_account_id: safeAccounts[0] ? String(safeAccounts[0].id) : '', cash_category_id: '', amount: 0, description: '' })
  const transferForm = useForm({
    from_account_id: safeAccounts[0] ? String(safeAccounts[0].id) : '',
    to_account_id: safeAccounts[1] ? String(safeAccounts[1].id) : '',
    amount: 0,
  })
  const accountForm = useForm(emptyAccountForm)

  function openNewAccount() {
    setEditingAccount(null)
    accountForm.setData({
      ...emptyAccountForm,
      code: `KAS-${safeAllAccounts.length + 1}`,
      name: `Akun Kas ${safeAllAccounts.length + 1}`,
      outlet_id: safeOutlets[0] ? String(safeOutlets[0].id) : '',
    })
    accountForm.clearErrors()
    setAccountFormOpen(true)
  }

  function openEditAccount(a: FullAccountRow) {
    setEditingAccount(a)
    accountForm.setData({
      code: a.code ?? '',
      name: a.name ?? '',
      type: (a.type as 'cash' | 'bank' | 'ewallet') || 'cash',
      outlet_id: String(a.outlet_id ?? (safeOutlets[0]?.id ?? '')),
      bank_name: '',
      account_number: '',
      account_holder: '',
      opening_balance: 0,
      is_default: a.is_default ?? false,
      is_drawer: a.is_drawer ?? false,
      is_active: a.is_active ?? true,
    })
    accountForm.clearErrors()
    setAccountFormOpen(true)
  }

  const submitAccount: FormEventHandler = (e) => {
    e.preventDefault()
    const opts = { preserveScroll: true as const, onSuccess: () => setAccountFormOpen(false) }
    if (editingAccount) {
      accountForm.put(route('admin.cash-accounts.update', editingAccount.id), opts)
    } else {
      accountForm.post(route('admin.cash-accounts.store'), opts)
    }
  }

  function toggleAccountActive(a: FullAccountRow) {
    router.put(
      route('admin.cash-accounts.update', a.id),
      {
        code: a.code,
        name: a.name,
        type: a.type,
        outlet_id: a.outlet_id,
        is_default: a.is_default,
        is_drawer: a.is_drawer,
        is_active: !a.is_active,
      },
      { preserveScroll: true },
    )
  }

  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([])

  const allAccountsSelected = safeAllAccounts.length > 0 && selectedAccountIds.length === safeAllAccounts.length

  function toggleSelectAllAccounts() {
    if (allAccountsSelected) {
      setSelectedAccountIds([])
    } else {
      setSelectedAccountIds(safeAllAccounts.map((a) => a.id))
    }
  }

  function toggleSelectAccount(id: number) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  function handleBulkAccountAction(action: 'activate' | 'deactivate') {
    if (selectedAccountIds.length === 0) return

    router.post(
      route('admin.cash-accounts.bulk-update'),
      { ids: selectedAccountIds, action },
      {
        preserveScroll: true,
        onSuccess: () => {
          setSelectedAccountIds([])
          toast.success(`${selectedAccountIds.length} Akun kas berhasil diperbarui.`)
        },
        onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal memperbarui status masal.'),
      },
    )
  }

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
    {
      accessorKey: 'reference',
      header: 'Referensi',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
          {row.original.reference}
        </span>
      ),
    },
    {
      id: 'account',
      header: 'Akun Kas',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
          <Wallet className="size-3.5 text-slate-400" />
          <span>{row.original.cash_account.name}</span>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Tipe',
      cell: ({ row }) => (
        <Badge variant="outline" className={TYPE_BADGES[row.original.type] ?? ''}>
          {TYPE_LABELS[row.original.type] ?? row.original.type}
        </Badge>
      ),
    },
    {
      id: 'category',
      header: 'Kategori / Tujuan',
      cell: ({ row }) => {
        if (row.original.cash_category) {
          return <span className="font-medium text-slate-700 dark:text-slate-300">{row.original.cash_category.name}</span>
        }
        if (row.original.transfer_to_account) {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
              <ArrowRight className="size-3" />
              <span>{row.original.transfer_to_account.name}</span>
            </span>
          )
        }
        return <span className="text-slate-400">—</span>
      },
    },
    {
      id: 'amount',
      header: 'Nominal',
      cell: ({ row }) => (
        <Money
          amount={row.original.type === 'out' ? -row.original.amount : row.original.amount}
          showSign
          className={cn(
            'font-bold',
            row.original.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : row.original.type === 'out' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400',
          )}
        />
      ),
    },
    {
      id: 'balance',
      header: 'Saldo Akhir',
      cell: ({ row }) => <Money amount={row.original.balance_after} size="sm" className="font-semibold text-slate-700 dark:text-slate-300" />,
    },
    {
      id: 'desc',
      header: 'Keterangan',
      cell: ({ row }) => <span className="text-xs text-slate-500 max-w-[200px] truncate block">{row.original.description || '—'}</span>,
    },
    {
      id: 'date',
      header: 'Tanggal',
      cell: ({ row }) => <span className="text-xs text-slate-500 font-medium">{formatDate(row.original.transaction_date)}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PageHeader title="Kas & Keuangan" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Kas' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'cashier-session', label: 'Sesi Kasir', href: route('admin.cashier-session.index'), permission: 'pos.view' },
        { key: 'cash', label: 'Kas', href: route('admin.cash.index'), permission: 'cash.view' },
      ]} />

      {/* Top Stat Cards — Account Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {safeAccounts.map((a) => {
          const isBank = a.type === 'bank'
          const isLaci = a.is_drawer

          return (
            <Card
              key={a.id}
              className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {a.name}
                    </h4>
                    {isLaci && (
                      <Badge variant="outline" className="text-[9px] font-black bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300">
                        Laci
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isBank ? 'Akun Bank' : isLaci ? 'Laci Kasir' : 'Kas Fisik'}
                  </span>
                </div>

                <div className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl',
                  isBank
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    : isLaci
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                )}>
                  {isBank ? <Building2 className="size-4.5" /> : isLaci ? <Store className="size-4.5" /> : <Wallet className="size-4.5" />}
                </div>
              </div>

              <div className="mt-3">
                <Money amount={a.current_balance} size="lg" className="font-black text-slate-900 dark:text-white" />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Sub-Tabs Navigation for Kas Module */}
      <Tabs defaultValue="buku" className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-12 rounded-2xl bg-slate-100/80 p-1.5 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 inline-flex min-w-full sm:min-w-0">
            <TabsTrigger value="buku" className="gap-2 rounded-xl text-xs font-bold px-4 py-2.5 data-[state=active]:text-white data-[state=active]:[&_svg]:text-amber-400">
              <BookOpen className="size-4" />
              <span>Buku Kas</span>
            </TabsTrigger>

            <TabsTrigger value="transaksi" className="gap-2 rounded-xl text-xs font-bold px-4 py-2.5 data-[state=active]:text-white data-[state=active]:[&_svg]:text-amber-400">
              <Coins className="size-4" />
              <span>Kas Masuk &amp; Keluar</span>
            </TabsTrigger>

            <TabsTrigger value="transfer" className="gap-2 rounded-xl text-xs font-bold px-4 py-2.5 data-[state=active]:text-white data-[state=active]:[&_svg]:text-amber-400">
              <ArrowLeftRight className="size-4" />
              <span>Transfer / Drop</span>
            </TabsTrigger>

            <TabsTrigger value="akun-kas" className="gap-2 rounded-xl text-xs font-bold px-4 py-2.5 data-[state=active]:text-white data-[state=active]:[&_svg]:text-amber-400">
              <Landmark className="size-4" />
              <span>Akun Kas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Sub-Tab 1: Buku Kas */}
        <TabsContent value="buku" className="mt-4 flex flex-col gap-4">
          <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-amber-500" />
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      Mutasi Buku Kas S-Mart
                    </CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Riwayat arus kas masuk, keluar, dan transfer internal akun.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={accountFilter || 'all'} onValueChange={(v) => applyFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-56 h-10 rounded-xl border-slate-200 font-semibold dark:border-slate-800">
                      <SelectValue placeholder="Semua Akun Kas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Akun Kas</SelectItem>
                      {safeAccounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <DataTable
                columns={columns}
                data={safeTransactions}
                getRowId={(row) => String(row.id)}
                emptyDescription="Belum ada riwayat mutasi kas."
                pagination={transactions ? {
                  page: transactions.current_page,
                  perPage: transactions.per_page,
                  total: transactions.total,
                  onPageChange: (page) => router.get(route('admin.cash.index'), { cash_account_id: accountFilter, page }, { preserveState: true }),
                } : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sub-Tab 2: Kas Masuk & Kas Keluar Combined (2-Column Grid Layout) */}
        <TabsContent value="transaksi" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {/* Left Column: Form Catat Kas Masuk */}
            <Card className="w-full border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <ArrowDownCircle className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      Catat Kas Masuk (Pemasukan)
                    </CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Formulir penerimaan uang di luar penjualan POS.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                <form onSubmit={submitIn} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Akun Kas Penerima
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {safeAccounts.map((a) => {
                        const isSelected = String(a.id) === inForm.data.cash_account_id
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => inForm.setData('cash_account_id', String(a.id))}
                            className={cn(
                              'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                            )}
                          >
                            <span className={cn('size-2 rounded-full', isSelected ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700')} />
                            <span>{a.name}</span>
                            {isSelected && <Check className="size-3 text-emerald-600 stroke-[3]" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Kategori Pemasukan
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {safeCategories.filter((c) => c.type === 'in').map((c) => {
                        const isSelected = String(c.id) === inForm.data.cash_category_id
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => inForm.setData('cash_category_id', String(c.id))}
                            className={cn(
                              'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                            )}
                          >
                            <span>{c.name}</span>
                            {isSelected && <Check className="size-3 text-emerald-600 stroke-[3]" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Nominal Masuk (Rp)
                    </Label>
                    <MoneyInput
                      value={inForm.data.amount}
                      onChange={(v) => inForm.setData('amount', v)}
                      className="h-12 rounded-xl text-lg font-bold"
                    />
                    {inForm.errors.amount && <p className="text-xs text-red-600 font-semibold">{inForm.errors.amount}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Keterangan Catatan
                    </Label>
                    <Input
                      value={inForm.data.description}
                      onChange={(e) => inForm.setData('description', e.target.value)}
                      placeholder="Contoh: Modal tambahan, sewa..."
                      className="h-11 rounded-xl"
                    />
                    {inForm.errors.description && <p className="text-xs text-red-600 font-semibold">{inForm.errors.description}</p>}
                  </div>

                  <Button
                    type="submit"
                    disabled={inForm.processing}
                    className="h-11 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-md transition-all mt-2"
                  >
                    <CheckCircle2 className="size-4" />
                    <span>{inForm.processing ? 'Menyimpan…' : 'Catat Kas Masuk Sekarang'}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Right Column: Form Catat Kas Keluar */}
            <Card className="w-full border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400">
                    <ArrowUpCircle className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      Catat Kas Keluar (Pengeluaran)
                    </CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Formulir pencatatan biaya operasional, konsumsi, dll.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                <form onSubmit={submitOut} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Akun Kas Sumber
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {safeAccounts.map((a) => {
                        const isSelected = String(a.id) === outForm.data.cash_account_id
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => outForm.setData('cash_account_id', String(a.id))}
                            className={cn(
                              'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                              isSelected
                                ? 'border-red-500 bg-red-500/15 text-red-900 dark:text-red-200 ring-2 ring-red-500/30 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                            )}
                          >
                            <span className={cn('size-2 rounded-full', isSelected ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700')} />
                            <span>{a.name}</span>
                            {isSelected && <Check className="size-3 text-red-600 stroke-[3]" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Kategori Pengeluaran
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {safeCategories.filter((c) => c.type === 'out').map((c) => {
                        const isSelected = String(c.id) === outForm.data.cash_category_id
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => outForm.setData('cash_category_id', String(c.id))}
                            className={cn(
                              'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                              isSelected
                                ? 'border-red-500 bg-red-500/15 text-red-900 dark:text-red-200 ring-2 ring-red-500/30'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                            )}
                          >
                            <span>{c.name}</span>
                            {isSelected && <Check className="size-3 text-red-600 stroke-[3]" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Nominal Keluar (Rp)
                    </Label>
                    <MoneyInput
                      value={outForm.data.amount}
                      onChange={(v) => outForm.setData('amount', v)}
                      className="h-12 rounded-xl text-lg font-bold"
                    />
                    {outForm.errors.amount && <p className="text-xs text-red-600 font-semibold">{outForm.errors.amount}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Keterangan Pengeluaran
                    </Label>
                    <Input
                      value={outForm.data.description}
                      onChange={(e) => outForm.setData('description', e.target.value)}
                      placeholder="Contoh: Alat tulis kantor, listrik..."
                      className="h-11 rounded-xl"
                    />
                    {outForm.errors.description && <p className="text-xs text-red-600 font-semibold">{outForm.errors.description}</p>}
                  </div>

                  <Button
                    type="submit"
                    disabled={outForm.processing}
                    className="h-11 gap-2 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-white shadow-md transition-all mt-2"
                  >
                    <CheckCircle2 className="size-4" />
                    <span>{outForm.processing ? 'Menyimpan…' : 'Catat Kas Keluar Sekarang'}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sub-Tab 4: Transfer / Drop */}
        <TabsContent value="transfer" className="mt-4">
          <Card className="w-full border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <ArrowLeftRight className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Transfer & Drop Cash Internal
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pemindahan uang antar kas (misal: Drop Cash dari Laci ke Brankas, atau Brankas ke Bank).
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <form onSubmit={submitTransfer} className="flex flex-col gap-5">
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                  <Info className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Catatan:</strong> Drop Cash (Laci → Brankas) dan Setoran Bank adalah pemindahan saldo internal, bukan beban pengeluaran toko.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Dari Akun Kas (Sumber)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {safeAccounts.map((a) => {
                        const isSelected = String(a.id) === transferForm.data.from_account_id
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => transferForm.setData('from_account_id', String(a.id))}
                            className={cn(
                              'group relative flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                              isSelected
                                ? 'border-blue-500 bg-blue-500/15 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                            )}
                          >
                            <span className={cn('size-2 rounded-full', isSelected ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700')} />
                            <span>{a.name}</span>
                            {isSelected && <Check className="size-3 text-blue-600 stroke-[3]" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Ke Akun Kas (Tujuan)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {safeAccounts.map((a) => {
                        const isSelected = String(a.id) === transferForm.data.to_account_id
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => transferForm.setData('to_account_id', String(a.id))}
                            className={cn(
                              'group relative flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                              isSelected
                                ? 'border-blue-500 bg-blue-500/15 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                            )}
                          >
                            <span className={cn('size-2 rounded-full', isSelected ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700')} />
                            <span>{a.name}</span>
                            {isSelected && <Check className="size-3 text-blue-600 stroke-[3]" />}
                          </button>
                        )
                      })}
                    </div>
                    {transferForm.errors.to_account_id && <p className="text-xs text-red-600 font-semibold">{transferForm.errors.to_account_id}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Nominal Transfer (Rp)
                  </Label>
                  <MoneyInput
                    value={transferForm.data.amount}
                    onChange={(v) => transferForm.setData('amount', v)}
                    className="h-12 rounded-xl text-lg font-bold"
                  />
                  {transferForm.errors.amount && <p className="text-xs text-red-600 font-semibold">{transferForm.errors.amount}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={transferForm.processing}
                  className="h-11 gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-md transition-all mt-1"
                >
                  <ArrowLeftRight className="size-4" />
                  <span>{transferForm.processing ? 'Memproses…' : 'Proses Transfer Sekarang'}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sub-Tab 5: Akun Kas */}
        <TabsContent value="akun-kas" className="mt-4 flex flex-col gap-4">
          <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Landmark className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      Daftar Akun Kas & Laci Kasir
                    </CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Kelola akun kas &amp; laci fisik per outlet. Laci yang sedang terpakai tidak bisa dinonaktifkan.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={openNewAccount}
                  className="gap-1.5 rounded-xl bg-amber-500 text-navy-950 hover:bg-amber-400 font-bold shadow-xs"
                >
                  <Plus className="size-4" />
                  <span>Tambah Akun Kas</span>
                </Button>
              </div>
              {selectedAccountIds.length > 0 && (
                <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 dark:bg-amber-500/15">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-navy-950">
                      {selectedAccountIds.length}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Akun Terpilih
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => handleBulkAccountAction('activate')}
                      className="gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs"
                    >
                      <Power className="size-3.5" />
                      <span>Aktifkan Terpilih</span>
                    </Button>

                    <Button
                      type="button"
                      size="xs"
                      onClick={() => handleBulkAccountAction('deactivate')}
                      className="gap-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-xs"
                    >
                      <Power className="size-3.5" />
                      <span>Nonaktifkan Terpilih</span>
                    </Button>

                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => setSelectedAccountIds([])}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-3.5 w-10 text-center">
                        <Checkbox
                          checked={allAccountsSelected}
                          onCheckedChange={toggleSelectAllAccounts}
                        />
                      </th>
                      <th className="py-3 px-3 text-center w-12">No</th>
                      <th className="py-3 px-4">Kode</th>
                      <th className="py-3 px-4">Nama Akun</th>
                      <th className="py-3 px-4">Outlet</th>
                      <th className="py-3 px-4">Tipe</th>
                      <th className="py-3 px-4">Laci Kasir?</th>
                      <th className="py-3 px-4 text-right">Saldo Saat Ini</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {safeAllAccounts.map((a, index) => {
                      const isSelected = selectedAccountIds.includes(a.id)
                      return (
                        <tr key={a.id} className={cn('hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors', isSelected && 'bg-amber-500/5 dark:bg-amber-500/10')}>
                          <td className="py-3 px-3.5 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectAccount(a.id)}
                            />
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-xs text-slate-500">{index + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{a.code}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              <span>{a.name}</span>
                              {a.is_default && (
                                <Badge variant="outline" className="text-[9px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">{a.outlet?.name ?? '—'}</td>
                          <td className="py-3 px-4 capitalize font-medium text-slate-700 dark:text-slate-300">{a.type}</td>
                          <td className="py-3 px-4">
                            {a.is_drawer ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold">
                                Ya (Laci)
                              </Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold">
                            <Money amount={a.current_balance} size="sm" />
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={cn('font-bold', a.is_active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-slate-500/15 text-slate-600 border-slate-500/30')}>
                              {a.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button size="xs" variant="outline" className="gap-1 rounded-lg" onClick={() => openEditAccount(a)}>
                                <Edit2 className="size-3.5" />
                                <span>Ubah</span>
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                className={cn('gap-1 rounded-lg', a.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50')}
                                onClick={() => toggleAccountActive(a)}
                              >
                                <Power className="size-3.5" />
                                <span>{a.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Dialog Form Tambah / Ubah Akun Kas */}
      <Dialog open={accountFormOpen} onOpenChange={setAccountFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Landmark className="size-5 text-amber-500" />
              <DialogTitle>{editingAccount ? `Ubah Akun Kas — ${editingAccount.name}` : 'Tambah Akun Kas Baru'}</DialogTitle>
            </div>
          </DialogHeader>
          <form onSubmit={submitAccount} className="flex flex-col gap-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Kode Akun
                </Label>
                <Input
                  value={accountForm.data.code}
                  onChange={(e) => accountForm.setData('code', e.target.value.toUpperCase())}
                  placeholder="KAS-1"
                  className="h-11 font-mono uppercase rounded-xl"
                />
                {accountForm.errors.code && <p className="text-xs text-red-600 font-semibold">{accountForm.errors.code}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nama Akun Kas
                </Label>
                <Input
                  value={accountForm.data.name}
                  onChange={(e) => accountForm.setData('name', e.target.value)}
                  placeholder="Kas Operasional"
                  className="h-11 rounded-xl"
                />
                {accountForm.errors.name && <p className="text-xs text-red-600 font-semibold">{accountForm.errors.name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Outlet
                </Label>
                <Select value={accountForm.data.outlet_id} onValueChange={(v) => accountForm.setData('outlet_id', v)}>
                  <SelectTrigger className="h-11 rounded-xl font-semibold">
                    <SelectValue placeholder="Pilih outlet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {safeOutlets.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tipe Akun
                </Label>
                <Select value={accountForm.data.type} onValueChange={(v) => accountForm.setData('type', v as 'cash' | 'bank' | 'ewallet')}>
                  <SelectTrigger className="h-11 rounded-xl font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai (Cash)</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="ewallet">E-Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!editingAccount && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saldo Awal Akun (Rp)
                </Label>
                <MoneyInput
                  value={accountForm.data.opening_balance}
                  onChange={(v) => accountForm.setData('opening_balance', v)}
                  className="h-11 rounded-xl text-base font-bold"
                />
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <span>Laci Fisik (Dipakai Sesi Kasir)</span>
                <Switch checked={accountForm.data.is_drawer} onCheckedChange={(v) => accountForm.setData('is_drawer', v)} />
              </label>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <span>Akun Default Outlet</span>
                <Switch checked={accountForm.data.is_default} onCheckedChange={(v) => accountForm.setData('is_default', v)} />
              </label>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <span>Status Aktif</span>
                <Switch checked={accountForm.data.is_active} onCheckedChange={(v) => accountForm.setData('is_active', v)} />
              </label>
            </div>
            {accountForm.errors.is_active && <p className="text-xs text-red-600 font-semibold">{accountForm.errors.is_active}</p>}

            <DialogFooter className="mt-2">
              <Button
                type="submit"
                disabled={accountForm.processing}
                className="h-11 gap-2 rounded-xl bg-amber-500 text-navy-950 hover:bg-amber-400 font-bold shadow-md w-full"
              >
                <CheckCircle2 className="size-4" />
                <span>{accountForm.processing ? 'Menyimpan…' : editingAccount ? 'Simpan Perubahan' : 'Buat Akun Kas Baru'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
