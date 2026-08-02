import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { formatDate } from '@/Lib/date'
import type { Paginated } from '@/Types'

type CouponRow = {
  id: number
  code: string
  name: string
  discount_type: string
  discount_value: number
  min_purchase: number | null
  valid_from: string
  valid_until: string
  quota: number
  used_count: number
  status: string
  source: string
  member: { name: string; member_number: string } | null
  redemptions_count: number
}

type CouponsIndexProps = {
  tab: string
  coupons: Paginated<CouponRow>
  filters: { status?: string }
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  used: 'Terpakai',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success text-white',
  used: 'bg-slate-500 text-white',
  expired: 'bg-warning text-white',
  cancelled: 'bg-danger text-white',
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual', birthday: 'Ulang Tahun', loyalty: 'Loyalti', campaign: 'Kampanye',
}

export default function Index({ tab, coupons, filters }: CouponsIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [formOpen, setFormOpen] = useState(false)
  const form = useForm({
    code: '', generate_count: 1, name: '', discount_type: 'percent', discount_value: 0,
    max_discount: 0, min_purchase: 0, valid_from: '', valid_until: '', quota: 1, per_member_limit: 1,
  })

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.coupons.index'), { status }, { preserveState: true, replace: true })
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    form.post(route('admin.coupons.store'), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setFormOpen(false)
      },
    })
  }

  function cancelCoupon(coupon: CouponRow) {
    router.put(route('admin.coupons.cancel', coupon.id), {}, { preserveScroll: true })
  }

  const columns: ColumnDef<CouponRow, unknown>[] = [
    { accessorKey: 'code', header: 'Kode' },
    { accessorKey: 'name', header: 'Nama' },
    {
      id: 'discount',
      header: 'Diskon',
      cell: ({ row }) => row.original.discount_type === 'percent' ? `${row.original.discount_value}%` : <Money amount={row.original.discount_value} size="sm" />,
    },
    { id: 'usage', header: 'Pemakaian', cell: ({ row }) => `${row.original.used_count} / ${row.original.quota}` },
    { id: 'member', header: 'Personal Untuk', cell: ({ row }) => row.original.member ? `${row.original.member.name} (${row.original.member.member_number})` : 'Umum' },
    { id: 'source', header: 'Sumber', cell: ({ row }) => SOURCE_LABELS[row.original.source] ?? row.original.source },
    { id: 'valid', header: 'Berlaku Sampai', cell: ({ row }) => formatDate(row.original.valid_until) },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => row.original.status === 'active' ? (
        <Button size="sm" variant="outline" className="text-danger" onClick={() => cancelCoupon(row.original)}>Batalkan</Button>
      ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Kupon"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Kupon' }]}
        actions={<Button onClick={() => setFormOpen(true)}>Buat Kupon</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'promos', label: 'Promo', href: route('admin.promos.index'), permission: 'promo.view' },
        { key: 'coupons', label: 'Kupon', href: route('admin.coupons.index'), permission: 'coupon.view' },
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
        data={coupons.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: coupons.current_page,
          perPage: coupons.per_page,
          total: coupons.total,
          onPageChange: (page) => router.get(route('admin.coupons.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Kupon</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode (kosongkan bila generate massal)</Label>
                <Input value={form.data.code} onChange={(e) => form.setData('code', e.target.value.toUpperCase())} disabled={form.data.generate_count > 1} />
                {form.errors.code && <p className="text-sm text-danger">{form.errors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah Kupon (generate massal)</Label>
                <Input type="number" min={1} value={form.data.generate_count} onChange={(e) => form.setData('generate_count', Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
              {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jenis Diskon</Label>
                <Select value={form.data.discount_type} onValueChange={(v) => form.setData('discount_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Persen</SelectItem>
                    <SelectItem value="amount">Nominal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nilai Diskon</Label>
                <Input type="number" value={form.data.discount_value} onChange={(e) => form.setData('discount_value', Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Maks. Diskon (opsional)</Label>
                <MoneyInput value={form.data.max_discount} onChange={(v) => form.setData('max_discount', v)} />
              </div>
              <div className="space-y-1.5">
                <Label>Minimal Belanja (opsional)</Label>
                <MoneyInput value={form.data.min_purchase} onChange={(v) => form.setData('min_purchase', v)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Berlaku Dari</Label>
                <Input type="datetime-local" value={form.data.valid_from} onChange={(e) => form.setData('valid_from', e.target.value)} />
                {form.errors.valid_from && <p className="text-sm text-danger">{form.errors.valid_from}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Berlaku Sampai</Label>
                <Input type="datetime-local" value={form.data.valid_until} onChange={(e) => form.setData('valid_until', e.target.value)} />
                {form.errors.valid_until && <p className="text-sm text-danger">{form.errors.valid_until}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kuota per Kode</Label>
                <Input type="number" min={1} value={form.data.quota} onChange={(e) => form.setData('quota', Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Batas per Anggota</Label>
                <Input type="number" min={1} value={form.data.per_member_limit} onChange={(e) => form.setData('per_member_limit', Number(e.target.value))} />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.processing}>Buat Kupon</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
