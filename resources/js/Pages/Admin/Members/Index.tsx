import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Printer, CreditCard, Pencil, RefreshCw, KeyRound, Lock, UserX, Wallet, Coins, Users, CheckCircle2, GraduationCap, Search, Filter, RotateCcw } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { ConfirmDialog } from '@/Components/common/ConfirmDialog'
import { PinInput } from '@/Components/common/PinInput'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { AppSheet } from '@/Components/common/AppSheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
import { MemberTransactionsSheet } from '@/Components/members/MemberTransactionsSheet'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }
type Level = { id: number; name: string; color?: string | null }
type ActiveCard = { id: number; card_number: string; status: string } | null

type GuardianRow = { id: number; name: string; phone: string; is_active: boolean; pivot: { is_primary: boolean } }

type MemberRow = {
  id: number
  member_number: string
  name: string
  nis: string | null
  type: 'santri' | 'fasilitator' | 'staff' | 'public'
  class_name: string | null
  major: string | null
  entry_year: number | null
  gender: 'L' | 'P' | null
  birth_date: string | null
  phone: string | null
  address: string | null
  guardian_name: string | null
  guardian_phone: string | null
  guardian_relation: string | null
  daily_limit: number | null
  weekly_limit: number | null
  blocked_categories: number[] | null
  joined_at: string | null
  level: Level | null
  status: string
  balance_cache: number
  point_balance: number
  receivable_limit: number
  active_card: ActiveCard
  guardians: GuardianRow[]
}

export type MemberStats = {
  total_members: number
  total_santri: number
  total_fasilitator: number
  total_staff: number
  total_deposit: number
  total_points: number
  active_members: number
}

type MembersIndexProps = {
  tab: string
  members: Paginated<MemberRow>
  stats?: MemberStats
  levels: Level[]
  categories: Ref[]
  filters: { search?: string; type?: string; status?: string; class_name?: string }
}

const TYPE_LABELS: Record<MemberRow['type'], string> = {
  santri: 'Santri',
  fasilitator: 'Fasilitator',
  staff: 'Staf',
  public: 'Umum',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success text-white',
  inactive: 'bg-slate-500 text-white',
  suspended: 'bg-warning text-white',
  graduated: 'bg-teal text-white',
  transferred: 'bg-slate-500 text-white',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  suspended: 'Suspend',
  graduated: 'Lulus',
  transferred: 'Pindah',
}

const emptyForm = {
  name: '',
  nis: '',
  member_level_id: '',
  type: 'santri' as MemberRow['type'],
  class_name: '',
  major: '',
  entry_year: new Date().getFullYear(),
  gender: '',
  birth_date: '',
  phone: '',
  address: '',
  guardian_name: '',
  guardian_phone: '',
  guardian_relation: '',
  receivable_limit: 0,
  daily_limit: null as number | null,
  weekly_limit: null as number | null,
  blocked_categories: [] as number[],
  status: 'active',
  joined_at: '',
}

