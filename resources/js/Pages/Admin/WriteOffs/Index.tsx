import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
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

type WriteOffRow = {
  id: number
  reference: string
  qty: string
  unit_cost: number
  total_cost: number
  type: string
  reason: string
  status: string
  product: Ref
  outlet: Ref
  requester: Ref | null
  approver: Ref | null
}

type WriteOffsIndexProps = {
  writeOffs: Paginated<WriteOffRow>
  products: Ref[]
  outlets: Ref[]
  filters: { status?: string }
}

const TYPE_LABELS: Record<string, string> = {
  damaged: 'Rusak', lost: 'Hilang', expired: 'Kedaluwarsa', shrinkage: 'Susut',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Menunggu', approved: 'Disetujui', completed: 'Selesai', rejected: 'Ditolak',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-warning text-white',
  approved: 'bg-navy-600 text-white',
  completed: 'bg-success text-white',
  rejected: 'bg-danger text-white',
}

export default function Index({ writeOffs, products, outlets, filters }: WriteOffsIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [formOpen, setFormOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<WriteOffRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const form = useForm({ outlet_id: '', product_id: '', stock_layer_id: '', qty: 0, type: 'damaged', reason: '' })

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.write-offs.index'), { status }, { preserveState: true, replace: true })
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    form.post(route('admin.write-offs.store'), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setFormOpen(false)
      },
    })
  }

  function approveWriteOff(row: WriteOffRow) {
    router.put(route('admin.write-offs.approve', row.id), {}, {
      preserveScroll: true,
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal menyetujui write-off.'),
    })
  }

  function processWriteOff(row: WriteOffRow) {
    router.put(route('admin.write-offs.process', row.id), {}, {
      preserveScroll: true,
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal memproses write-off.'),
    })
  }

  function confirmReject() {
    if (!rejectTarget) return

    router.put(route('admin.write-offs.reject', rejectTarget.id), { reason: rejectReason }, {
      preserveScroll: true,
      onSuccess: () => {
        setRejectTarget(null)
        setRejectReason('')
      },
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal menolak write-off.'),
    })
  }

  const columns: ColumnDef<WriteOffRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'product', header: 'Produk', cell: ({ row }) => row.original.product.name },
    { id: 'outlet', header: 'Outlet', cell: ({ row }) => row.original.outlet.name },
    { accessorKey: 'qty', header: 'Qty' },
    { id: 'total_cost', header: 'Total HPP', cell: ({ row }) => <Money amount={row.original.total_cost} size="sm" /> },
    { id: 'type', header: 'Tipe', cell: ({ row }) => TYPE_LABELS[row.original.type] ?? row.original.type },
    { accessorKey: 'reason', header: 'Alasan' },
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
          return (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => approveWriteOff(row.original)}>Setujui</Button>
              <Button size="sm" variant="outline" className="text-danger" onClick={() => setRejectTarget(row.original)}>Tolak</Button>
            </div>
          )
        }

        if (row.original.status === 'approved') {
          return <Button size="sm" variant="outline" onClick={() => processWriteOff(row.original)}>Proses</Button>
        }

        return null
      },
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Write-Off Stok"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Write-Off' }]}
        actions={<Button onClick={() => setFormOpen(true)}>Ajukan Write-Off</Button>}
      />

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
        data={writeOffs.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: writeOffs.current_page,
          perPage: writeOffs.per_page,
          total: writeOffs.total,
          onPageChange: (page) => router.get(route('admin.write-offs.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Write-Off</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Outlet</Label>
              <Select value={form.data.outlet_id} onValueChange={(v) => form.setData('outlet_id', v)}>
                <SelectTrigger><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Produk</Label>
              <Select value={form.data.product_id} onValueChange={(v) => form.setData('product_id', v)}>
                <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Qty</Label>
                <Input type="number" step="0.001" value={form.data.qty} onChange={(e) => form.setData('qty', Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
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
            <DialogFooter>
              <Button type="submit" disabled={form.processing}>Ajukan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Write-Off — {rejectTarget?.reference}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Alasan Penolakan</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmReject} disabled={rejectReason.trim() === ''}>Tolak Pengajuan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
