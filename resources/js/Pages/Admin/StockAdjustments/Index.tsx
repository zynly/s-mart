import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Check } from 'lucide-react'
import { cn } from '@/Lib/utils'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }
type ProductRef = { id: number; name: string; sku: string }
type LayerRef = { id: number; batch_no: string | null; expired_at: string | null; qty_remaining: string; unit_cost: number }

type AdjustmentItemRow = { id: number; product: Ref; qty: string; unit_cost: number; total_cost: number }

type AdjustmentRow = {
  id: number
  reference: string
  adjustment_date: string
  type: string
  reason: string
  total_value: number
  status: string
  outlet: Ref
  requester: Ref | null
  approver: Ref | null
  items: AdjustmentItemRow[]
}

type StockAdjustmentsIndexProps = {
  tab: string
  adjustments: Paginated<AdjustmentRow>
  products: ProductRef[]
  outlets: Ref[]
  filters: { status?: string }
}

type DraftLine = { key: string; product_id: string; product_name: string; qty: number; stock_layer_id: string; note: string }

const TYPE_LABELS: Record<string, string> = { increase: 'Penambahan', decrease: 'Pengurangan' }
const STATUS_LABELS: Record<string, string> = { draft: 'Menunggu', approved: 'Disetujui', posted: 'Diposting' }
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-warning text-white',
  approved: 'bg-navy-600 text-white',
  posted: 'bg-success text-white',
}

