import { useEffect, useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, PackageX, Search, Filter, RotateCcw } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { StatCard } from '@/Components/common/StatCard'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { AppSheet } from '@/Components/common/AppSheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { formatDate } from '@/Lib/date'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }

type ProductRef = { id: number; name: string; sku: string; min_stock: string; max_stock: string | null; category: Ref | null }

type StockRow = {
  id: number
  product_id: number
  qty: string
  avg_cost: number
  last_cost: number
  product: ProductRef
}

type ExpiryLayer = {
  id: number
  qty_remaining: string
  expired_at: string
  batch_no: string | null
  product: { id: number; name: string }
}

type Movement = {
  reference: string
  type: string
  qty: string
  qty_before: string
  qty_after: string
  unit_cost: number | null
  note: string | null
  created_at: string
}

type StockIndexProps = {
  tab: string
  stocks: Paginated<StockRow>
  categories: Ref[]
  outlets: Ref[]
  currentOutletId: number | null
  expiringSoon: ExpiryLayer[]
  expired: ExpiryLayer[]
  filters: { search?: string; category_id?: string; status?: string; outlet_id?: string }
  canViewCost: boolean
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase: 'Pembelian',
  sale: 'Penjualan',
  sale_return: 'Retur Jual',
  purchase_return: 'Retur Beli',
  transfer_in: 'Transfer Masuk',
  transfer_out: 'Transfer Keluar',
  adjustment: 'Penyesuaian',
  opname: 'Opname',
  write_off: 'Write-Off',
  expired: 'Kadaluwarsa',
  consignment_in: 'Konsinyasi Masuk',
  consignment_return: 'Retur Konsinyasi',
}

function stockStatus(qty: number, minStock: number): { label: string; className: string } {
  if (qty <= 0) return { label: 'Habis', className: 'bg-danger text-white' }
  if (qty <= minStock) return { label: 'Rendah', className: 'bg-warning text-white' }

  return { label: 'Aman', className: 'bg-success text-white' }
}

