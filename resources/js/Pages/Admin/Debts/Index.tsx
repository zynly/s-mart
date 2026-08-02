import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { StatCard } from '@/Components/common/StatCard'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { AGING_BUCKETS, AGING_BUCKET_LABELS } from '@/Lib/aging'
import { formatDate } from '@/Lib/date'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }

type DebtRow = {
  id: number
  reference: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  due_date: string
  status: string
  supplier: Ref
  purchase: { id: number; reference: string }
}

type DebtsIndexProps = {
  tab: string
  debts: Paginated<DebtRow>
  aging: { debt: DebtRow; bucket: string }[]
  paymentMethods: Ref[]
  filters: { status?: string; supplier_id?: string }
}

const STATUS_LABELS: Record<string, string> = {
  unpaid: 'Belum Bayar',
  partial: 'Sebagian',
  paid: 'Lunas',
  overdue: 'Jatuh Tempo',
}

const STATUS_BADGE: Record<string, string> = {
  unpaid: 'bg-slate-500 text-white',
  partial: 'bg-warning text-white',
  paid: 'bg-success text-white',
  overdue: 'bg-danger text-white',
}

export default function Index({ tab, debts, aging, paymentMethods, filters }: DebtsIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [payTarget, setPayTarget] = useState<DebtRow | null>(null)
  const form = useForm({ amount: 0, payment_method_id: '', ref_no: '', note: '' })

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.debts.index'), { status }, { preserveState: true, replace: true })
  }

  const agingSummary = aging.reduce<Record<string, number>>((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] ?? 0) + row.debt.remaining_amount
    return acc
  }, {})

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    if (!payTarget) return

    form.post(route('admin.debts.pay', payTarget.id), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setPayTarget(null)
      },
    })
  }

  const columns: ColumnDef<DebtRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'supplier', header: 'Supplier', cell: ({ row }) => row.original.supplier.name },
    { id: 'purchase', header: 'Pembelian', cell: ({ row }) => row.original.purchase.reference },
    { id: 'due', header: 'Jatuh Tempo', cell: ({ row }) => formatDate(row.original.due_date) },
    { id: 'total', header: 'Total', cell: ({ row }) => <Money amount={row.original.total_amount} /> },
    { id: 'remaining', header: 'Sisa', cell: ({ row }) => <Money amount={row.original.remaining_amount} /> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status !== 'paid' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPayTarget(row.original)
              form.setData('amount', row.original.remaining_amount)
            }}
          >
            Bayar
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Hutang" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Hutang' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'debts', label: 'Hutang', href: route('admin.debts.index'), permission: 'debt.view' },
        { key: 'receivables', label: 'Piutang', href: route('admin.receivables.index'), permission: 'receivable.view' },
      ]} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {AGING_BUCKETS.map((bucket) => (
          <StatCard key={bucket} label={AGING_BUCKET_LABELS[bucket]} value={new Intl.NumberFormat('id-ID').format(agingSummary[bucket] ?? 0)} />
        ))}
      </div>

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
        data={debts.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: debts.current_page,
          perPage: debts.per_page,
          total: debts.total,
          onPageChange: (page) => router.get(route('admin.debts.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={payTarget !== null} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bayar Hutang — {payTarget?.reference}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Nominal (sisa: {payTarget && <Money amount={payTarget.remaining_amount} size="sm" />})</Label>
              <MoneyInput value={form.data.amount} onChange={(v) => form.setData('amount', v)} />
              {form.errors.amount && <p className="text-sm text-danger">{form.errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Metode Bayar</Label>
              <Select value={form.data.payment_method_id} onValueChange={(v) => form.setData('payment_method_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>No. Referensi (opsional)</Label>
              <Input value={form.data.ref_no} onChange={(e) => form.setData('ref_no', e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.processing}>Simpan Pembayaran</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
