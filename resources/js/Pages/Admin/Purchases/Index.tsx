import { useState, type FormEventHandler, type ReactElement } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
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
import { Switch } from '@/Components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { AppSheet } from '@/Components/common/AppSheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { formatDate } from '@/Lib/date'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }
type SupplierRef = { id: number; name: string; payment_term_days: number; is_consignor: boolean }
type ProductRef = { id: number; name: string; sku: string; base_unit_id: number; is_expirable: boolean }
type UnitRef = { id: number; code: string; name: string }

type PurchaseRow = {
  id: number
  reference: string
  purchase_date: string
  type: string
  payment_type: string
  status: string
  total: number
  supplier: Ref
  outlet: Ref
}

type CashAccountRef = { id: number; name: string; outlet_id: number }

type PurchasesIndexProps = {
  tab: string
  purchases: Paginated<PurchaseRow>
  suppliers: SupplierRef[]
  outlets: Ref[]
  products: ProductRef[]
  units: UnitRef[]
  cashAccounts: CashAccountRef[]
  filters: { search?: string; supplier_id?: string }
}

type ItemField = {
  product_id: string
  unit_id: string
  qty: number
  unit_price: number
  discount: number
  batch_no: string
  expired_at: string
}

type CostField = { name: string; amount: number }

const emptyForm = {
  supplier_id: '',
  outlet_id: '',
  invoice_no: '',
  purchase_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  type: 'regular' as 'regular' | 'consignment',
  payment_type: 'cash' as 'cash' | 'credit',
  cash_account_id: '',
  discount: 0,
  tax: 0,
  note: '',
  items: [] as ItemField[],
  other_costs: [] as CostField[],
}