export default function Index({ tab, adjustments, products, outlets, filters }: StockAdjustmentsIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [formOpen, setFormOpen] = useState(false)
  const [lines, setLines] = useState<DraftLine[]>([])
  const [pickProductId, setPickProductId] = useState('')
  const [pickQty, setPickQty] = useState(1)
  const [layersByProduct, setLayersByProduct] = useState<Record<string, LayerRef[]>>({})

  const form = useForm({ outlet_id: outlets[0] ? String(outlets[0].id) : '', type: 'increase', reason: '' })

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.stock-adjustments.index'), { status }, { preserveState: true, replace: true })
  }

  async function fetchLayers(productId: string) {
    if (!form.data.outlet_id || layersByProduct[productId]) return
    const res = await fetch(route('admin.stock-adjustments.layers', productId) + `?outlet_id=${form.data.outlet_id}`)
    const data = await res.json()
    setLayersByProduct((prev) => ({ ...prev, [productId]: data.layers ?? [] }))
  }

  function addLine() {
    const product = products.find((p) => String(p.id) === pickProductId)
    if (!product || pickQty <= 0) return

    setLines((prev) => [...prev, { key: `${product.id}-${Date.now()}`, product_id: String(product.id), product_name: product.name, qty: pickQty, stock_layer_id: '', note: '' }])
    setPickProductId('')
    setPickQty(1)
    if (form.data.type === 'decrease') void fetchLayers(String(product.id))
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()

    if (lines.length === 0) {
      toast.error('Tambahkan minimal satu item.')
      return
    }
    if (form.data.type === 'decrease' && lines.some((l) => !l.stock_layer_id)) {
      toast.error('Pilih layer stok untuk setiap item pengurangan.')
      return
    }

    form.transform((data) => ({
      ...data,
      items: lines.map((l) => ({
        product_id: Number(l.product_id),
        qty: l.qty,
        stock_layer_id: l.stock_layer_id ? Number(l.stock_layer_id) : null,
        note: l.note || null,
      })),
    }))

    form.post(route('admin.stock-adjustments.store'), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setLines([])
        setFormOpen(false)
      },
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal mengajukan penyesuaian.'),
    })
  }

  function approveAdjustment(row: AdjustmentRow) {
    router.put(route('admin.stock-adjustments.approve', row.id), {}, {
      preserveScroll: true,
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal menyetujui penyesuaian.'),
    })
  }

  function postAdjustment(row: AdjustmentRow) {
    router.put(route('admin.stock-adjustments.post', row.id), {}, {
      preserveScroll: true,
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal memposting penyesuaian.'),
    })
  }

  const columns: ColumnDef<AdjustmentRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'outlet', header: 'Outlet', cell: ({ row }) => row.original.outlet.name },
    { id: 'type', header: 'Tipe', cell: ({ row }) => TYPE_LABELS[row.original.type] ?? row.original.type },
    { accessorKey: 'reason', header: 'Alasan' },
    { id: 'total_value', header: 'Nilai', cell: ({ row }) => <Money amount={row.original.total_value} size="sm" /> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.status === 'draft') {
          return <Button size="sm" variant="outline" onClick={() => approveAdjustment(row.original)}>Setujui</Button>
        }
        if (row.original.status === 'approved') {
          return <Button size="sm" variant="outline" onClick={() => postAdjustment(row.original)}>Posting</Button>
        }
        return null
      },
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Penyesuaian Stok"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Penyesuaian Stok' }]}
        actions={<Button onClick={() => setFormOpen(true)}>Ajukan Penyesuaian</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'stock', label: 'Ringkasan', href: route('admin.stock.index'), permission: 'stock.view' },
        { key: 'opnames', label: 'Opname', href: route('admin.opnames.index'), permission: 'opname.view' },
        { key: 'transfers', label: 'Transfer', href: route('admin.transfers.index'), permission: 'transfer.view' },
        { key: 'stock-adjustments', label: 'Penyesuaian', href: route('admin.stock-adjustments.index'), permission: 'adjustment.view' },
      ]} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Status:</span>
        <button
          type="button"
          onClick={() => applyFilter('')}
          className={cn(
            'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer select-none',
            !statusFilter
              ? 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-xs'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
          )}
        >
          <span className={cn('size-2 rounded-full', !statusFilter ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700')} />
          <span>Semua Status</span>
          {!statusFilter && <Check className="size-3 text-amber-600 stroke-[3]" />}
        </button>

        {Object.entries(STATUS_LABELS).map(([value, label]) => {
          const isSelected = statusFilter === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => applyFilter(value)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer select-none',
                isSelected
                  ? 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
              )}
            >
              <span className={cn('size-2 rounded-full', isSelected ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700')} />
              <span>{label}</span>
              {isSelected && <Check className="size-3 text-amber-600 stroke-[3]" />}
            </button>
          )
        })}
      </div>

      <DataTable
        columns={columns}
        data={adjustments.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: adjustments.current_page,
          perPage: adjustments.per_page,
          total: adjustments.total,
          onPageChange: (page) => router.get(route('admin.stock-adjustments.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajukan Penyesuaian Stok</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Outlet</Label>
                <Select value={form.data.outlet_id} onValueChange={(v) => { form.setData('outlet_id', v); setLayersByProduct({}) }}>
                  <SelectTrigger><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={form.data.type} onValueChange={(v) => { form.setData('type', v); setLines([]) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Alasan</Label>
              <Textarea value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} />
              {form.errors.reason && <p className="text-sm text-danger">{form.errors.reason}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tambah Item</Label>
              <div className="flex gap-2">
                <Select value={pickProductId} onValueChange={setPickProductId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min={0.001} step="0.001" className="w-24" value={pickQty} onChange={(e) => setPickQty(Number(e.target.value) || 0)} />
                <Button type="button" variant="outline" onClick={addLine}>Tambah</Button>
              </div>
            </div>

            {lines.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border bg-surface neu-flat">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-navy-900 text-white font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-12">No.</th>
                        <th className="px-4 py-2.5">Produk</th>
                        <th className="px-4 py-2.5 text-center">Qty Penyesuaian</th>
                        <th className="px-4 py-2.5">Layer Stok / Batch</th>
                        <th className="px-4 py-2.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lines.map((line, idx) => (
                        <tr key={line.key} className="transition-colors hover:bg-navy-50/50">
                          <td className="px-3 py-3 text-center font-mono text-content-muted font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-content">{line.product_name}</td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-navy-800">{line.qty}</td>
                          <td className="px-4 py-3">
                            {form.data.type === 'decrease' ? (
                              <Select value={line.stock_layer_id} onValueChange={(v) => updateLine(line.key, { stock_layer_id: v })}>
                                <SelectTrigger className="w-full text-xs h-8"><SelectValue placeholder="Pilih layer stok" /></SelectTrigger>
                                <SelectContent>
                                  {(layersByProduct[line.product_id] ?? []).map((layer) => (
                                    <SelectItem key={layer.id} value={String(layer.id)}>
                                      {layer.batch_no ?? `Layer #${layer.id}`} — sisa {layer.qty_remaining} {layer.expired_at ? `(exp ${layer.expired_at})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-content-muted font-mono text-[11px]">— Batch Baru —</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-danger hover:bg-red-50" onClick={() => removeLine(line.key)}>
                              Hapus / Batal
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={form.processing}>Ajukan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
