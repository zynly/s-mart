import { useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { Sliders, AlertTriangle, Sparkles } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
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

  // Dialog Penyesuaian Poin Individu
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [newPoints, setNewPoints] = useState(0)
  const [adjustNote, setAdjustNote] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Dialog Reset Poin Massal
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkNote, setBulkNote] = useState('Pembersihan Poin Akhir Periode')
  const [bulkConfirmText, setBulkConfirmText] = useState('')
  const [bulking, setBulking] = useState(false)

  function applyFilters(next: { member_id?: string; type?: string }) {
    const merged = { member_id: memberFilter, type: typeFilter, ...next }
    router.get(route('admin.points.index'), merged, { preserveState: true, replace: true })
  }

  function handleAdjustSubmit() {
    if (!selectedMemberId) return
    setAdjusting(true)
    router.post(
      route('admin.points.adjust'),
      { member_id: selectedMemberId, points: newPoints, note: adjustNote },
      {
        preserveScroll: true,
        onSuccess: () => {
          setAdjustModalOpen(false)
          setSelectedMemberId('')
          setNewPoints(0)
          setAdjustNote('')
        },
        onFinish: () => setAdjusting(false),
      }
    )
  }

  function handleBulkResetSubmit() {
    if (bulkConfirmText !== 'RESET SEMUA POIN') return
    setBulking(true)
    router.post(
      route('admin.points.bulk-reset'),
      { note: bulkNote },
      {
        preserveScroll: true,
        onSuccess: () => {
          setBulkModalOpen(false)
          setBulkConfirmText('')
        },
        onFinish: () => setBulking(false),
      }
    )
  }

  const selectedMember = members.find((m) => String(m.id) === selectedMemberId)

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
        <span className={row.original.points < 0 ? 'text-danger font-mono font-bold' : 'text-success font-mono font-bold'}>
          {row.original.points > 0 ? '+' : ''}{row.original.points}
        </span>
      ),
    },
    { id: 'balance', header: 'Saldo Poin', cell: ({ row }) => <span className="font-mono font-bold">{row.original.balance_after}</span> },
    { id: 'sale', header: 'Nota', cell: ({ row }) => row.original.sale?.reference ?? '—' },
    { id: 'note', header: 'Catatan', cell: ({ row }) => row.original.note ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Poin Reward"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Poin' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setAdjustModalOpen(true)
                setSelectedMemberId('')
                setNewPoints(0)
                setAdjustNote('')
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs h-9 shadow-sm"
            >
              <Sliders className="size-3.5" />
              Sesuaikan Poin
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setBulkModalOpen(true)
                setBulkConfirmText('')
              }}
              className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 text-xs h-9 font-bold gap-1.5"
            >
              <AlertTriangle className="size-3.5 text-rose-600" />
              Reset Poin Massal
            </Button>
          </div>
        }
      />
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

      {/* Modal Penyesuaian Poin Individu */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-600" />
              Penyesuaian Saldo Poin Anggota
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Pilih Anggota</Label>
              <Select
                value={selectedMemberId}
                onValueChange={(val) => {
                  setSelectedMemberId(val)
                  const target = members.find((m) => String(m.id) === val)
                  if (target) setNewPoints(target.point_balance)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih anggota..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} ({m.member_number}) — Saldo: {m.point_balance} poin
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMember && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800 text-xs">
                <p className="text-emerald-900 dark:text-emerald-200">
                  Saldo Saat Ini: <span className="font-bold font-mono text-sm">{selectedMember.point_balance} Poin</span>
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Saldo Poin Baru</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={newPoints}
                  onChange={(e) => setNewPoints(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono text-base font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPoints(0)}
                  className="shrink-0 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Set ke 0
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan / Alasan (Opsional)</Label>
              <Input
                placeholder="Misal: Penyesuaian prestasi, koreksi manual..."
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>Batal</Button>
            <Button
              disabled={!selectedMemberId || adjusting}
              onClick={handleAdjustSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {adjusting ? 'Menyimpan…' : 'Simpan Penyesuaian'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reset Poin Massal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="size-5" />
              Reset Poin Seluruh Anggota (Massal)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3.5 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
              <p className="font-bold">⚠️ PERHATIAN:</p>
              <p>
                Tindakan ini akan mengosongkan (reset ke 0) saldo poin dari <strong>seluruh anggota aktif</strong>. Riwayat transaksi akan dicatat sebagai <em>expired/reset period</em>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Keterangan Periode</Label>
              <Input
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Misal: Pembersihan Poin Akhir Semester 2025/2026"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">
                Ketik <strong className="text-rose-600 select-all">RESET SEMUA POIN</strong> untuk konfirmasi:
              </Label>
              <Input
                value={bulkConfirmText}
                onChange={(e) => setBulkConfirmText(e.target.value)}
                placeholder="RESET SEMUA POIN"
                className="font-mono font-bold border-rose-300 focus:border-rose-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkModalOpen(false)}>Batal</Button>
            <Button
              disabled={bulkConfirmText !== 'RESET SEMUA POIN' || bulking}
              onClick={handleBulkResetSubmit}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {bulking ? 'Memproses…' : 'Eksekusi Reset Massal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
