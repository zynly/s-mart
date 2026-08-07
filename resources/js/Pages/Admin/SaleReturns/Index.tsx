import { useState, type ReactElement } from 'react'
import { Link, router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Check } from 'lucide-react'
import { cn } from '@/Lib/utils'
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
  tab: string
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

export default function Index({ tab, returns, filters }: SaleReturnsIndexProps) {
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
      <PageTabs current={tab} tabs={[
        { key: 'sale-returns', label: 'Retur Penjualan', href: route('admin.sale-returns.index'), permission: 'sale_return.view' },
        { key: 'write-offs', label: 'Write-Off', href: route('admin.write-offs.index'), permission: 'adjustment.view' },
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
