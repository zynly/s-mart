import { useState, type FormEventHandler, type ReactElement } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Textarea } from '@/Components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }
type ProductRef = { id: number; name: string; sku: string }

type OpnameRow = {
  id: number
  reference: string
  opname_date: string
  scope: string
  status: string
  total_items: number
  counted_items: number
  variance_percent: string
  outlet: Ref
  starter: Ref | null
}

type OpnamesIndexProps = {
  tab: string
  opnames: Paginated<OpnameRow>
  outlets: Ref[]
  categories: Ref[]
  brands: Ref[]
  products: ProductRef[]
  filters: { status?: string }
}

const SCOPE_LABELS: Record<string, string> = { all: 'Semua Produk', category: 'Per Kategori', brand: 'Per Brand', product: 'Produk Terpilih' }
const STATUS_LABELS: Record<string, string> = {
  counting: 'Menghitung', review: 'Tinjau', approved: 'Disetujui', posted: 'Diposting', cancelled: 'Dibatalkan',
}
const STATUS_BADGE: Record<string, string> = {
  counting: 'bg-navy-600 text-white',
  review: 'bg-warning text-white',
  approved: 'bg-teal-600 text-white',
  posted: 'bg-success text-white',
  cancelled: 'bg-danger text-white',
}

export default function Index({ tab, opnames, outlets, categories, brands, products, filters }: OpnamesIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [formOpen, setFormOpen] = useState(false)

  const form = useForm({
    outlet_id: outlets[0] ? String(outlets[0].id) : '',
    scope: 'all',
    scope_ids: [] as number[],
    note: '',
  })

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.opnames.index'), { status }, { preserveState: true, replace: true })
  }

  function toggleScopeId(id: number) {
    form.setData('scope_ids', form.data.scope_ids.includes(id) ? form.data.scope_ids.filter((x) => x !== id) : [...form.data.scope_ids, id])
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()

    if (form.data.scope !== 'all' && form.data.scope_ids.length === 0) {
      toast.error('Pilih minimal satu cakupan.')
      return
    }

    form.post(route('admin.opnames.store'), {
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal memulai opname.'),
    })
  }

  const columns: ColumnDef<OpnameRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'outlet', header: 'Outlet', cell: ({ row }) => row.original.outlet.name },
    { id: 'scope', header: 'Cakupan', cell: ({ row }) => SCOPE_LABELS[row.original.scope] ?? row.original.scope },
    { id: 'progress', header: 'Progres', cell: ({ row }) => `${row.original.counted_items} dari ${row.original.total_items} item` },
    {
      id: 'variance',
      header: 'Selisih',
      cell: ({ row }) => (row.original.status === 'counting' ? '—' : `${Number(row.original.variance_percent).toFixed(2)}%`),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button asChild size="sm" variant="outline"><Link href={route('admin.opnames.show', row.original.id)}>Buka</Link></Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Stock Opname"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Stock Opname' }]}
        actions={<Button onClick={() => setFormOpen(true)}>Mulai Opname</Button>}
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
        data={opnames.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: opnames.current_page,
          perPage: opnames.per_page,
          total: opnames.total,
          onPageChange: (page) => router.get(route('admin.opnames.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mulai Opname</DialogTitle>
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
              <Label>Cakupan</Label>
              <Select value={form.data.scope} onValueChange={(v) => { form.setData('scope', v); form.setData('scope_ids', []) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.data.scope !== 'all' && (
              <div className="space-y-1.5">
                <Label>Pilih {SCOPE_LABELS[form.data.scope]}</Label>
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2">
                  {(form.data.scope === 'category' ? categories : form.data.scope === 'brand' ? brands : products).map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.data.scope_ids.includes(item.id)} onChange={() => toggleScopeId(item.id)} />
                      {item.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.processing}>Mulai Hitung</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
