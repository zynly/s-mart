import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { StatCard } from '@/Components/common/StatCard'
import { ConfirmDialog } from '@/Components/common/ConfirmDialog'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import type { PageProps, Paginated } from '@/Types'

type Ref = { id: number; name: string }

type ReceivableRow = {
  id: number
  reference: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  due_date: string
  status: string
  member: { id: number; name: string; member_number: string }
  sale: { id: number; reference: string }
}

type ReceivablesIndexProps = {
  receivables: Paginated<ReceivableRow>
  aging: { receivable: ReceivableRow; bucket: string }[]
  cashAccounts: Ref[]
  filters: { status?: string; member_id?: string }
}

const STATUS_LABELS: Record<string, string> = {
  unpaid: 'Belum Bayar',
  partial: 'Sebagian',
  paid: 'Lunas',
  overdue: 'Jatuh Tempo',
  written_off: 'Dihapus',
}

const STATUS_BADGE: Record<string, string> = {
  unpaid: 'bg-slate-500 text-white',
  partial: 'bg-warning text-white',
  paid: 'bg-success text-white',
  overdue: 'bg-danger text-white',
  written_off: 'bg-slate-400 text-white',
}

const BUCKET_LABELS: Record<string, string> = {
  current: 'Belum Jatuh Tempo',
  '0-30': '0–30 Hari',
  '31-60': '31–60 Hari',
  '61-90': '61–90 Hari',
  '90+': '> 90 Hari',
}

export default function Index({ receivables, aging, cashAccounts, filters }: ReceivablesIndexProps) {
  const { auth } = usePage<PageProps>().props
  const canWriteOff = auth.user?.permissions?.includes('receivable.delete') ?? false

  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [payTarget, setPayTarget] = useState<ReceivableRow | null>(null)
  const [writeOffTarget, setWriteOffTarget] = useState<ReceivableRow | null>(null)
  const form = useForm({ amount: 0, payment_method: 'cash', cash_account_id: '', note: '' })

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.receivables.index'), { status }, { preserveState: true, replace: true })
  }

  const agingSummary = aging.reduce<Record<string, number>>((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] ?? 0) + row.receivable.remaining_amount
    return acc
  }, {})

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    if (!payTarget) return

    form.post(route('admin.receivables.pay', payTarget.id), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setPayTarget(null)
      },
    })
  }

  function confirmWriteOff() {
    if (!writeOffTarget) return

    router.delete(route('admin.receivables.write-off', writeOffTarget.id), {
      preserveScroll: true,
      onSuccess: () => setWriteOffTarget(null),
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal menghapus piutang.'),
    })
  }

  const columns: ColumnDef<ReceivableRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'member', header: 'Anggota', cell: ({ row }) => `${row.original.member.name} (${row.original.member.member_number})` },
    { id: 'sale', header: 'Nota', cell: ({ row }) => row.original.sale?.reference ?? '—' },
    { id: 'due', header: 'Jatuh Tempo', cell: ({ row }) => new Date(row.original.due_date).toLocaleDateString('id-ID') },
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
        row.original.status !== 'paid' && row.original.status !== 'written_off' ? (
          <div className="flex justify-end gap-2">
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
            {canWriteOff && (
              <Button size="sm" variant="outline" className="text-danger" onClick={() => setWriteOffTarget(row.original)}>
                Hapus Piutang
              </Button>
            )}
          </div>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Piutang Anggota" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Piutang' }]} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(['current', '0-30', '31-60', '61-90', '90+'] as const).map((bucket) => (
          <StatCard key={bucket} label={BUCKET_LABELS[bucket] ?? bucket} value={new Intl.NumberFormat('id-ID').format(agingSummary[bucket] ?? 0)} />
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
        data={receivables.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: receivables.current_page,
          perPage: receivables.per_page,
          total: receivables.total,
          onPageChange: (page) => router.get(route('admin.receivables.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={payTarget !== null} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bayar Piutang — {payTarget?.reference}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Nominal (sisa: {payTarget && <Money amount={payTarget.remaining_amount} size="sm" />})</Label>
              <MoneyInput value={form.data.amount} onChange={(v) => form.setData('amount', v)} />
              {form.errors.amount && <p className="text-sm text-danger">{form.errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Metode Bayar</Label>
              <Select value={form.data.payment_method} onValueChange={(v) => form.setData('payment_method', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Akun Kas (opsional)</Label>
              <Select value={form.data.cash_account_id} onValueChange={(v) => form.setData('cash_account_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun kas" />
                </SelectTrigger>
                <SelectContent>
                  {cashAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.processing}>Simpan Pembayaran</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={writeOffTarget !== null}
        onOpenChange={(open) => !open && setWriteOffTarget(null)}
        title="Hapus Piutang"
        description={`Piutang ${writeOffTarget?.reference} sebesar Rp ${writeOffTarget?.remaining_amount.toLocaleString('id-ID')} akan dihapus permanen (write-off) dan dianggap tidak tertagih. Tindakan ini hanya untuk piutang yang sudah lewat jatuh tempo lebih dari 90 hari.`}
        confirmLabel="Ya, Hapus Piutang"
        variant="destructive"
        onConfirm={confirmWriteOff}
      />
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
