import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle, AlertTriangle, ArrowDownCircle, ArrowDownLeft, ArrowUpCircle,
  ArrowUpRight, Banknote, Check, CheckCircle2, Coins, CreditCard, DollarSign,
  Edit2, History, Info, Lock, PlayCircle, Plus, PlusCircle, QrCode, Receipt, ShieldAlert,
  ShoppingBag, Store, UserCheck, Wallet, XCircle,
} from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { SupervisorPinDialog } from '@/Components/common/SupervisorPinDialog'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import type { PageProps, Paginated } from '@/Types'
import { cn } from '@/Lib/utils'
import { formatMoney } from '@/Lib/money'

type DrawerAccount = {
  id: number
  name: string
  code: string
  current_balance: number
  is_default: boolean
  outlet_id: number
}

type Ref = { id: number; name: string }

type ActiveSession = {
  id: number
  reference: string
  opened_at: string
  opening_cash: number
  total_sales_cash: number
  total_sales_deposit: number
  total_sales_noncash: number
  total_topup_cash: number
  total_receivable_cash: number
  total_cash_in: number
  total_cash_out: number
  total_drop: number
  total_refund_cash: number
  cash_account: Ref
}

type SessionRow = {
  id: number
  reference: string
  opened_at: string
  closed_at: string | null
  opening_cash: number
  expected_cash: number
  actual_cash: number | null
  difference: number | null
  status: string
}

type ActiveSaleRow = {
  id: number
  reference: string
  sale_date: string
  grand_total: number
  status: string
  voided_at: string | null
}

type CashierSessionIndexProps = {
  tab: string
  active: ActiveSession | null
  expected: number | null
  cashAccounts: DrawerAccount[]
  outlets: Ref[]
  activeSales: ActiveSaleRow[]
  recentSessions: SessionRow[] | Paginated<SessionRow>
}

const STATUS_LABELS: Record<string, string> = { open: 'Terbuka', closed: 'Ditutup', force_closed: 'Ditutup Paksa' }
const STATUS_BADGE: Record<string, string> = {
  open: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  closed: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  force_closed: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
}

const SALE_STATUS_LABELS: Record<string, string> = { completed: 'Selesai', void: 'Dibatalkan' }
const SALE_STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  void: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
}

const emptyDrawerForm = {
  code: '',
  name: '',
  type: 'cash' as const,
  outlet_id: '',
  opening_balance: 0,
  is_drawer: true,
  is_active: true,
  is_default: false,
}

