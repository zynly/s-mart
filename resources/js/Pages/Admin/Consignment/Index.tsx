import { useState, type FormEventHandler, type ReactElement } from 'react'
import { Head, Link, router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { AppSheet } from '@/Components/common/AppSheet'
import { formatDate } from '@/Lib/date'
import type { Paginated } from '@/Types'
import {
  Wallet,
  TrendingUp,
  Package,
  Clock,
  Eye,
  Printer,
  Undo2,
  AlertCircle,
  FileCheck2,
  Boxes,
  Loader2,
  Plus,
  PackagePlus,
  Tag,
  Building2,
  Store,
  Calendar,
  CalendarRange,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Percent,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'

type Ref = { id: number; name: string; code?: string; phone?: string }
type CashAccountRef = { id: number; name: string; type: string; current_balance: number; outlet_id: number }

export type ConsignmentProduct = {
  id: number
  name: string
  sku: string
  unit_id: number
  unit_symbol: string
  is_expirable: boolean
  consignment_percent: number
  selling_price: number
  consignment_price: number
}

type SettlementRow = {
  id: number
  reference: string
  period_start: string
  period_end: string
  total_sold: number
  commission_percent: string
  commission_amount: number
  payable_amount: number
  status: 'draft' | 'approved' | 'paid'
  supplier: Ref
  outlet: Ref
  cash_account?: Ref | null
}

type StockLayerRow = {
  id: number
  batch_no: string | null
  expired_at: string | null
  qty_remaining: string
  qty_in: string
  unit_cost: number
  received_at: string
  supplier: Ref
  outlet: Ref
  product: {
    id: number
    name: string
    sku: string
    base_unit?: { id: number; symbol: string; name: string }
  }
}

type PreviewItem = {
  product_id: number
  product_name: string
  sku: string
  unit: string
  remaining_stock: number
  qty_sold: number
  unit_price: number
  total_price: number
  commission: number
  payable: number
  selling_price?: number
  consignment_price?: number
  commission_per_unit?: number
}

type PreviewResponse = {
  overlapping: boolean
  total_sold: number
  commission_amount: number
  payable_amount: number
  items: PreviewItem[]
}

type ConsignmentSummary = {
  unpaid_payable: number
  month_commission: number
  pending_count: number
  active_consignors_count: number
  active_stock_qty: number
}

type ConsignmentIndexProps = {
  tab: string
  settlements: Paginated<SettlementRow>
  consignmentStocks: Paginated<StockLayerRow>
  consignmentProducts: ConsignmentProduct[]
  summary: ConsignmentSummary
  suppliers: Ref[]
  outlets: Ref[]
  cashAccounts: CashAccountRef[]
}

const STATUS_LABELS: Record<string, string> = { draft: 'Draft', approved: 'Disetujui', paid: 'Lunas' }
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-500 text-white',
  approved: 'bg-blue-600 text-white',
  paid: 'bg-emerald-600 text-white',
}

export default function Index({
  tab,
  settlements,
  consignmentStocks,
  consignmentProducts = [],
  summary,
  suppliers,
  outlets,
  cashAccounts,
}: ConsignmentIndexProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState('settlements')

  // Preview & calculation state
  const [calculating, setCalculating] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Payment dialog state
  const [payTarget, setPayTarget] = useState<SettlementRow | null>(null)
  const payForm = useForm({
    cash_account_id: cashAccounts[0] ? String(cashAccounts[0].id) : '',
  })

  // Return dialog state
  const [returnTarget, setReturnTarget] = useState<StockLayerRow | null>(null)
  const returnForm = useForm({
    stock_layer_id: '',
    qty: '',
    reason: 'Kedaluwarsa / Rusak',
  })

  // Inbound Consignment Receive Form state
  const [receiveOpen, setReceiveOpen] = useState(false)
  const receiveForm = useForm({
    supplier_id: suppliers[0] ? String(suppliers[0].id) : '',
    outlet_id: outlets[0] ? String(outlets[0].id) : '',
    product_id: consignmentProducts[0] ? String(consignmentProducts[0].id) : '',
    qty: '',
    consignment_price: consignmentProducts[0] ? String(consignmentProducts[0].consignment_price) : '',
    selling_price: consignmentProducts[0] ? String(consignmentProducts[0].selling_price) : '',
    batch_no: '',
    expired_at: '',
  })
  const selectedReceiveProduct = consignmentProducts.find((p) => String(p.id) === receiveForm.data.product_id)

  const submitReceive: FormEventHandler = (e) => {
    e.preventDefault()
    receiveForm.post(route('admin.consignment.receive'), {
      preserveScroll: true,
      onSuccess: () => {
        setReceiveOpen(false)
        receiveForm.reset()
      },
    })
  }

  // Settlement create form
  const form = useForm({
    supplier_id: suppliers[0] ? String(suppliers[0].id) : '',
    outlet_id: outlets[0] ? String(outlets[0].id) : '',
    product_id: '',
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    commission_percent: 20,
  })

  const [activeDatePreset, setActiveDatePreset] = useState<'this_month' | 'last_month' | 'last_7_days' | 'custom'>('this_month')
  const [noProductDialogOpen, setNoProductDialogOpen] = useState(false)
  const [emptyResultDialogOpen, setEmptyResultDialogOpen] = useState(false)

  const selectedSupplier = suppliers.find((s) => String(s.id) === form.data.supplier_id)
  const selectedProduct = consignmentProducts.find((p) => String(p.id) === form.data.product_id)

  // Date Presets
  function applyDatePreset(preset: 'this_month' | 'last_month' | 'last_7_days') {
    setActiveDatePreset(preset)
    const today = new Date()
    let start = new Date()
    let end = new Date()

    if (preset === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = today
    } else if (preset === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      end = new Date(today.getFullYear(), today.getMonth(), 0)
    } else if (preset === 'last_7_days') {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      end = today
    }

    form.setData({
      ...form.data,
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
    })
    setPreviewData(null)
  }

  // Handle Calculate / Preview
  async function handlePreview() {
    if (!form.data.supplier_id || !form.data.outlet_id) {
      setPreviewError('Harap pilih supplier dan outlet terlebih dahulu.')
      return
    }

    setCalculating(true)
    setPreviewError(null)

    try {
      const response = await fetch(route('admin.consignment.preview'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
        },
        body: JSON.stringify({
          supplier_id: form.data.supplier_id,
          outlet_id: form.data.outlet_id,
          product_id: form.data.product_id ? Number(form.data.product_id) : null,
          period_start: form.data.period_start,
          period_end: form.data.period_end,
          commission_percent: form.data.commission_percent,
        }),
      })

      if (!response.ok) {
        const errJson = await response.json()
        throw new Error(errJson.message || 'Gagal menghitung rekonsiliasi.')
      }

      const data: PreviewResponse = await response.json()
      setPreviewData(data)
      if (data.items.length === 0) {
        setEmptyResultDialogOpen(true)
      }
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menghitung rekonsiliasi.')
      setPreviewData(null)
    } finally {
      setCalculating(false)
    }
  }

  const submitSettlement: FormEventHandler = (e) => {
    e.preventDefault()
    form.post(route('admin.consignment.store'), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setPreviewData(null)
        setSheetOpen(false)
      },
    })
  }

  const handleOpenPayDialog = (row: SettlementRow) => {
    setPayTarget(row)
    const matchedAccount = cashAccounts.find((a) => a.outlet_id === row.outlet.id)
    payForm.setData('cash_account_id', matchedAccount ? String(matchedAccount.id) : (cashAccounts[0] ? String(cashAccounts[0].id) : ''))
  }

  const submitPay: FormEventHandler = (e) => {
    e.preventDefault()
    if (!payTarget) return

    payForm.put(route('admin.consignment.mark-paid', payTarget.id), {
      preserveScroll: true,
      onSuccess: () => {
        setPayTarget(null)
      },
    })
  }

  const handleOpenReturnDialog = (layer: StockLayerRow) => {
    setReturnTarget(layer)
    returnForm.setData({
      stock_layer_id: String(layer.id),
      qty: String(layer.qty_remaining),
      reason: 'Kedaluwarsa / Rusak',
    })
  }

  const submitReturn: FormEventHandler = (e) => {
    e.preventDefault()
    returnForm.post(route('admin.consignment.return'), {
      preserveScroll: true,
      onSuccess: () => {
        setReturnTarget(null)
        returnForm.reset()
      },
    })
  }

  // Settlement Table Columns
  const settlementColumns: ColumnDef<SettlementRow, unknown>[] = [
    {
      accessorKey: 'reference',
      header: 'No. Referensi',
      cell: ({ row }) => (
        <Link
          href={route('admin.consignment.show', row.original.id)}
          className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
        >
          {row.original.reference}
        </Link>
      ),
    },
    { id: 'supplier', header: 'Supplier', cell: ({ row }) => <span className="font-medium text-xs">{row.original.supplier.name}</span> },
    {
      id: 'period',
      header: 'Periode Penjualan',
      cell: ({ row }) => (
        <span className="text-xs text-content-muted">
          {formatDate(row.original.period_start)} – {formatDate(row.original.period_end)}
        </span>
      ),
    },
    { id: 'sold', header: 'Total Terjual', cell: ({ row }) => <Money amount={row.original.total_sold} size="sm" /> },
    {
      id: 'commission',
      header: 'Komisi Mart',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Money amount={row.original.commission_amount} size="sm" />
          <span className="text-[10px] text-content-muted">({row.original.commission_percent}%)</span>
        </div>
      ),
    },
    {
      id: 'payable',
      header: 'Hak Bersih Supplier',
      cell: ({ row }) => (
        <span className="font-bold text-xs text-navy-950 dark:text-white">
          <Money amount={row.original.payable_amount} size="sm" />
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={STATUS_BADGE[row.original.status] ?? ''}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" variant="ghost" className="h-8 px-2 text-content-muted hover:text-content" asChild>
              <Link href={route('admin.consignment.show', row.original.id)}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-content-muted hover:text-content"
              onClick={() => window.open(route('admin.consignment.export-pdf', row.original.id), '_blank')}
            >
              <Printer className="h-4 w-4" />
            </Button>

            {row.original.status === 'draft' && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                onClick={() => router.put(route('admin.consignment.approve', row.original.id), {}, { preserveScroll: true })}
              >
                Setujui
              </Button>
            )}

            {row.original.status === 'approved' && (
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleOpenPayDialog(row.original)}
              >
                Bayar
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  // Consignment Stocks Table Columns
  const stockColumns: ColumnDef<StockLayerRow, unknown>[] = [
    {
      id: 'product',
      header: 'Produk Titipan',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-navy-950 dark:text-white">{row.original.product.name}</span>
          <span className="text-[11px] font-mono text-content-muted">SKU: {row.original.product.sku}</span>
        </div>
      ),
    },
    { id: 'supplier', header: 'Pemilik / Supplier', cell: ({ row }) => <span className="text-xs font-medium">{row.original.supplier.name}</span> },
    {
      id: 'stock',
      header: 'Sisa Stok di Toko',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
            {Number(row.original.qty_remaining)}
          </span>
          <span className="text-[11px] text-content-muted">
            {row.original.product.base_unit?.symbol ?? 'pcs'}
          </span>
        </div>
      ),
    },
    {
      id: 'batch',
      header: 'Batch & Masuk',
      cell: ({ row }) => (
        <div className="flex flex-col text-[11px] text-content-muted">
          <span>Batch: {row.original.batch_no || '—'}</span>
          <span>Masuk: {formatDate(row.original.received_at)}</span>
        </div>
      ),
    },
    {
      id: 'expired',
      header: 'Kedaluwarsa',
      cell: ({ row }) => {
        if (!row.original.expired_at) return <span className="text-xs text-content-muted">—</span>
        const isExpiringSoon = new Date(row.original.expired_at).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
        return (
          <span className={`text-xs ${isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-content-muted'}`}>
            {formatDate(row.original.expired_at)}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-300"
          onClick={() => handleOpenReturnDialog(row.original)}
        >
          <Undo2 className="mr-1 h-3.5 w-3.5" /> Retur ke Pemasok
        </Button>
      ),
    },
  ]

  const selectedPayAccount = cashAccounts.find((a) => String(a.id) === payForm.data.cash_account_id)
  const isPayInsufficient = payTarget && selectedPayAccount ? selectedPayAccount.current_balance < payTarget.payable_amount : false

  return (
    <div className="flex flex-col gap-5">
      <Head title="Konsinyasi & Barang Titipan" />

      <PageHeader
        title="Konsinyasi"
        subtitle="Kelola penerimaan barang titipan, perhitungan bagi hasil berkala, dan pelunasan hak pemasok"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Konsinyasi' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReceiveOpen(true)
              }}
              className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs shadow-2xs"
            >
              <PackagePlus className="mr-1.5 h-4 w-4 text-blue-600" /> Terima Barang Titipan
            </Button>
            <Button
              onClick={() => {
                setSheetOpen(true)
                setPreviewData(null)
                setPreviewError(null)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Buat Settlement Baru
            </Button>
          </div>
        }
      />

      <PageTabs
        current={tab}
        tabs={[
          { key: 'purchase-orders', label: 'Purchase Order', href: route('admin.purchase-orders.index'), permission: 'purchase_order.view' },
          { key: 'purchases', label: 'Pembelian', href: route('admin.purchases.index'), permission: 'purchase.view' },
          { key: 'consignment', label: 'Konsinyasi', href: route('admin.consignment.index'), permission: 'consignment.view' },
        ]}
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-content-muted font-medium">Utang Belum Lunas</span>
              <span className="text-lg font-bold text-navy-950 dark:text-white mt-1">
                <Money amount={summary.unpaid_payable} />
              </span>
              <span className="text-[10px] text-content-muted">Hak supplier menunggu bayar</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-content-muted font-medium">Komisi Mart Bulan Ini</span>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">
                <Money amount={summary.month_commission} />
              </span>
              <span className="text-[10px] text-content-muted">Pendapatan bagi hasil toko</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-content-muted font-medium">Perlu Ditindaklanjuti</span>
              <span className="text-lg font-bold text-navy-950 dark:text-white mt-1">
                {summary.pending_count} Dokumen
              </span>
              <span className="text-[10px] text-content-muted">Status draft & disetujui</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-content-muted font-medium">Stok Barang Titipan</span>
              <span className="text-lg font-bold text-navy-950 dark:text-white mt-1">
                {Math.round(summary.active_stock_qty)} Pcs
              </span>
              <span className="text-[10px] text-content-muted">{summary.active_consignors_count} Mitra konsinyor</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
              <Boxes className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs for Settlements vs Stocks */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-auto inline-flex">
          <TabsTrigger value="settlements" className="flex items-center gap-1.5 text-xs">
            <FileCheck2 className="h-3.5 w-3.5" /> Dokumen Settlement ({settlements.total})
          </TabsTrigger>
          <TabsTrigger value="stocks" className="flex items-center gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" /> Stok Barang Titipan di Rak ({consignmentStocks.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settlements" className="mt-4">
          <DataTable
            columns={settlementColumns}
            data={settlements.data}
            getRowId={(row) => String(row.id)}
            emptyDescription="Belum ada settlement konsinyasi yang tercatat."
          />
        </TabsContent>

        <TabsContent value="stocks" className="mt-4">
          <DataTable
            columns={stockColumns}
            data={consignmentStocks.data}
            getRowId={(row) => String(row.id)}
            emptyDescription="Tidak ada stok barang titipan konsinyasi aktif di rak toko saat ini."
          />
        </TabsContent>
      </Tabs>

      {/* Create Settlement Sheet (High-End 2-Column Workstation Layout) */}
      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Buat Settlement Konsinyasi"
        description="Pilih mitra konsinyor dan tentukan periode untuk menghitung bagi hasil penjualan barang titipan secara otomatis."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSheetOpen(false)
                setPreviewData(null)
              }}
            >
              Tutup
            </Button>

            <div className="flex items-center gap-2">
              {previewData ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={calculating}
                    className="text-xs"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Hitung Ulang
                  </Button>
                  <Button
                    type="submit"
                    form="consignment-form"
                    disabled={form.processing || previewData.overlapping || previewData.items.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4"
                  >
                    Simpan Settlement (Draft)
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={handlePreview}
                  disabled={calculating || !form.data.supplier_id}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 shadow-xs"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghitung...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-1.5 h-4 w-4" /> Tinjau Penjualan & Hitung
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Parameters */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/70">
                <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy-950 dark:text-white uppercase tracking-wider">
                    Parameter Rekonsiliasi
                  </h4>
                  <p className="text-[11px] text-content-muted">Tentukan mitra dan rentang waktu</p>
                </div>
              </div>

              <form id="consignment-form" onSubmit={submitSettlement} className="space-y-4">
                {/* Supplier */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" /> Pemasok / Mitra Konsinyor
                  </Label>
                  <Select
                    value={form.data.supplier_id}
                    onValueChange={(v) => {
                      form.setData('supplier_id', v)
                      setPreviewData(null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih pemasok konsinyasi" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSupplier && (
                    <div className="text-[11px] text-content-muted flex items-center gap-2 px-2 py-1 rounded bg-surface-muted/60">
                      <span>Kode: <strong className="text-content">{selectedSupplier.code || '-'}</strong></span>
                      {selectedSupplier.phone && <span>· Telp: <strong className="text-content">{selectedSupplier.phone}</strong></span>}
                    </div>
                  )}
                  {form.errors.supplier_id && <p className="text-xs text-danger">{form.errors.supplier_id}</p>}
                </div>

                {/* Outlet */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-blue-600" /> Outlet Mart
                  </Label>
                  <Select
                    value={form.data.outlet_id}
                    onValueChange={(v) => {
                      form.setData('outlet_id', v)
                      setPreviewData(null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Produk Konsinyasi (Filter dari database produk bertanda is_consignment) */}
                <div className="space-y-1.5 pt-3 border-t border-border/80">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-navy-950 dark:text-white flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-blue-600" /> Pilih Produk Konsinyasi
                    </Label>
                    <button
                      type="button"
                      onClick={() => setNoProductDialogOpen(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Produk tidak ada?
                    </button>
                  </div>

                  {consignmentProducts.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50/90 border-2 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-xs flex flex-col gap-2.5 shadow-2xs">
                      <div className="flex items-start gap-2.5 text-amber-950 dark:text-amber-200">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-xs">Database Produk Konsinyasi Kosong</span>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                            Belum ada produk yang dicentang sebagai "Barang Titipan (Konsinyasi)" di master produk.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setNoProductDialogOpen(true)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 font-bold shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <AlertCircle className="h-3.5 w-3.5" /> Buka Popup Panduan Produk Gak Ada
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={form.data.product_id || 'all'}
                        onValueChange={(v) => {
                          if (v === '__not_found__') {
                            setNoProductDialogOpen(true)
                            return
                          }
                          const nextId = v === 'all' ? '' : v
                          form.setData('product_id', nextId)
                          if (nextId) {
                            const matched = consignmentProducts.find((p) => String(p.id) === nextId)
                            if (matched && matched.consignment_percent > 0) {
                              form.setData((prev) => ({ ...prev, product_id: nextId, commission_percent: matched.consignment_percent }))
                            }
                          }
                          setPreviewData(null)
                        }}
                      >
                        <SelectTrigger className="w-full font-medium">
                          <SelectValue placeholder="Semua produk titipan (Default)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <span className="font-bold text-blue-700 dark:text-blue-400">
                              Semua Produk Titipan Supplier (Default)
                            </span>
                          </SelectItem>
                          {consignmentProducts.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                          <div className="my-1 border-t border-dashed border-border" />
                          <SelectItem value="__not_found__">
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs py-0.5">
                              <HelpCircle className="h-3.5 w-3.5" />
                              Produk titipan yang dicari tidak ada? (Buka Panduan)
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Pricing Breakdown Card for Selected Product */}
                      {selectedProduct ? (
                        <div className="p-2.5 rounded-xl border border-blue-200/80 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-800/60 space-y-2 mt-2">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-navy-950 dark:text-white">
                            <span className="truncate">{selectedProduct.name}</span>
                            <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0">Barang Titipan</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-surface border border-border/60">
                              <span className="text-[10px] text-content-muted block">Harga Titipan (Setor Supplier)</span>
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                Rp {selectedProduct.consignment_price.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-surface border border-border/60">
                              <span className="text-[10px] text-content-muted block">Harga Dijual (Kasir POS)</span>
                              <span className="text-xs font-bold text-navy-950 dark:text-white">
                                Rp {selectedProduct.selling_price.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] text-blue-800 dark:text-blue-300 flex items-center justify-between px-0.5">
                            <span>Bagi Hasil Toko ({selectedProduct.consignment_percent}%):</span>
                            <span className="font-bold">
                              Rp {(selectedProduct.selling_price - selectedProduct.consignment_price).toLocaleString('id-ID')} / {selectedProduct.unit_symbol}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-1 text-[10px] text-content-muted">
                          <span>Default: Rekonsiliasi seluruh produk titipan pemasok ini.</span>
                          <button
                            type="button"
                            onClick={() => setNoProductDialogOpen(true)}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            Produk tidak ada?
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ── SECTION PEMISAH: PERIODE PENJUALAN DENGAN TAB & PEMISAH JELAS ── */}
                <div className="my-2 border-t-2 border-border/80" />

                <div className="rounded-xl border-2 border-blue-200/90 dark:border-blue-900/70 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-blue-200/80 dark:border-blue-900/60">
                    <Label className="text-xs font-bold text-navy-950 dark:text-white flex items-center gap-1.5">
                      <CalendarRange className="h-4 w-4 text-blue-600" /> Periode Penjualan
                    </Label>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-700">
                      {activeDatePreset !== 'custom'
                        ? `Preset: ${activeDatePreset === 'this_month' ? 'Bulan Ini' : activeDatePreset === 'last_month' ? 'Bulan Lalu' : '7 Hari Lalu'}`
                        : 'Rentang Kustom'}
                    </span>
                  </div>

                  {/* Pilihan Cepat / Preset Tabs with CLEAR EXPLICIT DIVIDERS */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-content-muted uppercase tracking-wider">
                        Tab Pilihan Cepat:
                      </span>
                      <span className="text-[10px] text-blue-600 font-medium">Klik tab untuk otomatis isi tanggal</span>
                    </div>

                    {/* Tab bar with visible border separators between tabs */}
                    <div className="grid grid-cols-3 rounded-xl border-2 border-blue-300 dark:border-blue-800 bg-white dark:bg-surface divide-x-2 divide-blue-300 dark:divide-blue-800 overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => applyDatePreset('this_month')}
                        className={`py-2 px-1 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                          activeDatePreset === 'this_month'
                            ? 'bg-blue-600 text-white shadow-inner'
                            : 'text-content hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Bulan Ini</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('last_month')}
                        className={`py-2 px-1 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                          activeDatePreset === 'last_month'
                            ? 'bg-blue-600 text-white shadow-inner'
                            : 'text-content hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>Bulan Lalu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('last_7_days')}
                        className={`py-2 px-1 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                          activeDatePreset === 'last_7_days'
                            ? 'bg-blue-600 text-white shadow-inner'
                            : 'text-content hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                      >
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                        <span>7 Hari Lalu</span>
                      </button>
                    </div>
                  </div>

                  {/* Explicit Divider between Tabs and Date Range Inputs */}
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-dashed border-blue-300/80 dark:border-blue-800" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-surface px-3 py-0.5 rounded-full border-2 border-blue-300 dark:border-blue-800 text-[10px] font-bold text-blue-900 dark:text-blue-300 shadow-2xs">
                        ── ATAU ATUR RENTANG TANGGAL MANUAL ──
                      </span>
                    </div>
                  </div>

                  {/* Manual Date Inputs with CLEAR 's/d' DIVIDER */}
                  <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center">
                    <div className="sm:col-span-5 space-y-1">
                      <span className="text-[10px] font-bold text-content-muted flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-blue-600" /> Mulai Dari (Awal)
                      </span>
                      <Input
                        type="date"
                        value={form.data.period_start}
                        onChange={(e) => {
                          form.setData('period_start', e.target.value)
                          setActiveDatePreset('custom')
                          setPreviewData(null)
                        }}
                        className="text-xs h-9 bg-white dark:bg-surface font-mono font-medium border-2 border-blue-200/90 dark:border-blue-900 focus:border-blue-500"
                      />
                    </div>

                    {/* Prominent Separator Badge between Dates */}
                    <div className="sm:col-span-1 flex items-center justify-center py-1 sm:py-0">
                      <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white border border-blue-500 text-[10px] font-black shadow-xs tracking-wider">
                        s / d
                      </span>
                    </div>

                    <div className="sm:col-span-5 space-y-1">
                      <span className="text-[10px] font-bold text-content-muted flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-blue-600" /> Sampai Dengan (Akhir)
                      </span>
                      <Input
                        type="date"
                        value={form.data.period_end}
                        onChange={(e) => {
                          form.setData('period_end', e.target.value)
                          setActiveDatePreset('custom')
                          setPreviewData(null)
                        }}
                        className="text-xs h-9 bg-white dark:bg-surface font-mono font-medium border-2 border-blue-200/90 dark:border-blue-900 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="my-2 border-t-2 border-border/80" />

                {/* Commission Percent */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5 text-blue-600" /> Komisi Mart (%)
                    </Label>
                    <span className="text-[10px] text-content-muted">Bagi hasil toko</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={form.data.commission_percent}
                        onChange={(e) => {
                          form.setData('commission_percent', Number(e.target.value))
                          setPreviewData(null)
                        }}
                        className="text-xs h-9 pr-7"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-semibold text-content-muted">%</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[10, 15, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            form.setData('commission_percent', pct)
                            setPreviewData(null)
                          }}
                          className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                            form.data.commission_percent === pct
                              ? 'bg-blue-600 text-white border-blue-600 font-bold'
                              : 'bg-surface border-border text-content-muted hover:text-content'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-content-muted leading-relaxed">
                    Diterapkan jika produk konsinyasi tidak memiliki persentase khusus per item.
                  </p>
                </div>
              </form>

              {/* Action Button on Left Column */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handlePreview}
                  disabled={calculating || !form.data.supplier_id}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 shadow-xs"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sedang Menghitung...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-1.5 h-4 w-4" /> Tinjau Penjualan & Hitung
                    </>
                  )}
                </Button>
              </div>

              {previewError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{previewError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Calculation & Preview Workstation */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {!previewData && !calculating && (
              <div className="min-h-[380px] flex flex-col items-center justify-center text-center p-8 rounded-xl border-2 border-dashed border-border bg-surface-muted/30">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
                  <Calculator className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-navy-950 dark:text-white">
                  Siap Menghitung Rekonsiliasi
                </h4>
                <p className="text-xs text-content-muted max-w-sm mt-1 leading-relaxed">
                  Pilih mitra konsinyor dan rentang tanggal di samping, lalu klik tombol <strong>"Tinjau Penjualan & Hitung"</strong> untuk memuat data transaksi penjualan kasir secara otomatis.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-2 text-left max-w-xs w-full text-xs text-content-muted">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface border border-border/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Membaca harga jual riil dari nota kasir</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface border border-border/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Perhitungan komisi mart otomatis</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface border border-border/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Cek sisa stok barang titipan di rak</span>
                  </div>
                </div>
              </div>
            )}

            {calculating && (
              <div className="min-h-[380px] flex flex-col items-center justify-center text-center p-8 rounded-xl border border-border bg-surface">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <h4 className="text-sm font-semibold text-navy-950 dark:text-white">
                  Sedang Mengolah Data Transaksi...
                </h4>
                <p className="text-xs text-content-muted mt-1">
                  Menghitung konsumsi stok barang konsinyasi pada nota penjualan
                </p>
              </div>
            )}

            {previewData && (
              <div className="flex flex-col gap-4">
                {/* Overlap Warning */}
                {previewData.overlapping && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Peringatan Periode Tumpang Tindih:</span> Sudah terdapat dokumen settlement lain untuk supplier dan outlet ini pada rentang tanggal tersebut. Harap sesuaikan tanggal sebelum menyimpan.
                    </div>
                  </div>
                )}

                {/* KPI Result Strip */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border border-border bg-surface p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-semibold text-content-muted">Total Omzet Kotor</span>
                    <div className="text-sm font-bold text-navy-950 dark:text-white mt-1">
                      <Money amount={previewData.total_sold} size="sm" />
                    </div>
                    <span className="text-[10px] text-content-muted mt-0.5">Penjualan di kasir</span>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20 p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-semibold text-blue-800 dark:text-blue-300">
                      Komisi Mart ({form.data.commission_percent}%)
                    </span>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-1">
                      <Money amount={previewData.commission_amount} size="sm" />
                    </div>
                    <span className="text-[10px] text-blue-600/80 dark:text-blue-300/70 mt-0.5">Pendapatan toko</span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300">
                      Bersih Hak Supplier
                    </span>
                    <div className="text-sm font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      <Money amount={previewData.payable_amount} size="sm" />
                    </div>
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-300/70 mt-0.5">Wajib disetor</span>
                  </div>
                </div>

                {/* Items Preview Table */}
                <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-surface-muted/70 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-950 dark:text-white">
                      Rincian Barang yang Terjual ({previewData.items.length} Produk)
                    </span>
                    <span className="text-[11px] text-content-muted">
                      Snapshot harga riil kasir
                    </span>
                  </div>

                  {previewData.items.length === 0 ? (
                    <div className="p-8 text-center text-content-muted text-xs">
                      Tidak ada barang konsinyasi dari pemasok ini yang terjual pada rentang tanggal tersebut.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-muted/40 text-content-muted sticky top-0 border-b border-border/80">
                          <tr>
                            <th className="py-2 px-3 font-semibold">Produk</th>
                            <th className="py-2 px-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">Harga Titipan</th>
                            <th className="py-2 px-2 text-right font-semibold">Harga Dijual</th>
                            <th className="py-2 px-2 text-center font-semibold">Laku</th>
                            <th className="py-2 px-2 text-right font-semibold text-blue-700 dark:text-blue-300">Komisi Toko</th>
                            <th className="py-2 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-300">Hak Pemasok</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {previewData.items.map((it) => (
                            <tr key={it.product_id} className="hover:bg-surface-muted/30">
                              <td className="py-2 px-3">
                                <div className="font-semibold text-navy-950 dark:text-white">{it.product_name}</div>
                                <div className="text-[10px] text-content-muted font-mono">
                                  SKU: {it.sku} · Sisa rak: <strong className="text-blue-700 dark:text-blue-400">{it.remaining_stock}</strong> {it.unit}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                                <Money amount={it.consignment_price ?? (it.qty_sold > 0 ? Math.round(it.payable / it.qty_sold) : 0)} size="sm" />
                              </td>
                              <td className="py-2 px-2 text-right text-content">
                                <Money amount={it.selling_price ?? it.unit_price} size="sm" />
                              </td>
                              <td className="py-2 px-2 text-center font-bold">
                                {it.qty_sold} <span className="text-[10px] font-normal text-content-muted">{it.unit}</span>
                              </td>
                              <td className="py-2 px-2 text-right text-blue-700 dark:text-blue-300 font-medium">
                                <Money amount={it.commission} size="sm" />
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-300">
                                <Money amount={it.payable} size="sm" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppSheet>

      {/* Pay Dialog */}
      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pelunasan Settlement Konsinyasi</DialogTitle>
            <DialogDescription>
              Bayarkan hak penjualan barang titipan kepada pemasok{' '}
              <span className="font-bold text-content">{payTarget?.supplier.name}</span> sebesar{' '}
              <span className="font-bold text-emerald-600">
                <Money amount={payTarget?.payable_amount ?? 0} />
              </span>.
            </DialogDescription>
          </DialogHeader>

          <form id="quick-pay-form" onSubmit={submitPay} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Pilih Akun Kas / Bank Sumber Pembayaran</Label>
              <Select
                value={payForm.data.cash_account_id}
                onValueChange={(v) => payForm.setData('cash_account_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun kas" />
                </SelectTrigger>
                <SelectContent>
                  {cashAccounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name} (Saldo: Rp {Number(account.current_balance).toLocaleString('id-ID')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPayAccount && payTarget && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  isPayInsufficient
                    ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
                    : 'bg-surface-muted border-border'
                }`}
              >
                <div className="flex justify-between">
                  <span>Saldo Kas Terpilih:</span>
                  <span className="font-bold">Rp {Number(selectedPayAccount.current_balance).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Hak Pemasok:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    Rp {Number(payTarget.payable_amount).toLocaleString('id-ID')}
                  </span>
                </div>
                {isPayInsufficient && (
                  <p className="mt-2 text-rose-600 dark:text-rose-400 font-semibold">
                    Peringatan: Saldo kas terpilih tidak mencukupi untuk melakukan pembayaran!
                  </p>
                )}
              </div>
            )}
          </form>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPayTarget(null)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="quick-pay-form"
              disabled={payForm.processing || isPayInsufficient}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Konfirmasi & Lunasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={!!returnTarget} onOpenChange={(open) => !open && setReturnTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retur Barang Titipan ke Pemasok</DialogTitle>
            <DialogDescription>
              Kembalikan barang titipan yang tidak laku atau mendekati kedaluwarsa kepada pemasok{' '}
              <span className="font-bold text-content">{returnTarget?.supplier.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <form id="return-form" onSubmit={submitReturn} className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-surface-muted border border-border text-xs space-y-1">
              <div className="font-semibold text-navy-950 dark:text-white">{returnTarget?.product.name}</div>
              <div className="text-content-muted">
                Sisa stok pada batch ini:{' '}
                <span className="font-bold text-blue-700 dark:text-blue-400">
                  {Number(returnTarget?.qty_remaining ?? 0)} {returnTarget?.product.base_unit?.symbol ?? 'pcs'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Qty yang Dikembalikan</Label>
              <Input
                type="number"
                min="0.001"
                max={Number(returnTarget?.qty_remaining ?? 0)}
                step="any"
                value={returnForm.data.qty}
                onChange={(e) => returnForm.setData('qty', e.target.value)}
              />
              {returnForm.errors.qty && <p className="text-xs text-danger">{returnForm.errors.qty}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Alasan Pengembalian</Label>
              <Select
                value={returnForm.data.reason}
                onValueChange={(v) => returnForm.setData('reason', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih alasan retur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kedaluwarsa / Rusak">Kedaluwarsa / Rusak</SelectItem>
                  <SelectItem value="Ditarik Pemilik / Tidak Laku">Ditarik Pemilik / Tidak Laku</SelectItem>
                  <SelectItem value="Tukar Varian / Produk Baru">Tukar Varian / Produk Baru</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setReturnTarget(null)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="return-form"
              disabled={returnForm.processing || !returnForm.data.qty}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Proses Retur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inbound Receive Consignment Goods Sheet (Slide-over from Right) */}
      <AppSheet
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        title="Penerimaan Barang Titipan (Konsinyasi)"
        description="Catat stok barang titipan yang masuk dari mitra konsinyor ke toko. Stok bertambah tanpa mencatat utang dagang maupun aset mart."
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button type="button" variant="outline" onClick={() => setReceiveOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="receive-consignment-form"
              disabled={receiveForm.processing || !receiveForm.data.product_id || !receiveForm.data.qty}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 font-semibold shadow-xs"
            >
              {receiveForm.processing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Simpan Penerimaan Stok
                </>
              )}
            </Button>
          </div>
        }
      >
        <form id="receive-consignment-form" onSubmit={submitReceive} className="space-y-4 py-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-600" /> Pemasok / Konsinyor
              </Label>
              <Select
                value={receiveForm.data.supplier_id}
                onValueChange={(v) => receiveForm.setData('supplier_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pemasok" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {receiveForm.errors.supplier_id && (
                <p className="text-xs text-danger">{receiveForm.errors.supplier_id}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-blue-600" /> Outlet Mart
              </Label>
              <Select
                value={receiveForm.data.outlet_id}
                onValueChange={(v) => receiveForm.setData('outlet_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {receiveForm.errors.outlet_id && (
                <p className="text-xs text-danger">{receiveForm.errors.outlet_id}</p>
              )}
            </div>
          </div>

          {/* Produk Konsinyasi */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-blue-600" /> Pilih Produk Konsinyasi
              </Label>
              <button
                type="button"
                onClick={() => setNoProductDialogOpen(true)}
                className="text-[10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium"
              >
                <HelpCircle className="h-3 w-3" /> Produk tidak ada?
              </button>
            </div>
            <Select
              value={receiveForm.data.product_id}
              onValueChange={(v) => {
                if (v === '__not_found__') {
                  setNoProductDialogOpen(true)
                  return
                }
                const matched = consignmentProducts.find((p) => String(p.id) === v)
                receiveForm.setData({
                  ...receiveForm.data,
                  product_id: v,
                  consignment_price: matched ? String(matched.consignment_price) : '',
                  selling_price: matched ? String(matched.selling_price) : '',
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih produk titipan" />
              </SelectTrigger>
              <SelectContent>
                {consignmentProducts.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
                <div className="my-1 border-t border-dashed border-border" />
                <SelectItem value="__not_found__">
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs py-0.5">
                    <HelpCircle className="h-3.5 w-3.5" />
                    Produk titipan yang dicari tidak ada? (Buka Panduan)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {receiveForm.errors.product_id && (
              <p className="text-xs text-danger">{receiveForm.errors.product_id}</p>
            )}
          </div>

          {/* Dua Macam Harga: Harga Titipan & Harga Dijual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/50">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Harga Titipan (Rp) *
              </Label>
              <Input
                type="number"
                min={0}
                step={100}
                placeholder="Setoran hak pemasok"
                value={receiveForm.data.consignment_price}
                onChange={(e) => receiveForm.setData('consignment_price', e.target.value)}
                className="h-8 text-xs font-semibold bg-white dark:bg-surface"
              />
              <span className="text-[10px] text-content-muted block">
                Nominal disetor ke supplier jika terjual
              </span>
              {receiveForm.errors.consignment_price && (
                <p className="text-xs text-danger">{receiveForm.errors.consignment_price}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-navy-950 dark:text-white">
                Harga Dijual (Rp) *
              </Label>
              <Input
                type="number"
                min={0}
                step={100}
                placeholder="Harga kasir"
                value={receiveForm.data.selling_price}
                onChange={(e) => receiveForm.setData('selling_price', e.target.value)}
                className="h-8 text-xs font-semibold bg-white dark:bg-surface"
              />
              <span className="text-[10px] text-content-muted block">
                Harga jual resmi di meja kasir
              </span>
              {receiveForm.errors.selling_price && (
                <p className="text-xs text-danger">{receiveForm.errors.selling_price}</p>
              )}
            </div>

            {/* Profit / Commission Simulation */}
            <div className="sm:col-span-2 pt-1 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-[11px]">
              <span className="text-content-muted">Estimasi Komisi Mart:</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">
                Rp {(
                  Number(receiveForm.data.selling_price || 0) - Number(receiveForm.data.consignment_price || 0)
                ).toLocaleString('id-ID')} / pcs
                {Number(receiveForm.data.selling_price) > 0 && (
                  <span className="ml-1 font-normal text-[10px] text-content-muted">
                    (
                    {Math.round(
                      ((Number(receiveForm.data.selling_price) - Number(receiveForm.data.consignment_price)) /
                        Number(receiveForm.data.selling_price)) *
                        100
                    )}
                    %)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Qty and Batch / Expired */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Qty Titipan ({selectedReceiveProduct?.unit_symbol ?? 'Pcs'}) *
              </Label>
              <Input
                type="number"
                min={0.001}
                step={1}
                placeholder="Jumlah pcs"
                value={receiveForm.data.qty}
                onChange={(e) => receiveForm.setData('qty', e.target.value)}
                className="h-8 text-xs"
              />
              {receiveForm.errors.qty && (
                <p className="text-xs text-danger">{receiveForm.errors.qty}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">No. Batch / Surat Jalan</Label>
              <Input
                placeholder="mis. BTH-001 (opsional)"
                value={receiveForm.data.batch_no}
                onChange={(e) => receiveForm.setData('batch_no', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {selectedReceiveProduct?.is_expirable && (
            <div className="space-y-1 p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/50">
              <Label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-600" /> Tanggal Kedaluwarsa (Wajib)
              </Label>
              <Input
                type="date"
                value={receiveForm.data.expired_at}
                onChange={(e) => receiveForm.setData('expired_at', e.target.value)}
                className="h-8 text-xs bg-white dark:bg-surface"
              />
              {receiveForm.errors.expired_at && (
                <p className="text-xs text-danger">{receiveForm.errors.expired_at}</p>
              )}
            </div>
          )}
        </form>
      </AppSheet>

      {/* Dialog Bantuan / Popup Produk Tidak Ditemukan / Kosong */}
      <Dialog open={noProductDialogOpen} onOpenChange={setNoProductDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-800 shadow-2xs">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-navy-950 dark:text-white">
                  Produk Konsinyasi Tidak Ada / Belum Terdaftar
                </DialogTitle>
                <DialogDescription className="text-xs text-content-muted mt-0.5">
                  Produk belum ditandai sebagai barang konsinyasi pada database Master Produk.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/90 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 space-y-1.5">
              <span className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                <Tag className="h-3.5 w-3.5 text-blue-600" /> Kenapa daftar produk kosong atau tidak muncul?
              </span>
              <p className="text-[11px] leading-relaxed text-blue-950/80 dark:text-blue-200/80">
                Form settlement ini secara khusus memfilter produk yang memiliki status <strong>Barang Titipan (Konsinyasi)</strong> aktif di sistem. Jika produk biasa (non-titipan), maka produk tersebut tidak dimasukkan ke dalam rekonsiliasi konsinyasi.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-surface space-y-2.5">
              <span className="font-bold text-navy-950 dark:text-white block">
                Langkah Cepat Mengaktifkan Produk Konsinyasi:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-content text-[11px] leading-relaxed pl-1">
                <li>
                  Buka menu <strong className="text-blue-700 dark:text-blue-400">Master Data &gt; Produk</strong>.
                </li>
                <li>
                  Klik tombol <strong>Tambah Produk</strong> atau <strong>Edit</strong> pada produk titipan supplier.
                </li>
                <li>
                  Centang kotak opsi <strong className="text-emerald-700 dark:text-emerald-400">"Barang Titipan (Konsinyasi)"</strong>.
                </li>
                <li>
                  Tentukan <strong>Harga Titipan</strong> (nilai setor supplier) dan <strong>Persentase Komisi Mart (%)</strong>.
                </li>
                <li>
                  Simpan produk. Produk otomatis langsung muncul pada pilihan rekonsiliasi konsinyasi ini.
                </li>
              </ol>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNoProductDialogOpen(false)}
              className="text-xs"
            >
              Tutup
            </Button>
            <Button
              type="button"
              onClick={() => {
                setNoProductDialogOpen(false)
                setSheetOpen(false)
                router.visit(route('admin.products.index'))
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-2xs font-semibold"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Buka Master Data Produk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hasil Kosong Saat Hitung Settlement */}
      <Dialog open={emptyResultDialogOpen} onOpenChange={setEmptyResultDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-800 shadow-2xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-navy-950 dark:text-white">
                  Tidak Ada Penjualan Pada Periode Ini
                </DialogTitle>
                <DialogDescription className="text-xs text-content-muted mt-0.5">
                  Hasil rekonsiliasi kasir menghasilkan 0 transaksi penjualan barang titipan.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border space-y-2 text-[11px] leading-relaxed text-content">
              <p className="font-semibold text-navy-950 dark:text-white">Kemungkinan penyebab data 0:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Belum ada transaksi di kasir POS untuk produk konsinyasi ini pada rentang tanggal yang dipilih.</li>
                <li>Rentang tanggal yang dipilih terlalu sempit (coba ganti ke preset <em>Bulan Lalu</em> atau perluas rentang).</li>
                <li>Jika memilih spesifik satu produk, belum ada riwayat struk kasir untuk produk tersebut.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setEmptyResultDialogOpen(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              Atur Ulang Periode Penjualan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
