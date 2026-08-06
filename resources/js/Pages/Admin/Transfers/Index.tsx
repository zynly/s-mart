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
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }
type ProductRef = { id: number; name: string; base_unit: { code: string } }

type TransferItemRow = { id: number; product: { id: number; name: string }; qty_sent: string; qty_received: string | null; unit_cost: number }

type TransferRow = {
  id: number
  reference: string
  transfer_date: string
  status: string
  total_qty: string
  total_value: number
  from_outlet: Ref
  to_outlet: Ref
  creator: Ref | null
  items: TransferItemRow[]
}

type TransfersIndexProps = {
  tab: string
  transfers: Paginated<TransferRow>
  products: ProductRef[]
  outlets: Ref[]
  filters: { status?: string }
}

type DraftLine = { key: string; product_id: string; product_name: string; unit_code: string; qty: number }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draf', approved: 'Disetujui', in_transit: 'Dalam Perjalanan', received: 'Diterima', partial: 'Sebagian', cancelled: 'Dibatalkan',
}
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-500 text-white',
  approved: 'bg-navy-600 text-white',
  in_transit: 'bg-warning text-white',
  received: 'bg-success text-white',
  partial: 'bg-warning text-white',
  cancelled: 'bg-danger text-white',
}

export default function Index({ tab, transfers, products, outlets, filters }: TransfersIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [formOpen, setFormOpen] = useState(false)
  const [lines, setLines] = useState<DraftLine[]>([])
  const [pickProductId, setPickProductId] = useState('')
  const [pickQty, setPickQty] = useState(1)
  const [receiveTarget, setReceiveTarget] = useState<TransferRow | null>(null)
  const [receiveQty, setReceiveQty] = useState<Record<number, number>>({})

  const form = useForm({
    from_outlet_id: outlets[0] ? String(outlets[0].id) : '',
    to_outlet_id: outlets[1] ? String(outlets[1].id) : '',
    transfer_date: new Date().toISOString().slice(0, 10),
    note: '',
  })

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.transfers.index'), { status }, { preserveState: true, replace: true })
  }

  function addLine() {
    const product = products.find((p) => String(p.id) === pickProductId)
    if (!product || pickQty <= 0) return

    setLines((prev) => [...prev, { key: `${product.id}-${Date.now()}`, product_id: String(product.id), product_name: product.name, unit_code: product.base_unit?.code ?? '', qty: pickQty }])
    setPickProductId('')
    setPickQty(1)
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()

    if (form.data.from_outlet_id === form.data.to_outlet_id) {
      toast.error('Outlet asal dan tujuan tidak boleh sama.')
      return
    }
    if (lines.length === 0) {
      toast.error('Tambahkan minimal satu item.')
      return
    }

    form.transform((data) => ({ ...data, items: lines.map((l) => ({ product_id: Number(l.product_id), qty: l.qty })) }))
    form.post(route('admin.transfers.store'), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setLines([])
        setFormOpen(false)
      },
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal membuat transfer.'),
    })
  }

  function approveTransfer(row: TransferRow) {
    router.put(route('admin.transfers.approve', row.id), {}, {
      preserveScroll: true,
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal menyetujui transfer.'),
    })
  }

  function sendTransfer(row: TransferRow) {
    router.put(route('admin.transfers.send', row.id), {}, {
      preserveScroll: true,
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal mengirim transfer.'),
    })
  }

  function cancelTransfer(row: TransferRow) {
    router.put(route('admin.transfers.cancel', row.id), {}, {
      preserveScroll: true,
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal membatalkan transfer.'),
    })
  }

  function openReceive(row: TransferRow) {
    setReceiveTarget(row)
    setReceiveQty(Object.fromEntries(row.items.map((it) => [it.id, Number(it.qty_sent)])))
  }

  function confirmReceive() {
    if (!receiveTarget) return

    router.put(
      route('admin.transfers.receive', receiveTarget.id),
      { items: receiveTarget.items.map((it) => ({ stock_transfer_item_id: it.id, qty_received: receiveQty[it.id] ?? 0 })) },
      {
        preserveScroll: true,
        onSuccess: () => setReceiveTarget(null),
        onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal menerima transfer.'),
      },
    )
  }

  const columns: ColumnDef<TransferRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'from', header: 'Dari', cell: ({ row }) => row.original.from_outlet.name },
    { id: 'to', header: 'Ke', cell: ({ row }) => row.original.to_outlet.name },
    { id: 'qty', header: 'Total Qty', cell: ({ row }) => row.original.total_qty },
    { id: 'value', header: 'Nilai', cell: ({ row }) => <Money amount={row.original.total_value} size="sm" /> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const t = row.original
        return (
          <div className="flex justify-end gap-2">
            {t.status === 'draft' && <Button size="sm" variant="outline" onClick={() => approveTransfer(t)}>Setujui</Button>}
            {t.status === 'approved' && <Button size="sm" variant="outline" onClick={() => sendTransfer(t)}>Kirim</Button>}
            {t.status === 'in_transit' && <Button size="sm" variant="outline" onClick={() => openReceive(t)}>Terima</Button>}
            {(t.status === 'draft' || t.status === 'approved') && (
              <Button size="sm" variant="outline" className="text-danger" onClick={() => cancelTransfer(t)}>Batal</Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Transfer Stok"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Transfer Stok' }]}
        actions={<Button onClick={() => setFormOpen(true)}>Buat Transfer</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'stock', label: 'Ringkasan', href: route('admin.stock.index'), permission: 'stock.view' },
        { key: 'opnames', label: 'Opname', href: route('admin.opnames.index'), permission: 'opname.view' },
        { key: 'transfers', label: 'Transfer', href: route('admin.transfers.index'), permission: 'transfer.view' },
        { key: 'stock-adjustments', label: 'Penyesuaian', href: route('admin.stock-adjustments.index'), permission: 'adjustment.view' },
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
        data={transfers.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: transfers.current_page,
          perPage: transfers.per_page,
          total: transfers.total,
          onPageChange: (page) => router.get(route('admin.transfers.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Transfer Stok</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Outlet Asal</Label>
                <Select value={form.data.from_outlet_id} onValueChange={(v) => form.setData('from_outlet_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Outlet Tujuan</Label>
                <Select value={form.data.to_outlet_id} onValueChange={(v) => form.setData('to_outlet_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Tambah Item</Label>
              <div className="flex gap-2">
                <Select value={pickProductId} onValueChange={setPickProductId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
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
                        <th className="px-4 py-2.5">Nama Produk</th>
                        <th className="px-4 py-2.5 text-center">Qty Transfer</th>
                        <th className="px-4 py-2.5 text-center">Satuan</th>
                        <th className="px-4 py-2.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lines.map((line, idx) => (
                        <tr key={line.key} className="transition-colors hover:bg-navy-50/50">
                          <td className="px-3 py-3 text-center font-mono text-content-muted font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-content">{line.product_name}</td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-navy-800">{line.qty}</td>
                          <td className="px-4 py-3 text-center font-mono text-content-muted">{line.unit_code}</td>
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
              <Button type="submit" disabled={form.processing}>Buat Transfer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveTarget !== null} onOpenChange={(open) => !open && setReceiveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terima Transfer — {receiveTarget?.reference}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-1">
            {receiveTarget?.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-xs text-content-muted">Dikirim: {item.qty_sent}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={Number(item.qty_sent)}
                  step="0.001"
                  className="w-28"
                  value={receiveQty[item.id] ?? 0}
                  onChange={(e) => setReceiveQty((prev) => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))}
                />
              </div>
            ))}
            <p className="text-xs text-content-muted">Qty diterima kurang dari dikirim otomatis dicatat sebagai hilang dalam perjalanan (write-off) di outlet asal.</p>
          </div>
          <DialogFooter>
            <Button onClick={confirmReceive}>Konfirmasi Terima</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