export default function Index({ tab, members, stats, levels, categories, filters }: MembersIndexProps) {
  const [search, setSearch] = useState(filters.search ?? '')
  const [typeFilter, setTypeFilter] = useState(filters.type ?? '')
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sampleCardOpen, setSampleCardOpen] = useState(false)
  const [editing, setEditing] = useState<MemberRow | null>(null)
  const [resetPinTarget, setResetPinTarget] = useState<MemberRow | null>(null)
  const [setPinTarget, setSetPinTarget] = useState<MemberRow | null>(null)
  const [newPin, setNewPin] = useState('')
  const [setPinError, setSetPinError] = useState<string | null>(null)
  const [settingPin, setSettingPin] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<MemberRow | null>(null)
  const [reissueTarget, setReissueTarget] = useState<MemberRow | null>(null)
  const [reissueReason, setReissueReason] = useState('')
  const [newGuardian, setNewGuardian] = useState({ name: '', phone: '', relation: '', is_primary: false })
  const [pdfModal, setPdfModal] = useState<{ open: boolean; title: string; url: string }>({ open: false, title: '', url: '' })
  const [adjustPointTarget, setAdjustPointTarget] = useState<MemberRow | null>(null)
  const [pointAdjustmentValue, setPointAdjustmentValue] = useState(0)
  const [pointAdjustmentNote, setPointAdjustmentNote] = useState('')
  const [adjustingPoint, setAdjustingPoint] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<MemberRow | null>(null)
  const form = useForm(emptyForm)

  function applyFilter() {
    router.get(
      route('admin.members.index'),
      {
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      },
      { preserveState: true }
    )
  }

  function resetFilter() {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    router.get(route('admin.members.index'), {}, { preserveState: true })
  }

  const isFiltered = Boolean(search || (typeFilter && typeFilter !== 'all') || (statusFilter && statusFilter !== 'all'))

  function openCardPreview(memberId: number, memberName: string) {
    const url = route('admin.members.preview-card', memberId)
    setPdfModal({
      open: true,
      url,
      title: `Kartu Anggota — ${memberName}`,
    })
  }

  function printCards(ids: number[]) {
    const url = route('admin.members.print-cards', { ids })
    window.open(url, '_blank')
  }

  function openCreate() {
    setEditing(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: MemberRow) {
    setEditing(row)
    form.setData({
      name: row.name,
      nis: row.nis ?? '',
      member_level_id: row.level ? String(row.level.id) : '',
      type: row.type,
      class_name: row.class_name ?? '',
      major: row.major ?? '',
      entry_year: row.entry_year ?? new Date().getFullYear(),
      gender: row.gender ?? '',
      birth_date: row.birth_date ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
      guardian_name: row.guardian_name ?? '',
      guardian_phone: row.guardian_phone ?? '',
      guardian_relation: row.guardian_relation ?? '',
      receivable_limit: row.receivable_limit,
      daily_limit: row.daily_limit,
      weekly_limit: row.weekly_limit,
      blocked_categories: row.blocked_categories ?? [],
      status: row.status,
      joined_at: row.joined_at ?? '',
    })
    form.clearErrors()
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    if (editing) {
      form.put(route('admin.members.update', editing.id), {
        onSuccess: () => setSheetOpen(false),
      })
    } else {
      form.post(route('admin.members.store'), {
        onSuccess: () => setSheetOpen(false),
      })
    }
  }

  function toggleBlockedCategory(categoryId: number, blocked: boolean) {
    const current = form.data.blocked_categories
    if (blocked) {
      form.setData('blocked_categories', [...current, categoryId])
    } else {
      form.setData('blocked_categories', current.filter((id) => id !== categoryId))
    }
  }

  function addGuardian() {
    if (!editing || !newGuardian.name.trim() || !newGuardian.phone.trim()) return
    router.post(
      route('admin.members.guardians.store', editing.id),
      newGuardian,
      {
        preserveScroll: true,
        onSuccess: () => setNewGuardian({ name: '', phone: '', relation: '', is_primary: false }),
      }
    )
  }

  function unlinkGuardian(guardianId: number) {
    if (!editing) return
    router.delete(route('admin.members.guardians.destroy', [editing.id, guardianId]), { preserveScroll: true })
  }

  function toggleGuardianActive(guardianId: number) {
    router.put(route('admin.guardians.toggle-active', guardianId), {}, { preserveScroll: true })
  }

  function resetGuardianPassword(guardianId: number) {
    router.put(route('admin.guardians.reset-password', guardianId), {}, { preserveScroll: true })
  }

  const columns: ColumnDef<MemberRow>[] = [
    {
      accessorKey: 'member_number',
      header: 'No. Anggota',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-semibold text-content">{row.original.member_number}</span>
          {row.original.active_card ? (
            <span className="text-[10px] text-content-muted">Kartu: {row.original.active_card.card_number}</span>
          ) : (
            <span className="text-[10px] text-warning">Belum ada kartu</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nama',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-content">{row.original.name}</span>
          {row.original.nis && <span className="text-xs text-content-muted">NIS: {row.original.nis}</span>}
          {row.original.phone && <span className="text-xs text-content-muted">{row.original.phone}</span>}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Tipe',
      cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type] ?? row.original.type}</Badge>,
    },
    {
      id: 'class',
      header: 'Kelas/Jurusan',
      cell: ({ row }) => {
        const m = row.original
        if (m.type !== 'santri') return <span className="text-content-muted">—</span>
        return (
          <span className="text-xs text-content">
            {[m.class_name, m.major].filter(Boolean).join(' · ') || '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'level',
      header: 'Level',
      cell: ({ row }) => row.original.level?.name ?? <span className="text-content-muted">—</span>,
    },
    {
      accessorKey: 'balance_cache',
      header: 'Saldo',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
          <Money amount={row.original.balance_cache} />
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={STATUS_BADGE[row.original.status] ?? 'bg-slate-500'}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1.5 py-1">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setHistoryTarget(row.original)
            }}
            className="h-7 text-xs px-2 gap-1 text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 font-bold border-emerald-300 shadow-2xs"
            title="Riwayat Mutasi Transaksi (Deposit, Belanja, Tarik Tunai)"
          >
            <Wallet className="size-3.5 text-emerald-700" />
            Riwayat
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openCardPreview(row.original.id, row.original.name)
            }}
            className="h-7 text-xs px-2 gap-1 text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 shadow-2xs"
            title="Pratinjau Kartu Santri PDF"
          >
            <CreditCard className="size-3.5 text-blue-600" />
            Kartu
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              printCards([row.original.id])
            }}
            className="h-7 text-xs px-2 gap-1 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800 shadow-2xs"
            title="Cetak Kartu"
          >
            <Printer className="size-3.5 text-emerald-600" />
            Cetak
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openEdit(row.original)
            }}
            className="h-7 text-xs px-2 gap-1 text-amber-700 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 border-amber-200 dark:border-amber-800 shadow-2xs"
            title="Ubah Data Anggota"
          >
            <Pencil className="size-3.5 text-amber-600" />
            Edit
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setReissueTarget(row.original)
            }}
            className="h-7 text-xs px-2 gap-1 text-sky-700 bg-sky-50/50 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50 border-sky-200 dark:border-sky-800 shadow-2xs"
            title="Terbitkan Ulang Kartu"
          >
            <RefreshCw className="size-3.5 text-sky-600" />
            Reissue
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setResetPinTarget(row.original)
            }}
            className="h-7 text-xs px-2 gap-1 text-cyan-700 bg-cyan-50/50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/50 border-cyan-200 dark:border-cyan-800 shadow-2xs"
            title="Reset PIN"
          >
            <KeyRound className="size-3.5 text-cyan-600" />
            Reset PIN
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setAdjustPointTarget(row.original)
              setPointAdjustmentValue(row.original.point_balance ?? 0)
              setPointAdjustmentNote('')
            }}
            className="h-7 text-xs px-2 gap-1 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800 shadow-2xs"
            title="Sesuaikan / Reset Poin"
          >
            <Coins className="size-3.5 text-emerald-600" />
            Poin
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setSetPinTarget(row.original)
              setNewPin('')
              setSetPinError(null)
            }}
            className="h-7 text-xs px-2 gap-1 text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 shadow-2xs"
            title="Buat / Ganti PIN"
          >
            <Lock className="size-3.5 text-blue-600" />
            PIN
          </Button>

          {row.original.status === 'active' && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDeactivateTarget(row.original)
              }}
              className="h-7 text-xs px-2 gap-1 text-rose-700 bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border-rose-200 dark:border-rose-800 shadow-2xs"
              title="Nonaktifkan Anggota"
            >
              <UserX className="size-3.5 text-rose-600" />
              Nonaktif
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Anggota"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Anggota' }]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSampleCardOpen(true)}
              className="gap-1.5 text-blue-700 bg-blue-50/60 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 border-blue-200 font-semibold"
            >
              <CreditCard className="size-4 text-blue-600" />
              Pratinjau Contoh Kartu
            </Button>
            <Button onClick={openCreate}>Tambah Anggota</Button>
          </div>
        }
      />
      <PageTabs current={tab} tabs={[
        { key: 'members', label: 'Anggota', href: route('admin.members.index'), permission: 'member.view' },
        { key: 'points', label: 'Poin', href: route('admin.points.index'), permission: 'member.view' },
      ]} />

      {/* KPI Stat Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Anggota */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Anggota
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Users className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {stats.total_members.toLocaleString('id-ID')}
                <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">orang</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.total_santri}</span> Santri · <span className="font-semibold text-indigo-600 dark:text-indigo-400">{stats.total_fasilitator}</span> Fasilitator
              </p>
            </div>
          </div>

          {/* Card 2: Saldo Deposit */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Saldo Deposit
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Wallet className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                Rp {Math.round(stats.total_deposit).toLocaleString('id-ID')}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Saldo aktif tersimpan e-money
              </p>
            </div>
          </div>

          {/* Card 3: Total Poin Reward */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Poin Reward Beredar
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Coins className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                {stats.total_points.toLocaleString('id-ID')}
                <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">poin</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Akumulasi loyalty reward POS
              </p>
            </div>
          </div>

          {/* Card 4: Status Akun Aktif */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status Keaktifan
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {stats.active_members.toLocaleString('id-ID')}
                <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">aktif</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {Math.round((stats.active_members / (stats.total_members || 1)) * 100)}%
                </span>{' '}
                anggota siap bertransaksi
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full-width Balanced Filter Toolbar (Rata Kiri-Kanan) */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Cari nama, nomor anggota, atau NIS…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              className="pl-9 h-9 text-sm bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Type Filter */}
          <div className="w-full sm:w-44 shrink-0">
            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-9 text-sm bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-40 shrink-0">
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-9 text-sm bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
                <SelectItem value="suspended">Suspend</SelectItem>
                <SelectItem value="graduated">Lulus</SelectItem>
                <SelectItem value="transferred">Pindah</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons Right */}
        <div className="flex items-center gap-2 shrink-0 justify-end">
          {isFiltered && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilter}
              className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              title="Reset Filter"
            >
              <RotateCcw className="size-3.5 mr-1 text-slate-400" />
              Reset
            </Button>
          )}
          <Button
            onClick={applyFilter}
            size="sm"
            className="h-9 px-4 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Filter className="size-3.5" />
            Terapkan Filter
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={members.data}
        getRowId={(row) => String(row.id)}
        enableRowSelection
        bulkActions={[
          {
            label: 'Cetak Kartu Terpilih',
            icon: <Printer className="size-3.5" />,
            onClick: () => printCards(members.data.map((m) => m.id)),
          },
        ]}
        pagination={{
          page: members.current_page,
          perPage: members.per_page,
          total: members.total,
          onPageChange: (page) => router.get(route('admin.members.index'), { search, type: typeFilter, status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? 'Ubah Anggota' : 'Tambah Anggota'}
        size="xl"
        footer={<Button type="submit" form="member-form" disabled={form.processing}>Simpan</Button>}
      >
          <form id="member-form" onSubmit={submit} className="flex flex-col gap-4">
            <Tabs defaultValue="identitas">
              <TabsList>
                <TabsTrigger value="identitas">Identitas</TabsTrigger>
                <TabsTrigger value="wali">Wali</TabsTrigger>
                <TabsTrigger value="level">Level & Limit</TabsTrigger>
              </TabsList>

              <TabsContent value="identitas" className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="m-name">Nama</Label>
                  <Input id="m-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                  {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-nis">NIS</Label>
                  <Input id="m-nis" value={form.data.nis} onChange={(e) => form.setData('nis', e.target.value)} />
                  {form.errors.nis && <p className="text-sm text-danger">{form.errors.nis}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Tipe</Label>
                  <Select value={form.data.type} onValueChange={(v) => form.setData('type', v as MemberRow['type'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-class">Kelas</Label>
                    <Input id="m-class" value={form.data.class_name} onChange={(e) => form.setData('class_name', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-major">Jurusan</Label>
                    <Input id="m-major" value={form.data.major} onChange={(e) => form.setData('major', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-entry-year">Tahun Masuk</Label>
                    <Input
                      id="m-entry-year"
                      type="number"
                      value={form.data.entry_year}
                      onChange={(e) => form.setData('entry_year', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jenis Kelamin</Label>
                    <Select value={form.data.gender || 'none'} onValueChange={(v) => form.setData('gender', v === 'none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="L">Laki-laki</SelectItem>
                        <SelectItem value="P">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-birth">Tanggal Lahir</Label>
                  <Input id="m-birth" type="date" value={form.data.birth_date} onChange={(e) => form.setData('birth_date', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-phone">No. HP</Label>
                  <Input id="m-phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-address">Alamat</Label>
                  <Textarea id="m-address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-joined">Tanggal Bergabung</Label>
                  <Input id="m-joined" type="date" value={form.data.joined_at} onChange={(e) => form.setData('joined_at', e.target.value)} />
                </div>
                {editing && (
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="inactive">Nonaktif</SelectItem>
                        <SelectItem value="suspended">Suspend</SelectItem>
                        <SelectItem value="graduated">Lulus</SelectItem>
                        <SelectItem value="transferred">Pindah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="wali" className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="m-guardian-name">Nama Wali</Label>
                  <Input id="m-guardian-name" value={form.data.guardian_name} onChange={(e) => form.setData('guardian_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-guardian-phone">No. HP Wali</Label>
                  <Input id="m-guardian-phone" value={form.data.guardian_phone} onChange={(e) => form.setData('guardian_phone', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-guardian-relation">Hubungan</Label>
                  <Input
                    id="m-guardian-relation"
                    placeholder="Ayah / Ibu / Wali"
                    value={form.data.guardian_relation}
                    onChange={(e) => form.setData('guardian_relation', e.target.value)}
                  />
                </div>

                {editing && (
                  <div className="flex flex-col gap-3 border-t border-border pt-4">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                      Akun Login Portal Wali
                    </Label>

                    {editing.guardians.length === 0 && (
                      <p className="text-sm text-content-muted">Belum ada akun wali terhubung.</p>
                    )}
                    {editing.guardians.map((g) => (
                      <div key={g.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                        <div>
                          <p className="text-content">
                            {g.name} {Boolean(g.pivot.is_primary) && <Badge variant="outline" className="ml-1">Utama</Badge>}
                            {!g.is_active && <Badge className="ml-1 bg-danger text-white">Nonaktif</Badge>}
                          </p>
                          <p className="text-xs text-content-muted">{g.phone}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => resetGuardianPassword(g.id)}>Reset Password</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => toggleGuardianActive(g.id)}>
                            {g.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => unlinkGuardian(g.id)}>Lepas</Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
                      <p className="text-xs text-content-muted">Tambah/hubungkan akun wali (nomor HP yang sudah punya akun akan dihubungkan, bukan dibuat baru)</p>
                      <Input placeholder="Nama wali" value={newGuardian.name} onChange={(e) => setNewGuardian((s) => ({ ...s, name: e.target.value }))} />
                      <Input placeholder="No. HP (untuk login)" value={newGuardian.phone} onChange={(e) => setNewGuardian((s) => ({ ...s, phone: e.target.value }))} />
                      <Input placeholder="Hubungan (opsional)" value={newGuardian.relation} onChange={(e) => setNewGuardian((s) => ({ ...s, relation: e.target.value }))} />
                      <label className="flex items-center gap-2 text-xs text-content-muted">
                        <input type="checkbox" checked={newGuardian.is_primary} onChange={(e) => setNewGuardian((s) => ({ ...s, is_primary: e.target.checked }))} />
                        Wali utama
                      </label>
                      <Button type="button" size="sm" onClick={addGuardian}>Hubungkan Wali</Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="level" className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label>Level Keanggotaan</Label>
                  <Select value={form.data.member_level_id || 'none'} onValueChange={(v) => form.setData('member_level_id', v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa level</SelectItem>
                      {levels.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Batas Piutang (receivable_limit)</Label>
                  <MoneyInput value={form.data.receivable_limit} onChange={(v) => form.setData('receivable_limit', v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kategori Diblokir</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const checked = form.data.blocked_categories.includes(c.id)

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleBlockedCategory(c.id, !checked)}
                          className={`rounded-full border px-3 py-1 text-xs ${checked ? 'border-danger bg-danger/10 text-danger' : 'border-border text-content-muted'}`}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </form>
      </AppSheet>

      <ConfirmDialog
        open={resetPinTarget !== null}
        onOpenChange={(open) => !open && setResetPinTarget(null)}
        title="Reset PIN Anggota ke 123456"
        description={`PIN untuk ${resetPinTarget?.name} akan diatur ulang ke PIN default: 123456 dan status kunci PIN (lockout) akan dibuka.`}
        confirmLabel="Ya, Reset ke 123456"
        onConfirm={() => {
          if (resetPinTarget) {
            router.put(route('admin.members.reset-pin', resetPinTarget.id), {}, { preserveScroll: true })
          }
          setResetPinTarget(null)
        }}
      />

      <Dialog open={adjustPointTarget !== null} onOpenChange={(open) => !open && setAdjustPointTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sesuaikan / Reset Poin — {adjustPointTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800 text-xs">
              <p className="text-emerald-900 dark:text-emerald-200">Saldo Poin Saat Ini: <span className="font-bold font-mono text-sm">{adjustPointTarget?.point_balance ?? 0} Poin</span></p>
            </div>

            <div className="space-y-1.5">
              <Label>Saldo Poin Baru</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={pointAdjustmentValue}
                  onChange={(e) => setPointAdjustmentValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono text-base font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPointAdjustmentValue(0)}
                  className="shrink-0 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Reset ke 0
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan / Alasan Penyesuaian (Opsional)</Label>
              <Input
                placeholder="Misal: Penyesuaian reward semester, koreksi saldo..."
                value={pointAdjustmentNote}
                onChange={(e) => setPointAdjustmentNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustPointTarget(null)}>Batal</Button>
            <Button
              disabled={adjustingPoint}
              onClick={() => {
                if (!adjustPointTarget) return
                setAdjustingPoint(true)
                router.put(
                  route('admin.members.adjust-points', adjustPointTarget.id),
                  { points: pointAdjustmentValue, note: pointAdjustmentNote },
                  {
                    preserveScroll: true,
                    onSuccess: () => setAdjustPointTarget(null),
                    onFinish: () => setAdjustingPoint(false),
                  }
                )
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {adjustingPoint ? 'Menyimpan…' : 'Simpan Perubahan Poin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={setPinTarget !== null} onOpenChange={(open) => !open && setSetPinTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat/Ganti PIN (Wajib 6 Angka) — {setPinTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-3">
            <p className="text-xs text-muted-foreground text-center">
              Masukkan 6 digit angka numerik untuk PIN autentikasi transaksi santri.
            </p>
            <PinInput
              length={6}
              value={newPin}
              onChange={setNewPin}
              onComplete={(pin) => {
                if (!setPinTarget || pin.length !== 6) return
                setSettingPin(true)
                setSetPinError(null)
                router.put(route('admin.members.set-pin', setPinTarget.id), { pin }, {
                  preserveScroll: true,
                  onSuccess: () => setSetPinTarget(null),
                  onError: (errors) => setSetPinError(errors.pin ?? 'Gagal menyimpan PIN.'),
                  onFinish: () => setSettingPin(false),
                })
              }}
              disabled={settingPin}
            />
            {setPinError && <p className="text-sm font-semibold text-rose-600">{setPinError}</p>}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button variant="outline" onClick={() => setSetPinTarget(null)} disabled={settingPin}>Batal</Button>
            <Button
              type="button"
              disabled={newPin.length !== 6 || settingPin}
              onClick={() => {
                if (!setPinTarget || newPin.length !== 6) return
                setSettingPin(true)
                setSetPinError(null)
                router.put(route('admin.members.set-pin', setPinTarget.id), { pin: newPin }, {
                  preserveScroll: true,
                  onSuccess: () => setSetPinTarget(null),
                  onError: (errors) => setSetPinError(errors.pin ?? 'Gagal menyimpan PIN.'),
                  onFinish: () => setSettingPin(false),
                })
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {settingPin ? 'Menyimpan…' : 'Simpan PIN (6 Digit)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Nonaktifkan Anggota"
        description={`${deactivateTarget?.name} akan dinonaktifkan dan tidak bisa bertransaksi.`}
        variant="destructive"
        confirmLabel="Nonaktifkan"
        onConfirm={() => {
          if (deactivateTarget) {
            router.delete(route('admin.members.destroy', deactivateTarget.id), { preserveScroll: true })
          }
          setDeactivateTarget(null)
        }}
      />

      <Dialog open={reissueTarget !== null} onOpenChange={(open) => !open && setReissueTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terbitkan Ulang Kartu — {reissueTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 px-1">
            <Label htmlFor="reissue-reason">Alasan (mis. kartu hilang, rusak)</Label>
            <Textarea id="reissue-reason" value={reissueReason} onChange={(e) => setReissueReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              disabled={!reissueReason.trim()}
              onClick={() => {
                if (reissueTarget) {
                  router.post(
                    route('admin.members.reissue-card', reissueTarget.id),
                    { reason: reissueReason },
                    { preserveScroll: true, onSuccess: () => setReissueTarget(null) },
                  )
                }
                setReissueReason('')
              }}
            >
              Terbitkan Kartu Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sampleCardOpen} onOpenChange={setSampleCardOpen}>
        <DialogContent className="sm:max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CreditCard className="size-5 text-blue-600" />
              Pratinjau Contoh Desain Kartu Santri Digital
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 flex flex-col md:flex-row gap-4 items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border">
            {/* Depan Kartu */}
            <div className="w-[290px] h-[180px] rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-4 shadow-xl flex flex-col justify-between relative overflow-hidden border border-blue-500/30">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs shadow-md">
                    SM
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold tracking-wide uppercase text-blue-200">KARTU SANTRI DIGITAL</h4>
                    <p className="text-[8px] text-blue-300">Pondok Pesantren S-Mart</p>
                  </div>
                </div>
                <div className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  RFID ACTIVE
                </div>
              </div>

              <div className="flex items-center gap-3 my-auto z-10">
                <div className="size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-base shadow-inner shrink-0">
                  👤
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-extrabold tracking-tight text-white truncate">Ahmad Fauzan Ridho</span>
                  <span className="text-[10px] font-mono text-blue-200">NO: 202600001</span>
                  <span className="text-[9px] text-blue-300">XI · PPLG (Santri)</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[8px] text-blue-300 border-t border-white/10 pt-1.5 z-10">
                <span>BERLAKU: 2026 - 2029</span>
                <span className="font-mono">S-MART POS</span>
              </div>
            </div>

            {/* Belakang Kartu */}
            <div className="w-[290px] h-[180px] rounded-2xl bg-slate-800 text-white p-4 shadow-xl flex flex-col justify-between relative overflow-hidden border border-slate-700">
              <div className="w-full h-7 bg-slate-900 -mx-4 -mt-4 px-4 flex items-center justify-end">
                <span className="text-[7px] font-mono text-slate-400">MAGNETIC STRIPE / NFC CHIP INTEGRATED</span>
              </div>

              <div className="flex flex-col items-center justify-center my-auto gap-1">
                <div className="bg-white p-1.5 rounded-lg shadow-sm">
                  <div className="flex items-center gap-0.5 h-6 w-36 justify-center">
                    <div className="w-1 h-full bg-black"></div>
                    <div className="w-0.5 h-full bg-black"></div>
                    <div className="w-1.5 h-full bg-black"></div>
                    <div className="w-0.5 h-full bg-black"></div>
                    <div className="w-1 h-full bg-black"></div>
                    <div className="w-2 h-full bg-black"></div>
                    <div className="w-0.5 h-full bg-black"></div>
                    <div className="w-1 h-full bg-black"></div>
                    <div className="w-1.5 h-full bg-black"></div>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-center block text-black">202600001</span>
                </div>
                <span className="text-[8px] text-slate-400">Pindai barcode ini di Kasir POS S-Mart</span>
              </div>

              <p className="text-[8px] text-slate-400 text-center border-t border-slate-700 pt-1">
                Kartu ini milik Pondok Pesantren S-Mart. Harap dikembalikan jika ditemukan.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSampleCardOpen(false)}>Tutup Pratinjau</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Card Preview & Print Pop-up Modal */}
      <Dialog open={pdfModal.open} onOpenChange={(open) => setPdfModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-2xl w-full h-[88vh] flex flex-col p-4 gap-3 bg-surface border border-border rounded-xl shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border gap-4">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-content whitespace-nowrap truncate min-w-0 flex-1">
              <CreditCard className="size-5 text-primary shrink-0" />
              <span className="truncate">{pdfModal.title}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 pr-6 shrink-0">
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                onClick={() => {
                  const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement
                  if (iframe?.contentWindow) {
                    iframe.contentWindow.print()
                  } else {
                    window.open(pdfModal.url, '_blank')
                  }
                }}
              >
                <Printer className="size-4" />
                Cetak Sekarang
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 w-full bg-slate-900 rounded-lg overflow-hidden border border-border relative">
            {pdfModal.url ? (
              <iframe
                id="pdf-preview-iframe"
                src={pdfModal.url}
                className="w-full h-full border-0"
                title="Pratinjau PDF Kartu"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <MemberTransactionsSheet
        member={historyTarget}
        open={historyTarget !== null}
        onOpenChange={(open) => !open && setHistoryTarget(null)}
      />
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
