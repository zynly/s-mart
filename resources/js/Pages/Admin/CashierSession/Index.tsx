import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import axios from 'axios'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle, AlertTriangle, ArrowDownCircle, ArrowDownLeft, ArrowUpCircle,
  ArrowUpRight, Banknote, Check, CheckCircle2, ChevronDown, ChevronUp, Coins, CreditCard, DollarSign,
  Edit2, History, Info, Loader2, Lock, PlayCircle, Plus, PlusCircle, QrCode, Receipt, ShieldAlert,
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

type OpenSessionItem = {
  id: number
  reference: string
  user_id: number
  user_name: string
  drawer_name: string
  outlet_name: string
  opened_at: string
  opening_cash: number
  is_own: boolean
}

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
  user?: Ref
  outlet?: Ref
}

type SessionRow = {
  id: number
  reference: string
  user_name?: string
  drawer_name?: string
  opened_at: string
  closed_at: string | null
  opening_cash: number
  total_sales_cash?: number
  total_sales_deposit?: number
  total_sales_noncash?: number
  total_topup_cash?: number
  total_receivable_cash?: number
  total_cash_in?: number
  total_cash_out?: number
  expected_cash: number
  actual_cash: number | null
  difference: number | null
  status: string
}

type ActiveSaleRow = {
  id: number
  reference: string
  kasir_name?: string
  customer_name?: string
  sale_date: string
  payment_methods?: string[]
  subtotal?: number
  discount_amount?: number
  tax_amount?: number
  grand_total: number
  status: string
  voided_at: string | null
  notes?: string | null
}

type DetailSaleItem = {
  id: number
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  subtotal: number
}

type DetailSale = {
  id: number
  reference: string
  sale_date: string
  grand_total: number
  status: string
  items: DetailSaleItem[]
  payments: Array<{ method_name: string; amount: number }>
}

type SessionDetailData = {
  session: {
    id: number
    reference: string
    status: string
    user_name: string
    drawer_name: string
    outlet_name: string
    opened_at: string
    closed_at: string | null
    opening_cash: number
    total_sales_cash: number
    total_sales_noncash: number
    total_sales_deposit: number
    total_topup_cash: number
    total_receivable_cash: number
    total_cash_in: number
    total_cash_out: number
    expected_cash: number
    actual_cash: number | null
    difference: number | null
    difference_reason: string | null
    notes: string | null
  }
  sales: DetailSale[]
}

