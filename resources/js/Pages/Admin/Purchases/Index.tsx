import { useState, type FormEventHandler, type ReactElement } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Search, Filter, RotateCcw } from 'lucide-react'
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
import { ProductCombobox } from '@/Components/common/ProductCombobox'
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
  const totalQty = form.data.items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0)
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

      {/* Full-width Balanced Filter Toolbar (Rata Kiri-Kanan) */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 w-full">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Cari referensi atau nomor faktur pembelian…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              className="pl-9 h-9 text-sm bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-end">
          {Boolean(search) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                router.get(route('admin.purchases.index'), {}, { preserveState: true })
              }}
              className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              title="Reset Filter"
            >
              <RotateCcw className="size-3.5 mr-1 text-slate-400" />
              Reset
            </Button>
          )}
          <Button
            onClick={applyFilter}
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                {/* Table Header for Desktop */}
                {form.data.items.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-t-lg">
                    <div className="flex-1">Produk</div>
                    <div className="w-36">Satuan</div>
                    <div className="w-28 text-center">Qty</div>
                    <div className="w-36">Harga Beli (Rp)</div>
                    <div className="w-36 text-right">Subtotal (Rp)</div>
                    <div className="w-8"></div>
                  </div>
                )}

                {form.data.items.map((item, index) => {
                  const product = products.find((p) => String(p.id) === item.product_id)
                  const lineSubtotal = item.qty * item.unit_price - (item.discount || 0)

                  return (
                    <div key={index} className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                        {/* Produk */}
                        <div className="flex-1 space-y-1 sm:space-y-0">
                          <Label className="text-xs sm:hidden">Produk</Label>
                          <ProductCombobox
                            products={products}
                            value={item.product_id}
                            onSelect={(p) => updateItem(index, { product_id: String(p.id), unit_id: String(p.base_unit_id) })}
                          />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Satuan */}
                          <div className="w-36 space-y-1 sm:space-y-0 shrink-0">
                            <Label className="text-xs sm:hidden">Satuan</Label>
                            <Select value={item.unit_id} onValueChange={(v) => updateItem(index, { unit_id: v })}>
                              <SelectTrigger className="w-full">
                                <SelectValue className="truncate" />
                              </SelectTrigger>
                              <SelectContent>
                                {units.map((u) => (
                                  <SelectItem key={u.id} value={String(u.id)}>{u.code}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Qty */}
                          <div className="w-28 space-y-1 sm:space-y-0 shrink-0">
                            <Label className="text-xs sm:hidden">Qty</Label>
                            <Input
                              type="number"
                              min={0.001}
                              step="0.001"
                              value={item.qty}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(index, { qty: Number(e.target.value) })}
                              className="text-center font-bold bg-slate-50/50 dark:bg-slate-800/50"
                            />
                          </div>

                          {/* Harga Beli */}
                          <div className="w-36 space-y-1 sm:space-y-0 shrink-0">
                            <Label className="text-xs sm:hidden">Harga Beli</Label>
                            <MoneyInput value={item.unit_price} onChange={(v) => updateItem(index, { unit_price: v })} />
                          </div>

                          {/* Subtotal */}
                          <div className="w-36 space-y-1 sm:space-y-0 shrink-0 text-right">
                            <Label className="text-xs sm:hidden text-slate-400">Subtotal</Label>
                            <div className="flex h-9 items-center justify-end px-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 font-bold text-xs text-blue-600 dark:text-blue-400">
                              <Money amount={lineSubtotal} />
                            </div>
                          </div>

                          {/* Delete Button */}
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(index)} className="shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Expirable / Batch Info */}
                      {product?.is_expirable && (
                        <div className="flex flex-col sm:flex-row gap-2.5 mt-1 pt-2 border-t border-slate-100 dark:border-slate-800/60 bg-amber-50/40 dark:bg-amber-950/10 p-2 rounded-lg">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">No. Batch</Label>
                            <Input value={item.batch_no} placeholder="mis. BATCH-001" onChange={(e) => updateItem(index, { batch_no: e.target.value })} className="h-8 text-xs bg-white dark:bg-slate-900" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">Tanggal Kadaluwarsa (wajib)</Label>
                            <Input type="date" value={item.expired_at} onChange={(e) => updateItem(index, { expired_at: e.target.value })} className="h-8 text-xs bg-white dark:bg-slate-900" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-fit gap-1.5 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 font-semibold mt-1">
                  <Plus className="size-4" /> Tambah Item Barang
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

            {/* Sticky Summary & Grand Total Bar */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/80 to-slate-50 dark:from-slate-900 dark:to-blue-950/30 p-3.5 flex flex-wrap items-center justify-between gap-4 mt-4 shadow-xs">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Jenis Item:</span>
                  <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{form.data.items.length} Barang</span>
                </div>
                <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Total Qty:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-100/60 dark:bg-blue-900/40">{totalQty.toLocaleString('id-ID')}</span>
                </div>
                <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Subtotal Item:</span>
                  <Money amount={itemsSubtotal} className="font-bold text-slate-800 dark:text-slate-200" />
                </div>
                {costsTotal > 0 && (
                  <>
                    <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Biaya Tambahan:</span>
                      <Money amount={costsTotal} className="font-bold text-amber-600 dark:text-amber-400" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total:</span>
                <Money amount={grandTotal} size="lg" className="font-black text-blue-600 dark:text-blue-400 text-lg sm:text-xl" />
              </div>
            </div>

          </form>
      </AppSheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
