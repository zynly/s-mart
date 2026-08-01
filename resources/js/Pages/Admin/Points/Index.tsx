import { useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import type { Paginated } from '@/Types'

type MemberRef = { id: number; name: string; member_number: string; point_balance: number }

type PointTransactionRow = {
  id: number
  type: string
  points: number
  balance_before: number
  balance_after: number
  expired_at: string | null
  note: string | null
  created_at: string
  member: MemberRef
  sale: { reference: string } | null
}

type PointsIndexProps = {
  tab: string
  transactions: Paginated<PointTransactionRow>
  members: MemberRef[]
  filters: { member_id?: string; type?: string }
}

const TYPE_LABELS: Record<string, string> = {
  earn: 'Perolehan', redeem: 'Penukaran', expired: 'Kedaluwarsa', adjustment: 'Penyesuaian', bonus: 'Bonus',
}

const TYPE_BADGE: Record<string, string> = {
  earn: 'bg-success text-white',
  redeem: 'bg-navy-600 text-white',
  expired: 'bg-warning text-white',
  adjustment: 'bg-slate-500 text-white',
  bonus: 'bg-teal text-white',
}

export default function Index({ tab, transactions, members, filters }: PointsIndexProps) {
  const [memberFilter, setMemberFilter] = useState(filters.member_id ?? '')
  const [typeFilter, setTypeFilter] = useState(filters.type ?? '')

  function applyFilters(next: { member_id?: string; type?: string }) {
    const merged = { member_id: memberFilter, type: typeFilter, ...next }
    router.get(route('admin.points.index'), merged, { preserveState: true, replace: true })
  }

  const columns: ColumnDef<PointTransactionRow, unknown>[] = [
    { id: 'date', header: 'Tanggal', cell: ({ row }) => new Date(row.original.created_at).toLocaleString('id-ID') },
    { id: 'member', header: 'Anggota', cell: ({ row }) => `${row.original.member.name} (${row.original.member.member_number})` },
    {
      id: 'type',
      header: 'Tipe',
      cell: ({ row }) => <Badge className={TYPE_BADGE[row.original.type] ?? ''}>{TYPE_LABELS[row.original.type] ?? row.original.type}</Badge>,
    },
    {
      id: 'points',
      header: 'Poin',
      cell: ({ row }) => (
        <span className={row.original.points < 0 ? 'text-danger' : 'text-success'}>
          {row.original.points > 0 ? '+' : ''}{row.original.points}
        </span>
      ),
    },
    { id: 'balance', header: 'Saldo Poin', cell: ({ row }) => row.original.balance_after },
    { id: 'sale', header: 'Nota', cell: ({ row }) => row.original.sale?.reference ?? '—' },
    { id: 'note', header: 'Catatan', cell: ({ row }) => row.original.note ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Poin Reward" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Poin' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'members', label: 'Anggota', href: route('admin.members.index'), permission: 'member.view' },
        { key: 'points', label: 'Poin', href: route('admin.points.index'), permission: 'member.view' },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Select
          value={memberFilter || 'all'}
          onValueChange={(v) => {
            const next = v === 'all' ? '' : v
            setMemberFilter(next)
            applyFilters({ member_id: next })
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Semua anggota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua anggota</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.point_balance} poin)</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter || 'all'}
          onValueChange={(v) => {
            const next = v === 'all' ? '' : v
            setTypeFilter(next)
            applyFilters({ type: next })
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tipe</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={transactions.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: transactions.current_page,
          perPage: transactions.per_page,
          total: transactions.total,
          onPageChange: (page) => router.get(route('admin.points.index'), { member_id: memberFilter, type: typeFilter, page }, { preserveState: true }),
        }}
      />
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
