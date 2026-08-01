import { useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Textarea } from '@/Components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import type { Paginated } from '@/Types'

type TopupRequestRow = {
  id: number
  reference: string
  amount: number
  bank_name: string | null
  sender_name: string | null
  transfer_date: string | null
  proof_image: string | null
  status: string
  created_at: string
  member: { id: number; name: string; member_number: string } | null
  guardian: { id: number; name: string; phone: string } | null
  verifier: { id: number; name: string } | null
}

type TopupRequestsIndexProps = {
  tab: string
  topupRequests: Paginated<TopupRequestRow>
  filters: { status?: string }
}

const STATUS_LABELS: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }
const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-warning text-white',
  approved: 'bg-success text-white',
  rejected: 'bg-danger text-white',
}

export default function Index({ tab, topupRequests, filters }: TopupRequestsIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [rejectTarget, setRejectTarget] = useState<TopupRequestRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.topup-requests.index'), { status }, { preserveState: true, replace: true })
  }

  function approve(row: TopupRequestRow) {
    router.put(route('admin.topup-requests.approve', row.id))
  }

  function submitReject() {
    if (!rejectTarget) return

    router.put(route('admin.topup-requests.reject', rejectTarget.id), { reject_reason: rejectReason }, {
      onSuccess: () => {
        setRejectTarget(null)
        setRejectReason('')
      },
    })
  }

  const columns: ColumnDef<TopupRequestRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'member', header: 'Anak', cell: ({ row }) => row.original.member?.name ?? '—' },
    { id: 'guardian', header: 'Wali', cell: ({ row }) => row.original.guardian?.name ?? '—' },
    { id: 'amount', header: 'Nominal', cell: ({ row }) => <Money amount={row.original.amount} /> },
    { id: 'bank', header: 'Bank / Pengirim', cell: ({ row }) => `${row.original.bank_name ?? '—'} / ${row.original.sender_name ?? '—'}` },
    {
      id: 'proof',
      header: 'Bukti',
      cell: ({ row }) => row.original.proof_image
        ? <a href={`/storage/${row.original.proof_image}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">Lihat</a>
        : '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => row.original.status === 'pending' ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => approve(row.original)}>Setujui</Button>
          <Button size="sm" variant="outline" onClick={() => setRejectTarget(row.original)}>Tolak</Button>
        </div>
      ) : (
        <span className="text-xs text-content-muted">{row.original.verifier?.name}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Verifikasi Top-Up Wali" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Verifikasi Top-Up Wali' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'deposit', label: 'Deposit', href: route('admin.deposit.index'), permission: 'deposit.view' },
        { key: 'topup-requests', label: 'Verifikasi Top-Up Wali', href: route('admin.topup-requests.index'), permission: 'topup.view' },
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
        data={topupRequests.data}
        getRowId={(row) => String(row.id)}
        emptyDescription="Belum ada pengajuan top-up dari wali."
        pagination={{
          page: topupRequests.current_page,
          perPage: topupRequests.per_page,
          total: topupRequests.total,
          onPageChange: (page) => router.get(route('admin.topup-requests.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Top-Up — {rejectTarget?.reference}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Alasan penolakan" />
          </div>
          <DialogFooter>
            <Button onClick={submitReject} disabled={!rejectReason.trim()}>Tolak Pengajuan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