export default function Index({ tab, purchases, suppliers, outlets, products, units, cashAccounts, filters }: PurchasesIndexProps) {
  const [search, setSearch] = useState(filters.search ?? '')
  const [sheetOpen, setSheetOpen] = useState(false)
  const form = useForm(emptyForm)

  function applyFilter() {
    router.get(route('admin.purchases.index'), { search }, { preserveState: true, replace: true })
  }

  function openCreate() {
    form.reset()
    form.setData('outlet_id', outlets[0] ? String(outlets[0].id) : '')
    setSheetOpen(true)
  }

  function addItem() {
    form.setData('items', [...form.data.items, { product_id: '', unit_id: '', qty: 1, unit_price: 0, discount: 0, batch_no: '', expired_at: '' }])
  }

  function updateItem(index: number, patch: Partial<ItemField>) {
    form.setData('items', form.data.items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function removeItem(index: number) {
    form.setData('items', form.data.items.filter((_, i) => i !== index))
  }

  function addCost() {
    form.setData('other_costs', [...form.data.other_costs, { name: '', amount: 0 }])
  }

  function updateCost(index: number, patch: Partial<CostField>) {
    form.setData('other_costs', form.data.other_costs.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function removeCost(index: number) {
    form.setData('other_costs', form.data.other_costs.filter((_, i) => i !== index))
  }

  const itemsSubtotal = form.data.items.reduce((sum, it) => sum + it.qty * it.unit_price - it.discount, 0)
  const costsTotal = form.data.other_costs.reduce((sum, c) => sum + c.amount, 0)
  const grandTotal = itemsSubtotal - form.data.discount + form.data.tax + costsTotal

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    form.post(route('admin.purchases.store'), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setSheetOpen(false)
      },
    })
  }

  const columns: ColumnDef<PurchaseRow, unknown>[] = [
    {
      id: 'reference',
      header: 'Referensi',
      cell: ({ row }) => <Link href={route('admin.purchases.show', row.original.id)} className="text-primary hover:underline">{row.original.reference}</Link>,
    },
    { id: 'supplier', header: 'Supplier', cell: ({ row }) => row.original.supplier.name },
    { id: 'date', header: 'Tanggal', cell: ({ row }) => formatDate(row.original.purchase_date) },
    {
      id: 'type',
      header: 'Tipe',
      cell: ({ row }) => (row.original.type === 'consignment' ? <Badge className="bg-teal text-white">Konsinyasi</Badge> : <Badge variant="outline">Reguler</Badge>),
    },
    { id: 'payment', header: 'Bayar', cell: ({ row }) => (row.original.payment_type === 'credit' ? 'Kredit' : 'Tunai') },
    { id: 'total', header: 'Total', cell: ({ row }) => <Money amount={row.original.total} /> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pembelian"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Pembelian' }]}
        actions={<Button onClick={openCreate}>Terima Barang</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'purchase-orders', label: 'Purchase Order', href: route('admin.purchase-orders.index'), permission: 'purchase_order.view' },
        { key: 'purchases', label: 'Pembelian', href: route('admin.purchases.index'), permission: 'purchase.view' },
        { key: 'consignment', label: 'Konsinyasi', href: route('admin.consignment.index'), permission: 'consignment.view' },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Cari referensi/no. faktur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={applyFilter}>Terapkan</Button>
      </div>

      <DataTable
        columns={columns}
        data={purchases.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: purchases.current_page,
          perPage: purchases.per_page,
          total: purchases.total,
          onPageChange: (page) => router.get(route('admin.purchases.index'), { search, page }, { preserveState: true }),
        }}
      />

      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Terima Barang"
        size="full"
        footer={<Button type="submit" form="purchase-receive-form" disabled={form.processing || form.data.items.length === 0}>Simpan Penerimaan</Button>}
      >
          <form id="purchase-receive-form" onSubmit={submit} className="flex flex-col gap-4 px-4 pb-4">
            <Tabs defaultValue="umum">
              <TabsList>
                <TabsTrigger value="umum">Umum</TabsTrigger>
                <TabsTrigger value="item">Item ({form.data.items.length})</TabsTrigger>
                <TabsTrigger value="biaya">Biaya Tambahan</TabsTrigger>
              </TabsList>

              <TabsContent value="umum" className="flex flex-col gap-4">
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
                <div className="space-y-1.5">
                  <Label>No. Faktur Supplier</Label>
                  <Input value={form.data.invoice_no} onChange={(e) => form.setData('invoice_no', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tanggal Terima</Label>
                    <Input type="date" value={form.data.purchase_date} onChange={(e) => form.setData('purchase_date', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jatuh Tempo (bila kredit)</Label>
                    <Input type="date" value={form.data.due_date} onChange={(e) => form.setData('due_date', e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="p-consignment"
                    checked={form.data.type === 'consignment'}
                    onCheckedChange={(c) => form.setData('type', c ? 'consignment' : 'regular')}
                  />
                  <Label htmlFor="p-consignment" className="font-normal">Barang Konsinyasi (bukan aset mart, tanpa hutang/jurnal)</Label>
                </div>
                {form.data.type === 'regular' && (
                  <div className="space-y-1.5">
                    <Label>Metode Bayar</Label>
                    <Select value={form.data.payment_type} onValueChange={(v) => form.setData('payment_type', v as 'cash' | 'credit')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Tunai</SelectItem>
                        <SelectItem value="credit">Kredit (hutang)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.data.type === 'regular' && form.data.payment_type === 'cash' && (
                  <div className="space-y-1.5">
                    <Label>Akun Kas (saldo akan berkurang sebesar total pembelian)</Label>
                    <Select value={form.data.cash_account_id} onValueChange={(v) => form.setData('cash_account_id', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun kas" />
                      </SelectTrigger>
                      <SelectContent>
                        {cashAccounts
                          .filter((a) => String(a.outlet_id) === form.data.outlet_id)
                          .map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {form.errors.cash_account_id && <p className="text-sm text-danger">{form.errors.cash_account_id}</p>}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="item" className="flex flex-col gap-3">
                {form.data.items.map((item, index) => {
                  const product = products.find((p) => String(p.id) === item.product_id)

                  return (
                    <div key={index} className="flex flex-col gap-2 rounded-md border border-border p-2.5">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Produk</Label>
                          <Select value={item.product_id} onValueChange={(v) => updateItem(index, { product_id: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih produk" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku}){p.is_expirable ? ' — expirable' : ''}</SelectItem>
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
                          <Input type="number" min={0.001} step="0.001" value={item.qty} onChange={(e) => updateItem(index, { qty: Number(e.target.value) })} />
                        </div>
                        <div className="w-32 space-y-1">
                          <Label className="text-xs">Harga Beli</Label>
                          <MoneyInput value={item.unit_price} onChange={(v) => updateItem(index, { unit_price: v })} />
                        </div>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(index)}>
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      </div>
                      {product?.is_expirable && (
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">No. Batch</Label>
                            <Input value={item.batch_no} onChange={(e) => updateItem(index, { batch_no: e.target.value })} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Tanggal Kadaluwarsa (wajib)</Label>
                            <Input type="date" value={item.expired_at} onChange={(e) => updateItem(index, { expired_at: e.target.value })} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-fit">
                  <Plus className="size-3.5" /> Tambah Item
                </Button>
                {form.errors.items && <p className="text-sm text-danger">{form.errors.items}</p>}
              </TabsContent>

              <TabsContent value="biaya" className="flex flex-col gap-3">
                {form.data.other_costs.map((cost, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Nama Biaya</Label>
                      <Input placeholder="mis. Ongkir" value={cost.name} onChange={(e) => updateCost(index, { name: e.target.value })} />
                    </div>
                    <div className="w-40 space-y-1">
                      <Label className="text-xs">Nominal</Label>
                      <MoneyInput value={cost.amount} onChange={(v) => updateCost(index, { amount: v })} />
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeCost(index)}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addCost} className="w-fit">
                  <Plus className="size-3.5" /> Tambah Biaya
                </Button>
                <p className="text-xs text-content-muted">Dialokasikan proporsional ke tiap item berdasarkan nilai, menaikkan HPP.</p>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end border-t border-border pt-3">
              <div className="text-right">
                <p className="text-sm text-content-muted">Total</p>
                <Money amount={grandTotal} size="lg" />
              </div>
            </div>

          </form>
      </AppSheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