export default function Index({ tab, stocks, categories, outlets, currentOutletId, expiringSoon, expired, filters, canViewCost }: StockIndexProps) {
  const [search, setSearch] = useState(filters.search ?? '')
  const [categoryFilter, setCategoryFilter] = useState(filters.category_id ?? '')
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [outletId, setOutletId] = useState(currentOutletId ? String(currentOutletId) : '')
  const [cardSheetProduct, setCardSheetProduct] = useState<StockRow | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loadingMovements, setLoadingMovements] = useState(false)

  function applyFilter(nextOutletId = outletId) {
    router.get(
      route('admin.stock.index'),
      { search, category_id: categoryFilter, status: statusFilter, outlet_id: nextOutletId },
      { preserveState: true, replace: true },
    )
  }

  useEffect(() => {
    if (cardSheetProduct === null) return

    fetch(route('admin.stock.movements', cardSheetProduct.product_id) + `?outlet_id=${outletId}`)
      .then((res) => res.json())
      .then((data) => setMovements(data.movements ?? []))
      .finally(() => setLoadingMovements(false))
  }, [cardSheetProduct, outletId])

  function openCardSheet(row: StockRow) {
    setLoadingMovements(true)
    setMovements([])
    setCardSheetProduct(row)
  }

  const lowCount = stocks.data.filter((s) => {
    const qty = Number(s.qty)
    const min = Number(s.product.min_stock)

    return qty > 0 && qty <= min
  }).length
  const outCount = stocks.data.filter((s) => Number(s.qty) <= 0).length

  const columns: ColumnDef<StockRow, unknown>[] = [
    { id: 'sku', header: 'SKU', cell: ({ row }) => row.original.product.sku },
    { id: 'name', header: 'Produk', cell: ({ row }) => row.original.product.name },
    { id: 'category', header: 'Kategori', cell: ({ row }) => row.original.product.category?.name ?? '—' },
    { id: 'qty', header: 'Stok', cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.qty).toLocaleString('id-ID')}</span> },
    { id: 'min', header: 'Min', cell: ({ row }) => <span className="font-mono tabular-nums text-content-muted">{Number(row.original.product.min_stock).toLocaleString('id-ID')}</span> },
    ...(canViewCost
      ? [{ id: 'avg_cost', header: 'HPP Rata-rata', cell: ({ row }: { row: { original: StockRow } }) => <Money amount={row.original.avg_cost} /> } as ColumnDef<StockRow, unknown>]
      : []),
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = stockStatus(Number(row.original.qty), Number(row.original.product.min_stock))

        return <Badge className={status.className}>{status.label}</Badge>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => openCardSheet(row.original)}>
          Kartu Stok
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Stok" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Stok' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'stock', label: 'Ringkasan', href: route('admin.stock.index'), permission: 'stock.view' },
        { key: 'opnames', label: 'Opname', href: route('admin.opnames.index'), permission: 'opname.view' },
        { key: 'transfers', label: 'Transfer', href: route('admin.transfers.index'), permission: 'transfer.view' },
        { key: 'stock-adjustments', label: 'Penyesuaian', href: route('admin.stock-adjustments.index'), permission: 'adjustment.view' },
      ]} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Produk Dipantau" value={String(stocks.total)} />
        <StatCard label="Stok Rendah (halaman ini)" value={String(lowCount)} icon={AlertTriangle} />
        <StatCard label="Stok Habis (halaman ini)" value={String(outCount)} icon={PackageX} />
      </div>

      <Tabs defaultValue="ringkasan">
        <TabsList>
          <TabsTrigger value="ringkasan">Ringkasan Stok</TabsTrigger>
          <TabsTrigger value="kadaluwarsa">Akan Kadaluwarsa ({expiringSoon.length})</TabsTrigger>
          <TabsTrigger value="expired">Kadaluwarsa ({expired.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan" className="flex flex-col gap-3">
          {/* Full-width Balanced Filter Toolbar (Rata Kiri-Kanan) */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 w-full">
            <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  placeholder="Cari nama atau SKU produk…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
                  className="pl-9 h-9 text-sm bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="w-full sm:w-44 shrink-0">
                <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Semua kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-36 shrink-0">
                <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="low">Stok Rendah</SelectItem>
                    <SelectItem value="out">Stok Habis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {outlets.length > 1 && (
                <div className="w-full sm:w-36 shrink-0">
                  <Select value={outletId} onValueChange={(v) => { setOutletId(v); applyFilter(v) }}>
                    <SelectTrigger className="h-9 text-sm bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 justify-end">
              {Boolean(search || (categoryFilter && categoryFilter !== 'all') || (statusFilter && statusFilter !== 'all')) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setCategoryFilter('')
                    setStatusFilter('')
                    router.get(route('admin.stock.index'), { outlet_id: outletId }, { preserveState: true })
                  }}
                  className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  title="Reset Filter"
                >
                  <RotateCcw className="size-3.5 mr-1 text-slate-400" />
                  Reset
                </Button>
              )}
              <Button
                onClick={() => applyFilter()}
                size="sm"
                className="h-9 px-4 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Filter className="size-3.5" />
                Terapkan Filter
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={stocks.data}
            getRowId={(row) => String(row.id)}
            emptyDescription="Belum ada stok tercatat untuk outlet ini."
            pagination={{
              page: stocks.current_page,
              perPage: stocks.per_page,
              total: stocks.total,
              onPageChange: (page) => router.get(route('admin.stock.index'), { search, category_id: categoryFilter, status: statusFilter, outlet_id: outletId, page }, { preserveState: true }),
            }}
          />
        </TabsContent>

        <TabsContent value="kadaluwarsa">
          <div className="overflow-hidden rounded-xl border border-border bg-surface neu-flat">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900 text-white font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3 py-3 text-center w-12">No.</th>
                    <th className="px-4 py-3">Nama Produk</th>
                    <th className="px-4 py-3">No. Batch</th>
                    <th className="px-4 py-3 text-right">Sisa Qty</th>
                    <th className="px-4 py-3 text-center">Tanggal Kadaluwarsa</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expiringSoon.map((layer, idx) => (
                    <tr key={layer.id} className="transition-colors hover:bg-navy-50/50">
                      <td className="px-3 py-3 text-center font-mono text-content-muted font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-content">{layer.product.name}</td>
                      <td className="px-4 py-3 font-mono text-content-muted">{layer.batch_no ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-navy-800">
                        {Number(layer.qty_remaining).toLocaleString('id-ID')} unit
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-warning text-white font-mono text-[11px]">{formatDate(layer.expired_at)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => router.visit(route('admin.stock-adjustments.index'))}
                          className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          Penyesuaian
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {expiringSoon.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-sm text-content-muted">
                        Tidak ada produk akan kadaluwarsa dalam 7 hari.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expired">
          <div className="overflow-hidden rounded-xl border border-border bg-surface neu-flat">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900 text-white font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3 py-3 text-center w-12">No.</th>
                    <th className="px-4 py-3">Nama Produk</th>
                    <th className="px-4 py-3">No. Batch</th>
                    <th className="px-4 py-3 text-right">Sisa Qty</th>
                    <th className="px-4 py-3 text-center">Status Kadaluwarsa</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expired.map((layer, idx) => (
                    <tr key={layer.id} className="transition-colors hover:bg-navy-50/50">
                      <td className="px-3 py-3 text-center font-mono text-content-muted font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-content">{layer.product.name}</td>
                      <td className="px-4 py-3 font-mono text-content-muted">{layer.batch_no ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-navy-800">
                        {Number(layer.qty_remaining).toLocaleString('id-ID')} unit
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-danger text-white font-mono text-[11px]">{formatDate(layer.expired_at)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => router.visit(route('admin.stock-adjustments.index'))}
                          className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Afkir / Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {expired.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-sm text-content-muted">
                        Tidak ada produk kadaluwarsa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AppSheet
        open={cardSheetProduct !== null}
        onOpenChange={(open) => !open && setCardSheetProduct(null)}
        title={`Kartu Stok — ${cardSheetProduct?.product.name ?? ''}`}
        size="lg"
      >
          <div className="flex flex-col gap-2 px-4 pb-4">
            {loadingMovements && <p className="text-sm text-content-muted">Memuat…</p>}
            {!loadingMovements && movements.length === 0 && <p className="text-sm text-content-muted">Belum ada pergerakan stok.</p>}
            {movements.map((m) => (
              <div key={m.reference + m.created_at} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm">
                <div>
                  <p className="font-medium">{MOVEMENT_TYPE_LABELS[m.type] ?? m.type}</p>
                  <p className="text-xs text-content-muted">{m.reference} · {new Date(m.created_at).toLocaleString('id-ID')}</p>
                  {m.note && <p className="text-xs text-content-muted">{m.note}</p>}
                </div>
                <div className="text-right">
                  <p className={`font-mono tabular-nums ${Number(m.qty) < 0 ? 'text-danger' : 'text-success'}`}>
                    {Number(m.qty) > 0 ? '+' : ''}{Number(m.qty).toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-content-muted">saldo: {Number(m.qty_after).toLocaleString('id-ID')}</p>
                </div>
              </div>
            ))}
          </div>
      </AppSheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