export default function Index({
  tab = 'cashier-session',
  active = null,
  expected = null,
  cashAccounts = [],
  outlets = [],
  activeSales = [],
  recentSessions = [],
}: CashierSessionIndexProps) {
  const safeAccounts = Array.isArray(cashAccounts) ? cashAccounts : []
  const safeOutlets = Array.isArray(outlets) ? outlets : []
  const safeSales = Array.isArray(activeSales) ? activeSales : []
  const safeSessions = Array.isArray(recentSessions) ? recentSessions : (recentSessions?.data ?? [])

  const [pinOpen, setPinOpen] = useState(false)
  const [openingCashMap, setOpeningCashMap] = useState<Record<number, number>>({})
  const [openingDrawerId, setOpeningDrawerId] = useState<number | null>(null)

  function handleOpenSession(drawerId: number) {
    const cashAmount = openingCashMap[drawerId] ?? 0
    setOpeningDrawerId(drawerId)

    router.post(
      route('admin.cashier-session.open'),
      { cash_account_id: String(drawerId), opening_cash: cashAmount },
      {
        preserveScroll: true,
        onFinish: () => setOpeningDrawerId(null),
      },
    )
  }
  const closeForm = useForm({ actual_cash: 0, reason: '', approval_token: null as string | null })

  /* State for CRUD Drawer modal */
  const [drawerModalOpen, setDrawerModalOpen] = useState(false)
  const [editingDrawer, setEditingDrawer] = useState<DrawerAccount | null>(null)
  const drawerForm = useForm(emptyDrawerForm)

  function handleOpenNewDrawer() {
    setEditingDrawer(null)
    drawerForm.setData({
      ...emptyDrawerForm,
      code: `LACI-${safeAccounts.length + 1}`,
      name: `Laci Kasir ${safeAccounts.length + 1}`,
      outlet_id: safeOutlets[0] ? String(safeOutlets[0].id) : '',
    })
    drawerForm.clearErrors()
    setDrawerModalOpen(true)
  }

  function handleEditDrawer(drawer: DrawerAccount, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingDrawer(drawer)
    drawerForm.setData({
      code: drawer.code ?? '',
      name: drawer.name ?? '',
      type: 'cash',
      outlet_id: drawer.outlet_id ? String(drawer.outlet_id) : (safeOutlets[0] ? String(safeOutlets[0].id) : ''),
      opening_balance: 0,
      is_drawer: true,
      is_active: true,
      is_default: drawer.is_default ?? false,
    })
    drawerForm.clearErrors()
    setDrawerModalOpen(true)
  }

  const submitDrawerForm: FormEventHandler = (e) => {
    e.preventDefault()
    const opts = {
      preserveScroll: true,
      onSuccess: () => setDrawerModalOpen(false),
    }

    if (editingDrawer) {
      drawerForm.put(route('admin.cash-accounts.update', editingDrawer.id), opts)
    } else {
      drawerForm.post(route('admin.cash-accounts.store'), opts)
    }
  }

  const [voidTarget, setVoidTarget] = useState<ActiveSaleRow | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidPinOpen, setVoidPinOpen] = useState(false)
  const [voiding, setVoiding] = useState(false)

  function submitVoid(approvalToken: string) {
    if (!voidTarget) return

    setVoiding(true)

    router.put(
      route('pos.sales.void', voidTarget.id),
      { reason: voidReason, approval_token: approvalToken },
      {
        preserveScroll: true,
        onSuccess: () => {
          setVoidTarget(null)
          setVoidReason('')
        },
        onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal membatalkan nota.'),
        onFinish: () => setVoiding(false),
      },
    )
  }

  function confirmVoidReason() {
    if (!voidTarget || voidReason.trim().length < 5) return
    setVoidPinOpen(true)
  }

  const difference = active ? closeForm.data.actual_cash - (expected ?? 0) : 0
  const toleranceAmount = Math.round(Math.abs(expected ?? 0) * 0.005)
  const needsApproval = Math.abs(difference) > toleranceAmount

  function doSubmitClose(approvalToken: string | null) {
    if (!active) return

    closeForm.transform((data) => ({ ...data, approval_token: approvalToken }))
    closeForm.put(route('admin.cashier-session.close', active.id), { preserveScroll: true })
  }

  const submitClose: FormEventHandler = (e) => {
    e.preventDefault()

    if (needsApproval && !closeForm.data.approval_token) {
      setPinOpen(true)
      return
    }

    doSubmitClose(closeForm.data.approval_token)
  }

  const sessions = Array.isArray(recentSessions) ? recentSessions : recentSessions.data

  const saleColumns: ColumnDef<ActiveSaleRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'date', header: 'Waktu', cell: ({ row }) => new Date(row.original.sale_date).toLocaleString('id-ID') },
    { id: 'total', header: 'Total', cell: ({ row }) => <Money amount={row.original.grand_total} size="sm" /> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className={SALE_STATUS_BADGE[row.original.status] ?? ''}>
          {SALE_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        row.original.status === 'completed' ? (
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/50" onClick={() => { setVoidTarget(row.original); setVoidReason('') }}>
            Void
          </Button>
        ) : null
      ),
    },
  ]

  const columns: ColumnDef<SessionRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'opened', header: 'Dibuka', cell: ({ row }) => new Date(row.original.opened_at).toLocaleString('id-ID') },
    { id: 'expected', header: 'Expected', cell: ({ row }) => <Money amount={row.original.expected_cash} size="sm" /> },
    { id: 'actual', header: 'Aktual', cell: ({ row }) => (row.original.actual_cash !== null ? <Money amount={row.original.actual_cash} size="sm" /> : '—') },
    { id: 'diff', header: 'Selisih', cell: ({ row }) => (row.original.difference !== null ? <Money amount={row.original.difference} size="sm" showSign /> : '—') },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS_BADGE[row.original.status] ?? ''}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PageHeader title="Sesi Kasir" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Sesi Kasir' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'cashier-session', label: 'Sesi Kasir', href: route('admin.cashier-session.index'), permission: 'pos.view' },
        { key: 'cash', label: 'Kas', href: route('admin.cash.index'), permission: 'cash.view' },
      ]} />

      {!active ? (
        /* Card Buka Sesi Kasir jika Tidak Ada Sesi Aktif (Full Width Container, Compact 3-Grid) */
        <Card className="w-full border-slate-200/80 shadow-sm dark:border-slate-800 dark:bg-surface">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Store className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Buka Sesi Kasir Baru
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih laci kasir aktif & masukkan modal uang fisik awal untuk memulai transaksi.
                  </p>
                </div>
              </div>

              {/* Quick Button to Add New Drawer */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenNewDrawer}
                className="gap-1.5 rounded-xl border-amber-500/30 text-xs font-bold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
              >
                <Plus className="size-3.5" />
                <span>Tambah Laci Kasir</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Laci Kasir ({safeAccounts.length} Laci Tersedia)
                </Label>
                <span className="text-[11px] text-slate-400">Setiap laci memiliki input modal fisik & tombol buka sesi tersendiri</span>
              </div>

              {/* Grid Layout — Each drawer card has its OWN MoneyInput and Buka Sesi button */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {safeAccounts.map((a) => {
                  const openingCash = openingCashMap[a.id] ?? 0
                  const isOpeningThis = openingDrawerId === a.id

                  return (
                    <div
                      key={a.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-surface/90 hover:border-amber-500/40 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col gap-3">
                        {/* Drawer Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              <Store className="size-5" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                                  {a.name}
                                </h4>
                                {a.is_default && (
                                  <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                                    Default
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-medium">
                                Kode: <span className="font-mono font-semibold">{a.code}</span>
                              </span>
                            </div>
                          </div>

                          {/* Edit Drawer Button */}
                          <button
                            type="button"
                            onClick={(e) => handleEditDrawer(a, e)}
                            className="size-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="Edit Laci Kasir"
                          >
                            <Edit2 className="size-4" />
                          </button>
                        </div>

                        {/* Current Cash Balance Badge */}
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Saldo Kas saat ini:</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatMoney(a.current_balance ?? 0)}
                          </strong>
                        </div>

                        {/* Modal Fisik Input for this Drawer */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Modal Fisik Awal {a.name} (Rp)
                          </Label>
                          <MoneyInput
                            value={openingCash}
                            onChange={(v) => setOpeningCashMap((prev) => ({ ...prev, [a.id]: v }))}
                            className="h-11 rounded-xl text-base font-bold"
                          />
                        </div>
                      </div>

                      {/* Buka Sesi Button inside Card */}
                      <Button
                        type="button"
                        disabled={isOpeningThis}
                        onClick={() => handleOpenSession(a.id)}
                        className="h-11 w-full gap-2 rounded-xl bg-amber-500 text-navy-950 hover:bg-amber-400 font-bold shadow-xs transition-all mt-1"
                      >
                        <PlayCircle className="size-4.5 fill-current" />
                        <span>{isOpeningThis ? 'Memproses…' : `Buka Sesi ${a.name} Sekarang`}</span>
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Dashboard Sesi Kasir Aktif */
        <div className="flex flex-col gap-5 sm:gap-6">
          {/* Hero Active Session Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-surface dark:bg-surface-alt p-6 text-content shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-md shrink-0">
                  <Coins className="size-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider uppercase text-amber-400">
                      Sesi Aktif
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      Terbuka
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-content mt-1">
                    {active.reference}
                  </h2>
                  <p className="text-xs text-content-muted mt-1">
                    Laci: <strong className="text-content font-bold">{active.cash_account.name}</strong> · Dibuka sejak {new Date(active.opened_at).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Expected Cash Highlight Badge & POS Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex flex-col items-start sm:items-end rounded-2xl border border-amber-400/50 bg-surface-alt dark:bg-surface px-5 py-3.5 shadow-md">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                    Expected Cash (Uang Diharapkan)
                  </span>
                  <Money amount={expected ?? 0} size="xl" className="text-amber-400 font-black text-2xl mt-0.5" />
                </div>
                <Button
                  onClick={() => router.visit(route('pos.index'))}
                  className="h-full py-4.5 px-5 gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-black text-sm shadow-md transition-all active:scale-95"
                >
                  <ShoppingBag className="size-5" />
                  <span>Buka Terminal POS</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Detailed Cash Breakdown Card */}
            <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-surface">
              <CardHeader className="border-b border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-400">
                    <Receipt className="size-4.5" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Rincian Transaksi Sesi Kas
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {[
                    ['Modal Awal', active.opening_cash, Wallet, 'text-slate-600'],
                    ['Penjualan Tunai', active.total_sales_cash, Coins, 'text-emerald-600'],
                    ['Penjualan Saldo Santri', active.total_sales_deposit, CreditCard, 'text-blue-600'],
                    ['Penjualan Non-tunai', active.total_sales_noncash, QrCode, 'text-purple-600'],
                    ['Top-Up Tunai', active.total_topup_cash, PlusCircle, 'text-emerald-600'],
                    ['Pelunasan Piutang Tunai', active.total_receivable_cash, Banknote, 'text-emerald-600'],
                    ['Kas Masuk', active.total_cash_in, ArrowDownCircle, 'text-emerald-600'],
                    ['Kas Keluar', -active.total_cash_out, ArrowUpCircle, 'text-red-500'],
                    ['Drop Cash', -active.total_drop, ArrowUpRight, 'text-red-500'],
                    ['Refund Tunai', -active.total_refund_cash, ArrowUpRight, 'text-red-500'],
                  ].map(([label, value, IconComponent, colorClass]) => {
                    const Icon = IconComponent as typeof Wallet
                    return (
                      <div key={label as string} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Icon className={cn('size-4', colorClass as string)} />
                          <span className="font-medium">{label as string}</span>
                        </div>
                        <Money amount={value as number} size="sm" className="font-bold" />
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-amber-800 dark:text-amber-300">
                  <span className="font-bold text-xs uppercase tracking-wider">Total Cash Diharapkan</span>
                  <Money amount={expected ?? 0} size="lg" className="font-black text-amber-700 dark:text-amber-300" />
                </div>
              </CardContent>
            </Card>

            {/* Closing Form Card */}
            <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-surface">
              <CardHeader className="border-b border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:bg-red-400/20 dark:text-red-400">
                    <Lock className="size-4.5" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Tutup Sesi Kasir
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <form onSubmit={submitClose} className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Uang Fisik Dihitung di Laci (Rp)
                    </Label>
                    <MoneyInput
                      value={closeForm.data.actual_cash}
                      onChange={(v) => closeForm.setData('actual_cash', v)}
                      className="h-12 rounded-xl text-lg font-bold"
                    />
                    {closeForm.errors.actual_cash && <p className="text-xs text-red-600 font-semibold">{closeForm.errors.actual_cash}</p>}
                  </div>

                  {/* Selisih Indicator Box */}
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all',
                      difference === 0
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : difference < 0
                          ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
                    )}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                      Selisih Kas (Fisik − Expected)
                    </p>
                    <Money amount={difference} size="xl" showSign className="font-black mt-1" />
                    <p className="text-[11px] font-semibold mt-1">
                      {difference === 0
                        ? 'Uang fisik pas & sesuai dengan catatan sistem.'
                        : difference < 0
                          ? 'Uang fisik kurang dari catatan sistem.'
                          : 'Uang fisik lebih dari catatan sistem.'}
                    </p>
                  </div>

                  {needsApproval && (
                    <div className="space-y-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <ShieldAlert className="size-4 shrink-0" />
                        <Label className="text-xs font-bold uppercase tracking-wider">
                          Alasan Selisih Kas (Wajib Min. 5 Karakter)
                        </Label>
                      </div>
                      <Textarea
                        value={closeForm.data.reason}
                        onChange={(e) => closeForm.setData('reason', e.target.value)}
                        placeholder="Jelaskan penyebab selisih kas fisik..."
                        className="rounded-xl border-amber-500/30 bg-white/80 dark:bg-surface/80"
                      />
                      {closeForm.data.approval_token ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="size-4" />
                          <span>Disetujui oleh Supervisor.</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          Selisih melebihi toleransi (Rp {toleranceAmount.toLocaleString('id-ID')}) — memerlukan otorisasi PIN supervisor saat penutupan.
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={closeForm.processing || (needsApproval && !closeForm.data.reason)}
                    className="h-12 gap-2 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white shadow-md transition-all mt-2"
                  >
                    <Lock className="size-4" />
                    {closeForm.processing ? 'Menutup Sesi…' : 'Tutup Sesi Kasir Sekarang'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Nota Sesi Ini Table */}
      {active && (
        <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-surface">
          <CardHeader className="border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="size-4.5 text-slate-500" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Nota Penjualan Sesi Ini
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <DataTable columns={saleColumns} data={safeSales} getRowId={(row) => String(row.id)} emptyDescription="Belum ada nota penjualan pada sesi ini." />
          </CardContent>
        </Card>
      )}

      {/* Riwayat Sesi Table */}
      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-surface">
        <CardHeader className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="size-4.5 text-slate-500" />
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Riwayat Sesi Kasir S-Mart
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <DataTable columns={columns} data={safeSessions} getRowId={(row) => String(row.id)} emptyDescription="Belum ada riwayat sesi kasir." />
        </CardContent>
      </Card>

      {/* Modal CRUD Tambah / Edit Laci Kasir */}
      <Dialog open={drawerModalOpen} onOpenChange={setDrawerModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Store className="size-5 text-amber-500" />
              <DialogTitle>{editingDrawer ? `Ubah Laci Kasir — ${editingDrawer.name}` : 'Tambah Laci Kasir Baru'}</DialogTitle>
            </div>
          </DialogHeader>
          <form onSubmit={submitDrawerForm} className="flex flex-col gap-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Kode Laci
                </Label>
                <Input
                  value={drawerForm.data.code}
                  onChange={(e) => drawerForm.setData('code', e.target.value.toUpperCase())}
                  placeholder="Contoh: LACI-4"
                  className="h-11 font-mono uppercase rounded-xl"
                />
                {drawerForm.errors.code && <p className="text-xs text-red-600 font-semibold">{drawerForm.errors.code}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nama Laci
                </Label>
                <Input
                  value={drawerForm.data.name}
                  onChange={(e) => drawerForm.setData('name', e.target.value)}
                  placeholder="Contoh: Laci Kasir 4"
                  className="h-11 rounded-xl"
                />
                {drawerForm.errors.name && <p className="text-xs text-red-600 font-semibold">{drawerForm.errors.name}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Outlet Sekolah
              </Label>
              <Select value={drawerForm.data.outlet_id} onValueChange={(v) => drawerForm.setData('outlet_id', v)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 font-semibold dark:border-slate-800">
                  <SelectValue placeholder="Pilih outlet..." />
                </SelectTrigger>
                <SelectContent>
                  {safeOutlets.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editingDrawer && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saldo Awal Laci (Rp)
                </Label>
                <MoneyInput
                  value={drawerForm.data.opening_balance}
                  onChange={(v) => drawerForm.setData('opening_balance', v)}
                  className="h-11 rounded-xl text-base font-bold"
                />
              </div>
            )}

            <DialogFooter className="mt-2">
              <Button
                type="submit"
                disabled={drawerForm.processing}
                className="h-11 gap-2 rounded-xl bg-amber-500 text-navy-950 hover:bg-amber-400 font-bold shadow-md w-full"
              >
                <CheckCircle2 className="size-4" />
                {drawerForm.processing ? 'Menyimpan…' : editingDrawer ? 'Simpan Perubahan Laci' : 'Buat Laci Kasir Baru'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SupervisorPinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        permission="pos.approve"
        title="Otorisasi Selisih Kas"
        description="Selisih melebihi batas toleransi — masukkan PIN supervisor."
        onApproved={(token) => {
          closeForm.setData('approval_token', token)
          setPinOpen(false)
          doSubmitClose(token)
        }}
      />

      <Dialog open={voidTarget !== null} onOpenChange={(open) => !open && setVoidTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Nota — {voidTarget?.reference}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Alasan Pembatalan (wajib, min. 5 karakter)</Label>
              <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
            </div>
            <p className="text-xs text-content-muted">Pembatalan nota memerlukan otorisasi PIN supervisor.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>Batal</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={confirmVoidReason} disabled={voidReason.trim().length < 5 || voiding}>
              Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupervisorPinDialog
        open={voidPinOpen}
        onOpenChange={setVoidPinOpen}
        permission="sale.void"
        title="Otorisasi Void Nota"
        description="Masukkan PIN supervisor untuk membatalkan nota ini."
        onApproved={(token) => {
          setVoidPinOpen(false)
          submitVoid(token)
        }}
      />
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
