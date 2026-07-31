import { useState, type ReactElement } from 'react'
import { Link, router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }

type SaleReturnRow = {
  id: number
  reference: string
  return_date: string
  type: string
  reason: string
  total: number
  total_cost: number
  status: string
  origin_session_closed: boolean
  sale: { reference: string }
  member: { name: string; member_number: string } | null
  creator: Ref | null
}

type SaleReturnsIndexProps = {
  returns: Paginated<SaleReturnRow>
  filters: { status?: string }
}

const REASON_LABELS: Record<string, string> = {
  damaged: 'Rusak', wrong_item: 'Salah Barang', expired: 'Kedaluwarsa',
  customer_request: 'Permintaan Pembeli', other: 'Lainnya',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draf', approved: 'Disetujui', completed: 'Selesai', rejected: 'Ditolak',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-warning text-white',
  approved: 'bg-navy-600 text-white',
  completed: 'bg-success text-white',
  rejected: 'bg-danger text-white',
}

export default function Index({ returns, filters }: SaleReturnsIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.sale-returns.index'), { status }, { preserveState: true, replace: true })
  }

  const columns: ColumnDef<SaleReturnRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'sale', header: 'Nota Asal', cell: ({ row }) => row.original.sale.reference },
    { id: 'date', header: 'Tanggal', cell: ({ row }) => new Date(row.original.return_date).toLocaleString('id-ID') },
    { id: 'member', header: 'Anggota', cell: ({ row }) => row.original.member ? `${row.original.member.name} (${row.original.member.member_number})` : 'Umum' },
    { id: 'reason', header: 'Alasan', cell: ({ row }) => REASON_LABELS[row.original.reason] ?? row.original.reason },
    { id: 'total', header: 'Total', cell: ({ row }) => <Money amount={row.original.total} size="sm" /> },
    {
      id: 'session',
      header: 'Sesi Asal',
      cell: ({ row }) => row.original.origin_session_closed
        ? <Badge className="bg-warning text-white">Tertutup (ADR-0007)</Badge>
        : <Badge variant="outline">Terbuka</Badge>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    { id: 'creator', header: 'Diproses Oleh', cell: ({ row }) => row.original.creator?.name ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Retur Penjualan"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Retur Penjualan' }]}
        actions={<Button asChild><Link href={route('admin.sale-returns.create')}>Buat Retur</Link></Button>}
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
        data={returns.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: returns.current_page,
          perPage: returns.per_page,
          total: returns.total,
          onPageChange: (page) => router.get(route('admin.sale-returns.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
