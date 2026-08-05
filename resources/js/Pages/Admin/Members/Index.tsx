import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Printer } from 'lucide-react'
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
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
  receivable_limit: number
  active_card: ActiveCard
  guardians: GuardianRow[]
}

type MembersIndexProps = {
  tab: string
  members: Paginated<MemberRow>
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

export default function Index({ tab, members, levels, categories, filters }: MembersIndexProps) {
  const [search, setSearch] = useState(filters.search ?? '')
  const [typeFilter, setTypeFilter] = useState(filters.type ?? '')
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [sheetOpen, setSheetOpen] = useState(false)
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
  const form = useForm(emptyForm)

  function applyFilter() {
    router.get(route('admin.members.index'), { search, type: typeFilter, status: statusFilter }, { preserveState: true, replace: true })
  }

  function openCreate() {
    setEditing(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: MemberRow) {
    setEditing(row)
    // Gap G-07: sebelumnya sebagian besar field di bawah SELALU direset ke
    // kosong/default di sini, walau datanya sudah ada di `row` — kalau
    // staf hanya mengubah satu field (mis. Level Keanggotaan) lalu
    // langsung simpan, data lama ini tertimpa kosong. Sekarang seluruh
    // field diisi dari data anggota yang sebenarnya.
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
    const options = { preserveScroll: true as const, onSuccess: () => setSheetOpen(false) }
    if (editing) {
      form.put(route('admin.members.update', editing.id), options)
    } else {
      form.post(route('admin.members.store'), options)
    }
  }

  function toggleBlockedCategory(categoryId: number, checked: boolean) {
    form.setData(
      'blocked_categories',
      checked ? [...form.data.blocked_categories, categoryId] : form.data.blocked_categories.filter((id) => id !== categoryId),
    )
  }

  function printCards(ids: number[]) {
    const params = ids.map((id) => `ids[]=${id}`).join('&')
    window.open(`${route('admin.members.print-cards')}?${params}`, '_blank')
  }

  function addGuardian() {
    if (!editing || !newGuardian.name.trim() || !newGuardian.phone.trim()) return

    router.post(route('admin.members.guardians.store', editing.id), newGuardian, {
      preserveScroll: true,
      onSuccess: () => setNewGuardian({ name: '', phone: '', relation: '', is_primary: false }),
    })
  }

  function unlinkGuardian(guardianId: number) {
    if (!editing) return
    router.delete(route('admin.members.guardians.destroy', [editing.id, guardianId]), { preserveScroll: true })
  }

  function resetGuardianPassword(guardianId: number) {
    router.put(route('admin.guardians.reset-password', guardianId), {}, { preserveScroll: true })
  }

  function toggleGuardianActive(guardianId: number) {
    router.put(route('admin.guardians.toggle-active', guardianId), {}, { preserveScroll: true })
  }

  const columns: ColumnDef<MemberRow, unknown>[] = [
    { accessorKey: 'member_number', header: 'No. Anggota' },
    { accessorKey: 'name', header: 'Nama' },
    { id: 'type', header: 'Tipe', cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type]}</Badge> },
    {
      id: 'class',
      header: 'Kelas/Jurusan',
      cell: ({ row }) => (row.original.class_name ? `${row.original.class_name} · ${row.original.major ?? '-'}` : '—'),
    },
    { id: 'level', header: 'Level', cell: ({ row }) => row.original.level?.name ?? '—' },
    { id: 'balance', header: 'Saldo', cell: ({ row }) => <Money amount={row.original.balance_cache} /> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>Ubah</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(route('admin.members.preview-card', row.original.id), '_blank')}>Pratinjau Kartu</DropdownMenuItem>
            <DropdownMenuItem onClick={() => printCards([row.original.id])}>Cetak Kartu</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setReissueTarget(row.original)}>Terbitkan Ulang Kartu</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResetPinTarget(row.original)}>Reset PIN</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSetPinTarget(row.original); setNewPin(''); setSetPinError(null) }}>Buat/Ganti PIN</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger"
              disabled={row.original.status !== 'active'}
              onClick={() => setDeactivateTarget(row.original)}
            >
              Nonaktifkan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Anggota"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Anggota' }]}
        actions={<Button onClick={openCreate}>Tambah Anggota</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'members', label: 'Anggota', href: route('admin.members.index'), permission: 'member.view' },
        { key: 'points', label: 'Poin', href: route('admin.points.index'), permission: 'member.view' },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Cari nama/no. anggota/NIS…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
          className="max-w-xs"
        />
        <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tipe</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
            <SelectItem value="suspended">Suspend</SelectItem>
            <SelectItem value="graduated">Lulus</SelectItem>
            <SelectItem value="transferred">Pindah</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={applyFilter}>Terapkan</Button>
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editing ? 'Ubah Anggota' : 'Tambah Anggota'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-4 pb-4">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-class">Kelas</Label>
                    <Input id="m-class" value={form.data.class_name} onChange={(e) => form.setData('class_name', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-major">Jurusan</Label>
                    <Input id="m-major" value={form.data.major} onChange={(e) => form.setData('major', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
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

            <SheetFooter>
              <Button type="submit" disabled={form.processing}>Simpan</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={resetPinTarget !== null}
        onOpenChange={(open) => !open && setResetPinTarget(null)}
        title="Reset PIN Anggota"
        description={`PIN ${resetPinTarget?.name} akan dihapus. Anggota akan diminta membuat PIN baru saat transaksi berikutnya.`}
        confirmLabel="Reset PIN"
        onConfirm={() => {
          if (resetPinTarget) {
            router.put(route('admin.members.reset-pin', resetPinTarget.id), {}, { preserveScroll: true })
          }
          setResetPinTarget(null)
        }}
      />

      <Dialog open={setPinTarget !== null} onOpenChange={(open) => !open && setSetPinTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Buat/Ganti PIN — {setPinTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <PinInput
              length={4}
              value={newPin}
              onChange={setNewPin}
              onComplete={(pin) => {
                if (!setPinTarget) return
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
            {setPinError && <p className="text-sm text-danger">{setPinError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetPinTarget(null)} disabled={settingPin}>Batal</Button>
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
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
