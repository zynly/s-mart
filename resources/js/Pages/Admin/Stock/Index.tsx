import { useEffect, useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, PackageX } from 'lucide-react'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
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
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Cari nama/SKU produk…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              className="max-w-xs"
            />
            <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="low">Stok Rendah</SelectItem>
                <SelectItem value="out">Stok Habis</SelectItem>
              </SelectContent>
            </Select>
            {outlets.length > 1 && (
              <Select value={outletId} onValueChange={(v) => { setOutletId(v); applyFilter(v) }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={() => applyFilter()}>Terapkan</Button>
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
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {expiringSoon.length === 0 && <p className="p-4 text-sm text-content-muted">Tidak ada produk akan kadaluwarsa dalam 7 hari.</p>}
            {expiringSoon.map((layer) => (
              <div key={layer.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium">{layer.product.name}</p>
                  <p className="text-content-muted">{layer.batch_no ?? '—'} · {Number(layer.qty_remaining).toLocaleString('id-ID')} unit</p>
                </div>
                <Badge className="bg-warning text-white">{formatDate(layer.expired_at)}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="expired">
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {expired.length === 0 && <p className="p-4 text-sm text-content-muted">Tidak ada produk kadaluwarsa.</p>}
            {expired.map((layer) => (
              <div key={layer.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium">{layer.product.name}</p>
                  <p className="text-content-muted">{layer.batch_no ?? '—'} · {Number(layer.qty_remaining).toLocaleString('id-ID')} unit</p>
                </div>
                <Badge className="bg-danger text-white">{formatDate(layer.expired_at)}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={cardSheetProduct !== null} onOpenChange={(open) => !open && setCardSheetProduct(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Kartu Stok — {cardSheetProduct?.product.name}</SheetTitle>
          </SheetHeader>
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
        </SheetContent>
      </Sheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
