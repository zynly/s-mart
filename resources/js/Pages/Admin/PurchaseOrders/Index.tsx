import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2 } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }
type ProductRef = { id: number; name: string; sku: string; base_unit_id: number }
type UnitRef = { id: number; code: string; name: string }

type OrderRow = {
  id: number
  reference: string
  status: string
  order_date: string
  total: number
  supplier: Ref
  outlet: Ref
  items: { id: number }[]
}

type PurchaseOrdersIndexProps = {
  tab: string
  orders: Paginated<OrderRow>
  suppliers: Ref[]
  outlets: Ref[]
  products: ProductRef[]
  units: UnitRef[]
  filters: { status?: string }
}

type ItemField = { product_id: string; unit_id: string; qty_ordered: number; unit_price: number; discount: number }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  approved: 'Disetujui',
  sent: 'Terkirim',
  partial: 'Sebagian',
  received: 'Diterima',
  cancelled: 'Dibatalkan',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-500 text-white',
  approved: 'bg-teal text-white',
  sent: 'bg-navy-500 text-white',
  partial: 'bg-warning text-white',
  received: 'bg-success text-white',
  cancelled: 'bg-danger text-white',
}

export default function Index({ tab, orders, suppliers, outlets, products, units, filters }: PurchaseOrdersIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [sheetOpen, setSheetOpen] = useState(false)

  const form = useForm({
    supplier_id: '',
    outlet_id: outlets[0] ? String(outlets[0].id) : '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: '',
    note: '',
    items: [] as ItemField[],
  })

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.purchase-orders.index'), { status }, { preserveState: true, replace: true })
  }

  function addItem() {
    form.setData('items', [...form.data.items, { product_id: '', unit_id: '', qty_ordered: 1, unit_price: 0, discount: 0 }])
  }

  function updateItem(index: number, patch: Partial<ItemField>) {
    form.setData('items', form.data.items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function removeItem(index: number) {
    form.setData('items', form.data.items.filter((_, i) => i !== index))
  }

  const total = form.data.items.reduce((sum, it) => sum + it.qty_ordered * it.unit_price - it.discount, 0)

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    form.post(route('admin.purchase-orders.store'), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setSheetOpen(false)
      },
    })
  }

  const columns: ColumnDef<OrderRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'supplier', header: 'Supplier', cell: ({ row }) => row.original.supplier.name },
    { id: 'date', header: 'Tanggal', cell: ({ row }) => new Date(row.original.order_date).toLocaleDateString('id-ID') },
    { id: 'items', header: 'Item', cell: ({ row }) => row.original.items.length },
    { id: 'total', header: 'Total', cell: ({ row }) => <Money amount={row.original.total} /> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'draft' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.put(route('admin.purchase-orders.approve', row.original.id), {}, { preserveScroll: true })}
          >
            Setujui
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Purchase Order"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Purchase Order' }]}
        actions={<Button onClick={() => setSheetOpen(true)}>Buat PO</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'purchase-orders', label: 'Purchase Order', href: route('admin.purchase-orders.index'), permission: 'purchase_order.view' },
        { key: 'purchases', label: 'Pembelian', href: route('admin.purchases.index'), permission: 'purchase.view' },
        { key: 'consignment', label: 'Konsinyasi', href: route('admin.consignment.index'), permission: 'consignment.view' },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter || 'all'} onValueChange={(v) => applyFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={orders.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: orders.current_page,
          perPage: orders.per_page,
          total: orders.total,
          onPageChange: (page) => router.get(route('admin.purchase-orders.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Buat Purchase Order</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={form.data.supplier_id} onValueChange={(v) => form.setData('supplier_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Outlet</Label>
                <Select value={form.data.outlet_id} onValueChange={(v) => form.setData('outlet_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tanggal Order</Label>
                <Input type="date" value={form.data.order_date} onChange={(e) => form.setData('order_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Diharapkan</Label>
                <Input type="date" value={form.data.expected_date} onChange={(e) => form.setData('expected_date', e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Item</Label>
              {form.data.items.map((item, index) => (
                <div key={index} className="flex items-end gap-2 rounded-md border border-border p-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Produk</Label>
                    <Select value={item.product_id} onValueChange={(v) => updateItem(index, { product_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih produk" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Satuan</Label>
                    <Select value={item.unit_id} onValueChange={(v) => updateItem(index, { unit_id: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={0.001} step="0.001" value={item.qty_ordered} onChange={(e) => updateItem(index, { qty_ordered: Number(e.target.value) })} />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">Harga Satuan</Label>
                    <MoneyInput value={item.unit_price} onChange={(v) => updateItem(index, { unit_price: v })} />
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(index)}>
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-fit">
                <Plus className="size-3.5" /> Tambah Item
              </Button>
              {form.errors.items && <p className="text-sm text-danger">{form.errors.items}</p>}
            </div>

            <div className="flex justify-end border-t border-border pt-3">
              <div className="text-right">
                <p className="text-sm text-content-muted">Total</p>
                <Money amount={total} size="lg" />
              </div>
            </div>

            <SheetFooter>
              <Button type="submit" disabled={form.processing || form.data.items.length === 0}>Simpan PO</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