type CashierSessionIndexProps = {
  tab: string
  active: ActiveSession | null
  expected: number | null
  openSessions?: OpenSessionItem[]
  ownActiveSessionId?: number | null
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
  openSessions = [],
  ownActiveSessionId = null,
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
  const [showOpenNewSessionDialog, setShowOpenNewSessionDialog] = useState(false)

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
    {
      accessorKey: 'reference',
      header: 'Referensi',
      cell: ({ row }) => <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{row.original.reference}</span>,
    },
    { id: 'kasir', header: 'Kasir', cell: ({ row }) => <span className="font-semibold text-slate-800 dark:text-slate-200">{row.original.kasir_name ?? 'Kasir'}</span> },
    { id: 'customer', header: 'Pelanggan', cell: ({ row }) => <span className="text-slate-600 dark:text-slate-400 text-xs">{row.original.customer_name ?? 'Pelanggan Umum'}</span> },
    { id: 'date', header: 'Waktu', cell: ({ row }) => new Date(row.original.sale_date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) },
    {
      id: 'payments',
      header: 'Metode Pembayaran',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 flex-wrap">
          {row.original.payment_methods && row.original.payment_methods.length > 0 ? (
            row.original.payment_methods.map((method, idx) => (
              <Badge key={idx} variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                {method}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="bg-slate-100 text-slate-600 text-[10px]">
              Tunai
            </Badge>
          )}
        </div>
      ),
    },
    { id: 'subtotal', header: 'Subtotal', cell: ({ row }) => <Money amount={row.original.subtotal ?? row.original.grand_total} size="sm" /> },
    { id: 'diskon', header: 'Diskon', cell: ({ row }) => <Money amount={row.original.discount_amount ?? 0} size="sm" className="text-slate-500" /> },
    { id: 'total', header: 'Total Struk', cell: ({ row }) => <Money amount={row.original.grand_total} size="sm" className="font-bold text-slate-900 dark:text-white" /> },
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
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 font-bold text-xs px-2.5 rounded-lg"
            onClick={() => window.open(route('pos.sales.receipt-pdf', row.original.id), '_blank')}
          >
            <Receipt className="size-3.5 text-slate-500" />
            PDF Struk
          </Button>
          {row.original.status === 'completed' && (
            <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/50 font-bold text-xs px-2.5 rounded-lg" onClick={() => { setVoidTarget(row.original); setVoidReason('') }}>
              Void
            </Button>
          )}
        </div>
      ),
    },
  ]

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sessionDetail, setSessionDetail] = useState<SessionDetailData | null>(null)
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null)

  function handleViewSessionDetail(sessionId: number) {
    setDetailLoading(true)
    setDetailModalOpen(true)
    setSessionDetail(null)
    setExpandedSaleId(null)

    axios
      .get(route('admin.cashier-session.show', sessionId))
      .then((res) => {
        setSessionDetail(res.data)
      })
      .catch(() => {
        toast.error('Gagal mengambil detail transaksi sesi kasir.')
      })
      .finally(() => {
        setDetailLoading(false)
      })
  }

  const columns: ColumnDef<SessionRow, unknown>[] = [
    {
      accessorKey: 'reference',
      header: 'Referensi',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => handleViewSessionDetail(row.original.id)}
          className="font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline text-left cursor-pointer"
        >
          {row.original.reference}
        </button>
      ),
    },
    { id: 'kasir', header: 'Kasir', cell: ({ row }) => <span className="font-semibold text-slate-800 dark:text-slate-200">{row.original.user_name ?? 'Kasir'}</span> },
    { id: 'laci', header: 'Laci', cell: ({ row }) => <span className="text-slate-600 dark:text-slate-400 text-xs">{row.original.drawer_name ?? 'Laci Kasir'}</span> },
    { id: 'opened', header: 'Dibuka', cell: ({ row }) => new Date(row.original.opened_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) },
    { id: 'closed', header: 'Ditutup', cell: ({ row }) => (row.original.closed_at ? new Date(row.original.closed_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '—') },
    { id: 'opening', header: 'Kas Awal', cell: ({ row }) => <Money amount={row.original.opening_cash} size="sm" /> },
    { id: 'omzet_tunai', header: 'Tunai', cell: ({ row }) => <Money amount={row.original.total_sales_cash ?? 0} size="sm" className="text-emerald-600 dark:text-emerald-400 font-semibold" /> },
    { id: 'omzet_deposit', header: 'Deposit', cell: ({ row }) => <Money amount={row.original.total_sales_deposit ?? 0} size="sm" className="text-purple-600 dark:text-purple-400 font-semibold" /> },
    { id: 'omzet_nontunai', header: 'Non-Tunai', cell: ({ row }) => <Money amount={row.original.total_sales_noncash ?? 0} size="sm" className="text-blue-600 dark:text-blue-400 font-semibold" /> },
    { id: 'topup', header: 'Topup', cell: ({ row }) => <Money amount={row.original.total_topup_cash ?? 0} size="sm" className="text-cyan-600 dark:text-cyan-400" /> },
    { id: 'piutang', header: 'Piutang', cell: ({ row }) => <Money amount={row.original.total_receivable_cash ?? 0} size="sm" className="text-indigo-600 dark:text-indigo-400" /> },
    { id: 'kas_masuk', header: 'Kas Masuk', cell: ({ row }) => <Money amount={row.original.total_cash_in ?? 0} size="sm" className="text-teal-600 dark:text-teal-400" /> },
    { id: 'kas_keluar', header: 'Kas Keluar', cell: ({ row }) => <Money amount={row.original.total_cash_out ?? 0} size="sm" className="text-rose-600 dark:text-rose-400" /> },
    { id: 'expected', header: 'Expected', cell: ({ row }) => <Money amount={row.original.expected_cash} size="sm" className="font-bold text-amber-600 dark:text-amber-400" /> },
    { id: 'actual', header: 'Aktual', cell: ({ row }) => (row.original.actual_cash !== null ? <Money amount={row.original.actual_cash} size="sm" className="font-bold text-emerald-600 dark:text-emerald-400" /> : '—') },
    { id: 'diff', header: 'Selisih', cell: ({ row }) => (row.original.difference !== null ? <Money amount={row.original.difference} size="sm" showSign className="font-bold text-blue-600 dark:text-blue-400" /> : '—') },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS_BADGE[row.original.status] ?? ''}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 font-bold text-xs px-2.5 rounded-lg shrink-0"
          onClick={() => handleViewSessionDetail(row.original.id)}
        >
          <Receipt className="size-3.5 text-amber-500" />
          Detail Transaksi
        </Button>
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
                  const isDrawerOpen = Boolean(a.is_open)

                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "flex flex-col justify-between gap-4 rounded-2xl border bg-white p-4.5 shadow-xs dark:bg-surface/90 transition-all",
                        isDrawerOpen
                          ? "border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 opacity-90"
                          : "border-slate-200/90 dark:border-slate-800 hover:border-amber-500/40 hover:shadow-md"
                      )}
                    >
                      <div className="flex flex-col gap-3">
                        {/* Drawer Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                              isDrawerOpen ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            )}>
                              <Store className="size-5" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                                  {a.name}
                                </h4>
                                {a.is_default && (
                                  <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                                    Default
                                  </span>
                                )}
                                {isDrawerOpen ? (
                                  <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[10px] px-1.5 py-0">
                                    Terbuka: {a.is_own_open ? 'Anda' : (a.open_user_name ?? 'Kasir')}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                    Tersedia
                                  </Badge>
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
                            disabled={isDrawerOpen}
                            onChange={(v) => setOpeningCashMap((prev) => ({ ...prev, [a.id]: v }))}
                            className="h-11 rounded-xl text-base font-bold"
                          />
                        </div>
                      </div>

                      {/* Buka Sesi Button inside Card */}
                      <Button
                        type="button"
                        disabled={isOpeningThis || isDrawerOpen}
                        onClick={() => handleOpenSession(a.id)}
                        className={cn(
                          "h-11 w-full gap-2 rounded-xl font-bold shadow-xs transition-all mt-1",
                          isDrawerOpen
                            ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed"
                            : "bg-amber-500 text-navy-950 hover:bg-amber-400"
                        )}
                      >
                        <PlayCircle className="size-4.5 fill-current" />
                        <span>
                          {isOpeningThis
                            ? 'Memproses…'
                            : isDrawerOpen
                            ? `Terbuka oleh ${a.is_own_open ? 'Anda' : (a.open_user_name ?? 'Kasir')}`
                            : `Buka Sesi ${a.name} Sekarang`}
                        </span>
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
          {/* Sub-Tabs Sesi Kasir Aktif (High Contrast Redesigned Pill Bar) */}
          {openSessions && openSessions.length > 0 && (
            <div className="flex flex-col gap-3.5 bg-slate-900 text-white border border-amber-500/40 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500 text-navy-950 font-black shrink-0 shadow-xs">
                    <Store className="size-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Sesi Kasir Terbuka ({openSessions.length} Sesi Aktif)
                    </h4>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Pilih tab sesi untuk meninjau laci kasir, transaksi, atau melakukan penutupan sesi.
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="hidden md:flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-300">
                  <span className="relative flex size-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                  </span>
                  <span className="font-semibold text-[11px]">Realtime Multi-Drawer Active</span>
                </div>
              </div>

              {/* Horizontal Scrollable Tabs */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                {openSessions.map((s) => {
                  const isSelected = active?.id === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        router.get(
                          route('admin.cashier-session.index'),
                          { selected_session_id: s.id },
                          { preserveState: true, preserveScroll: true }
                        )
                      }}
                      className={cn(
                        "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-black transition-all shrink-0 cursor-pointer shadow-sm",
                        isSelected
                          ? "bg-amber-500 text-navy-950 border-amber-400 shadow-md ring-2 ring-amber-400/50 scale-[1.02]"
                          : "bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white"
                      )}
                    >
                      <span className="relative flex size-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                      </span>
                      <span className="font-mono text-xs tracking-tight">{s.reference}</span>
                      <span className={cn("text-[11px] truncate font-semibold", isSelected ? "text-navy-950 font-bold" : "text-slate-300")}>
                        {s.drawer_name} ({s.user_name})
                      </span>
                      {s.is_own && (
                        <span className={cn(
                          "text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                          isSelected ? "bg-navy-950 text-amber-400" : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                        )}>
                          Sesi Anda
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Tab Button "+ Buka Sesi Kasir Lain" — High Contrast Solid Button */}
                <button
                  type="button"
                  onClick={() => setShowOpenNewSessionDialog(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-400 text-amber-300 font-black text-xs transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
                >
                  <Plus className="size-4 text-amber-400 stroke-[3]" />
                  <span>+ Buka Sesi Kasir Lain</span>
                </button>
              </div>
            </div>
          )}

          {/* Hero Active Session Banner — Premium High-Contrast Card */}
          <Card className="overflow-hidden border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-surface">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400 border border-amber-500/30 shadow-xs">
                    <Coins className="size-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Sesi Aktif Terbuka
                      </Badge>
                      {active?.user && (
                        <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 text-xs font-bold px-2.5 py-0.5">
                          Kasir: {active.user.name}
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                      {active.reference}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap font-medium">
                      <span>Laci Kasir: <strong className="text-slate-800 dark:text-slate-200 font-bold">{active.cash_account.name}</strong></span>
                      <span>•</span>
                      <span>Dibuka: {new Date(active.opened_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                </div>

                {/* Expected Cash Highlight & POS Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col items-start sm:items-end rounded-2xl border border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60 px-5 py-3.5 shadow-2xs">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Expected Cash (Uang Diharapkan)
                    </span>
                    <Money amount={expected ?? 0} size="xl" className="text-emerald-700 dark:text-emerald-400 font-black text-2xl mt-0.5" />
                  </div>
                  <Button
                    onClick={() => router.visit(route('pos.index'))}
                    className="h-12 py-3 px-5 gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-black text-sm shadow-md transition-all active:scale-95 shrink-0"
                  >
                    <ShoppingBag className="size-5" />
                    <span>Buka Terminal POS</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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

      {/* Dialog Buka Sesi Kasir Baru (Untuk Membuka Multi Sesi di Laci Lain) */}
      <Dialog open={showOpenNewSessionDialog} onOpenChange={setShowOpenNewSessionDialog}>
        <DialogContent className="sm:max-w-[700px] border-slate-200 dark:border-slate-800 dark:bg-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Store className="size-5 text-amber-500" />
              Buka Sesi Kasir Baru (Laci Kasir Lain)
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih laci kasir yang belum aktif dan tentukan modal uang fisik awal untuk membuka sesi kasir tambahan.
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 max-h-[60vh] overflow-y-auto">
            {safeAccounts.map((a) => {
              const openingCash = openingCashMap[a.id] ?? 0
              const isOpeningThis = openingDrawerId === a.id
              const isDrawerOpen = Boolean(a.is_open)

              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex flex-col justify-between gap-3 rounded-2xl border p-4 shadow-xs transition-all",
                    isDrawerOpen
                      ? "border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 opacity-90"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-amber-500/40"
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {a.name}
                      </h4>
                      {isDrawerOpen ? (
                        <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[10px]">
                          Terbuka: {a.is_own_open ? 'Anda' : (a.open_user_name ?? 'Kasir')}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                          Tersedia
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Modal Fisik Awal (Rp)
                      </Label>
                      <MoneyInput
                        value={openingCash}
                        disabled={isDrawerOpen}
                        onChange={(v) => setOpeningCashMap((prev) => ({ ...prev, [a.id]: v }))}
                        className="h-10 text-sm font-bold"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={isOpeningThis || isDrawerOpen}
                    onClick={() => {
                      handleOpenSession(a.id)
                      setShowOpenNewSessionDialog(false)
                    }}
                    className={cn(
                      "h-10 w-full gap-2 rounded-xl font-bold text-xs shadow-xs transition-all mt-1",
                      isDrawerOpen
                        ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed"
                        : "bg-amber-500 text-navy-950 hover:bg-amber-400"
                    )}
                  >
                    <PlayCircle className="size-4 fill-current" />
                    <span>
                      {isOpeningThis
                        ? 'Memproses…'
                        : isDrawerOpen
                        ? `Terbuka oleh ${a.is_own_open ? 'Anda' : (a.open_user_name ?? 'Kasir')}`
                        : `Buka Sesi ${a.name}`}
                    </span>
                  </Button>
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenNewSessionDialog(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detail Transaksi & Item Barang Sesi Kasir */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[850px] border-slate-200 dark:border-slate-800 dark:bg-surface max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Receipt className="size-5 text-amber-500" />
              Audit & Detail Transaksi Sesi — {sessionDetail?.session.reference ?? 'Memuat...'}
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rincian ringkasan kas, daftar nota penjualan, dan item barang yang dibeli pada sesi kasir ini.
            </p>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="size-8 animate-spin text-amber-500" />
              <span className="text-xs text-slate-500 font-bold">Mengambil data audit transaksi & item barang…</span>
            </div>
          ) : sessionDetail ? (
            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              {/* Header Info Sesi */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 font-medium text-[11px]">Kasir Sesi:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{sessionDetail.session.user_name}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium text-[11px]">Laci Kasir:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{sessionDetail.session.drawer_name}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium text-[11px]">Waktu Buka Sesi:</span>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                    {new Date(sessionDetail.session.opened_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium text-[11px]">Waktu Tutup Sesi:</span>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                    {sessionDetail.session.closed_at ? new Date(sessionDetail.session.closed_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '🔴 Sesi Masih Aktif'}
                  </div>
                </div>
              </div>

              {/* Rincian Kas Summary Grid Komplit (Audit Keuangan Sesi) */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rincian Komplit Arus Kas Sesi Kasir:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {/* Row 1: Modal Awal & Penjualan */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Modal Awal Kas</span>
                    <Money amount={sessionDetail.session.opening_cash} size="sm" className="font-extrabold text-slate-900 dark:text-white mt-1" />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Penjualan Tunai</span>
                    <Money amount={sessionDetail.session.total_sales_cash} size="sm" className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-1" />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Penjualan Deposit Santri</span>
                    <Money amount={sessionDetail.session.total_sales_deposit} size="sm" className="font-extrabold text-purple-600 dark:text-purple-400 mt-1" />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Penjualan Non-Tunai</span>
                    <Money amount={sessionDetail.session.total_sales_noncash} size="sm" className="font-extrabold text-blue-600 dark:text-blue-400 mt-1" />
                  </div>

                  {/* Row 2: Topup, Piutang, Kas Masuk/Keluar */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Topup Tunai</span>
                    <Money amount={sessionDetail.session.total_topup_cash} size="sm" className="font-extrabold text-cyan-600 dark:text-cyan-400 mt-1" />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pelunasan Piutang</span>
                    <Money amount={sessionDetail.session.total_receivable_cash} size="sm" className="font-extrabold text-indigo-600 dark:text-indigo-400 mt-1" />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kas Masuk Ops</span>
                    <Money amount={sessionDetail.session.total_cash_in} size="sm" className="font-extrabold text-teal-600 dark:text-teal-400 mt-1" />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kas Keluar Ops</span>
                    <Money amount={sessionDetail.session.total_cash_out} size="sm" className="font-extrabold text-rose-600 dark:text-rose-400 mt-1" />
                  </div>

                  {/* Row 3: Expected, Actual, Diff, Status */}
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col">
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider">Uang Expected</span>
                    <Money amount={sessionDetail.session.expected_cash} size="sm" className="font-black text-amber-700 dark:text-amber-400 mt-1" />
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider">Uang Fisik (Aktual)</span>
                    <Money amount={sessionDetail.session.actual_cash ?? 0} size="sm" className="font-black text-emerald-700 dark:text-emerald-400 mt-1" />
                  </div>
                  <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col">
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">Selisih Kas</span>
                    {sessionDetail.session.difference !== null ? (
                      <Money amount={sessionDetail.session.difference} size="sm" showSign className="font-black text-blue-700 dark:text-blue-400 mt-1" />
                    ) : (
                      <span className="text-slate-400 mt-1 font-bold">—</span>
                    )}
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Sesi</span>
                    <div className="mt-1">
                      <Badge variant="outline" className={STATUS_BADGE[sessionDetail.session.status] ?? ''}>
                        {STATUS_LABELS[sessionDetail.session.status] ?? sessionDetail.session.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Optional Catatan Selisih */}
                {sessionDetail.session.difference_reason && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                    <strong>Catatan Selisih:</strong> {sessionDetail.session.difference_reason}
                  </div>
                )}
              </div>

              {/* Daftar Nota Penjualan */}
              <div className="space-y-3 mt-1">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt className="size-4 text-amber-500" />
                    <span>Daftar Nota Penjualan ({sessionDetail.sales.length} Nota)</span>
                  </h4>
                  <Badge variant="outline" className="font-mono text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                    {sessionDetail.sales.length} Transaksi
                  </Badge>
                </div>

                {sessionDetail.sales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3">
                      <Receipt className="size-6" />
                    </div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Belum Ada Nota Penjualan</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                      Sesi kasir ini belum memiliki riwayat transaksi nota penjualan (0 Nota). Sesi baru dibuka atau belum ada transaksi kasir yang diselesaikan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sessionDetail.sales.map((sale) => {
                      const isExpanded = expandedSaleId === sale.id
                      return (
                        <div key={sale.id} className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs">
                          <div className="p-3 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40 text-xs">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                                className="flex items-center gap-1.5 font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                                <span>{sale.reference}</span>
                              </button>
                              <span className="text-slate-400 font-medium hidden sm:inline">
                                {new Date(sale.sale_date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <div className="flex items-center gap-1 flex-wrap">
                                {sale.payments && sale.payments.length > 0 ? (
                                  sale.payments.map((p, idx) => (
                                    <Badge key={idx} variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                                      {p.method_name}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline" className="bg-slate-100 text-slate-600 text-[10px]">
                                    Tunai
                                  </Badge>
                                )}
                              </div>
                              <Money amount={sale.grand_total} size="sm" className="font-bold" />
                              <Badge variant="outline" className={SALE_STATUS_BADGE[sale.status] ?? ''}>
                                {SALE_STATUS_LABELS[sale.status] ?? sale.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1 px-2 border-slate-200 dark:border-slate-700"
                                onClick={() => window.open(route('pos.sales.receipt-pdf', sale.id), '_blank')}
                              >
                                <Receipt className="size-3" />
                                <span>PDF</span>
                              </Button>
                            </div>
                          </div>

                          {/* Detail Barang yang Dibeli */}
                          {isExpanded && (
                            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/90 text-xs space-y-2">
                              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rincian Barang yang Dibeli ({sale.items.length} Item):</div>
                              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {sale.items.map((item) => (
                                  <div key={item.id} className="py-1.5 flex items-center justify-between text-xs">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-slate-900 dark:text-white">{item.product_name}</span>
                                      <span className="text-[10px] font-mono text-slate-400">SKU: {item.product_sku}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-right">
                                      <span className="text-slate-500">{item.quantity} x {formatMoney(item.unit_price)}</span>
                                      <strong className="font-bold text-slate-900 dark:text-white">{formatMoney(item.subtotal)}</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
