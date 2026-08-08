import { useMemo, useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import { Folder, FolderOpen, FileText, Search, Plus, Edit2, Trash2, ShieldCheck, Layers } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Checkbox } from '@/Components/ui/checkbox'
import { Switch } from '@/Components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog'

type AccountRow = {
  id: number
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  subtype: string | null
  parent_id: number | null
  level: number
  normal_balance: 'debit' | 'credit'
  is_system: boolean
  is_active: boolean
  description: string | null
}

type AccountsIndexProps = {
  tab: string
  accounts: AccountRow[]
}

const TYPE_LABELS: Record<AccountRow['type'], string> = {
  asset: 'Aset',
  liability: 'Kewajiban',
  equity: 'Ekuitas',
  revenue: 'Pendapatan',
  expense: 'Beban',
}

const TYPE_BADGE: Record<AccountRow['type'], string> = {
  asset: 'bg-blue-600 text-white dark:bg-blue-700',
  liability: 'bg-amber-600 text-white dark:bg-amber-700',
  equity: 'bg-teal-600 text-white dark:bg-teal-700',
  revenue: 'bg-emerald-600 text-white dark:bg-emerald-700',
  expense: 'bg-rose-600 text-white dark:bg-rose-700',
}

export default function Index({ tab, accounts }: AccountsIndexProps) {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AccountRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null)

  const createForm = useForm({
    code: '',
    name: '',
    type: 'asset' as AccountRow['type'],
    subtype: '',
    parent_id: '',
    normal_balance: 'debit' as AccountRow['normal_balance'],
    description: '',
  })
  const editForm = useForm({ name: '', subtype: '', description: '', is_active: true })

  const stats = useMemo(() => {
    return {
      total: accounts.length,
      asset: accounts.filter((a) => a.type === 'asset').length,
      liability: accounts.filter((a) => a.type === 'liability').length,
      equity: accounts.filter((a) => a.type === 'equity').length,
      revenue: accounts.filter((a) => a.type === 'revenue').length,
      expense: accounts.filter((a) => a.type === 'expense').length,
    }
  }, [accounts])

  const parentIds = useMemo(() => new Set(accounts.filter((a) => a.parent_id !== null).map((a) => a.parent_id!)), [accounts])

  const sortedAccounts = useMemo(() => [...accounts].sort((a, b) => a.code.localeCompare(b.code)), [accounts])

  const filteredAccounts = useMemo(() => {
    let list = sortedAccounts

    if (selectedType !== 'all') {
      list = list.filter((a) => a.type === selectedType)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
    }

    return list
  }, [sortedAccounts, selectedType, search])

  const isAllSelected = useMemo(() => {
    if (filteredAccounts.length === 0) return false
    return filteredAccounts.every((a) => selectedIds.includes(a.id))
  }, [filteredAccounts, selectedIds])

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredAccounts.map((a) => a.id))
    }
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const submitCreate: FormEventHandler = (e) => {
    e.preventDefault()
    createForm.post(route('admin.accounts.store'), {
      preserveScroll: true,
      onSuccess: () => {
        createForm.reset()
        setCreateOpen(false)
      },
    })
  }

  function openEdit(account: AccountRow) {
    setEditTarget(account)
    editForm.setData({
      name: account.name,
      subtype: account.subtype ?? '',
      description: account.description ?? '',
      is_active: account.is_active,
    })
  }

  const submitEdit: FormEventHandler = (e) => {
    e.preventDefault()
    if (!editTarget) return
    editForm.put(route('admin.accounts.update', editTarget.id), {
      preserveScroll: true,
      onSuccess: () => setEditTarget(null),
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    router.delete(route('admin.accounts.destroy', deleteTarget.id), {
      preserveScroll: true,
      onFinish: () => setDeleteTarget(null),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Bagan Akun (COA)"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Bagan Akun' }]}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" /> Tambah Akun
          </Button>
        }
      />
      <PageTabs
        current={tab}
        tabs={[
          { key: 'accounts', label: 'Bagan Akun', href: route('admin.accounts.index'), permission: 'setting.view' },
          { key: 'journals', label: 'Jurnal', href: route('admin.journals.index'), permission: 'journal.view' },
          { key: 'ledger', label: 'Buku Besar', href: route('admin.ledger.index'), permission: 'ledger.view' },
          { key: 'trial-balance', label: 'Neraca Saldo', href: route('admin.trial-balance.index'), permission: 'ledger.view' },
          { key: 'profit-loss', label: 'Laba Rugi', href: route('admin.profit-loss.index'), permission: 'ledger.view' },
          { key: 'balance-sheet', label: 'Neraca', href: route('admin.balance-sheet.index'), permission: 'ledger.view' },
          { key: 'accounting-periods', label: 'Periode', href: route('admin.accounting-periods.index'), permission: 'ledger.view' },
        ]}
      />

      {/* Ringkasan & Filter Tipe Akun */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
            <Input
              placeholder="Cari kode atau nama akun..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* Badge Statistik Ringkas */}
          <div className="flex items-center gap-1.5 text-xs text-content-muted">
            <Layers className="size-4" /> Total Akun: <span className="font-bold text-content">{stats.total}</span>
          </div>
        </div>

        {/* Filter Pills Tipe Akun */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedType === 'all'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-surface-muted text-content-muted hover:bg-surface-muted/80 hover:text-content'
            }`}
          >
            Semua ({stats.total})
          </button>
          {Object.entries(TYPE_LABELS).map(([key, label]) => {
            const count = stats[key as keyof typeof stats] ?? 0
            const isSelected = selectedType === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedType(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-surface-muted text-content-muted hover:bg-surface-muted/80 hover:text-content'
                }`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Bar Notifikasi Item Terpilih */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary shadow-2xs">
          <span>{selectedIds.length} akun terpilih</span>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="h-7 text-xs hover:bg-primary/20">
            Batal Pilih
          </Button>
        </div>
      )}

      {/* Tabel Hirarki Bagan Akun (COA Tree View) */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="border-b border-border bg-surface-muted/50 text-left font-semibold text-content-muted">
              <tr>
                <th className="p-3 w-10 text-center">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Pilih semua akun"
                  />
                </th>
                <th className="p-3 w-12 text-center font-mono">No</th>
                <th className="p-3 w-32 font-mono">Kode</th>
                <th className="p-3">Nama Akun</th>
                <th className="p-3 w-28 text-center">Tipe</th>
                <th className="p-3 w-28 text-center">Saldo Normal</th>
                <th className="p-3 w-24 text-center">Status</th>
                <th className="p-3 w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-content-muted">
                    Tidak ada akun yang sesuai dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account, index) => {
                  const isParent = parentIds.has(account.id)
                  const isLevel1 = account.level === 1
                  const isRowSelected = selectedIds.includes(account.id)

                  return (
                    <tr
                      key={account.id}
                      className={`transition-colors hover:bg-surface-muted/40 ${
                        isRowSelected
                          ? 'bg-primary/5'
                          : isLevel1
                          ? 'bg-surface-muted/70 font-bold text-content'
                          : isParent
                          ? 'bg-surface/90 font-semibold'
                          : ''
                      }`}
                    >
                      {/* Checkbox Per Baris */}
                      <td className="p-3 text-center">
                        <Checkbox
                          checked={isRowSelected}
                          onCheckedChange={() => toggleSelectOne(account.id)}
                          aria-label={`Pilih akun ${account.code}`}
                        />
                      </td>

                      {/* Nomor Urut */}
                      <td className="p-3 text-center font-mono text-xs font-semibold text-content-muted">
                        {index + 1}
                      </td>

                      {/* Kode Akun */}
                      <td className="p-3 font-mono text-xs font-bold text-content-muted whitespace-nowrap">
                        {account.code}
                      </td>

                      {/* Nama Akun dengan Indentasi Hirarki */}
                      <td className="p-3">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${(account.level - 1) * 22}px` }}
                        >
                          {/* Indikator Hirarki Tree */}
                          {account.level > 1 && (
                            <span className="text-content-muted/40 font-mono text-xs">└─</span>
                          )}

                          {/* Ikon berdasarkan Hirarki */}
                          {isLevel1 ? (
                            <FolderOpen className="size-4 text-primary shrink-0" />
                          ) : isParent ? (
                            <Folder className="size-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <FileText className="size-3.5 text-content-muted/70 shrink-0" />
                          )}

                          {/* Nama Akun */}
                          <span
                            className={`line-clamp-1 ${
                              isLevel1
                                ? 'text-sm font-bold text-content'
                                : isParent
                                ? 'text-xs sm:text-sm font-semibold text-content'
                                : 'text-xs text-content'
                            }`}
                          >
                            {account.name}
                          </span>

                          {/* Badge Tag Identifikasi */}
                          {account.is_system && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-700 dark:text-blue-300 gap-0.5">
                              <ShieldCheck className="size-3" /> Sistem
                            </Badge>
                          )}
                          {isParent && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-content-muted border-border">
                              Header
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Tipe Akun */}
                      <td className="p-3 text-center">
                        <Badge className={`${TYPE_BADGE[account.type]} text-[10px] sm:text-xs font-semibold px-2 py-0.5`}>
                          {TYPE_LABELS[account.type]}
                        </Badge>
                      </td>

                      {/* Saldo Normal */}
                      <td className="p-3 text-center capitalize text-xs font-medium text-content-muted">
                        {account.normal_balance === 'debit' ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">Debit</span>
                        ) : (
                          <span className="text-teal-600 dark:text-teal-400 font-semibold">Kredit</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {account.is_active ? (
                          <Badge className="bg-emerald-500 text-white text-[10px]">Aktif</Badge>
                        ) : (
                          <Badge className="bg-slate-400 text-white text-[10px]">Nonaktif</Badge>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => openEdit(account)}
                            title="Edit nama/deskripsi akun"
                          >
                            <Edit2 className="size-3.5 text-content-muted hover:text-primary" />
                          </Button>
                          {!account.is_system && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(account)}
                              title="Hapus akun"
                            >
                              <Trash2 className="size-3.5 text-danger/70 hover:text-danger" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Akun */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Akun Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="flex flex-col gap-4 px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode Akun</Label>
                <Input
                  value={createForm.data.code}
                  onChange={(e) => createForm.setData('code', e.target.value)}
                  placeholder="mis. 1-1700"
                />
                {createForm.errors.code && <p className="text-sm text-danger">{createForm.errors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Nama Akun</Label>
                <Input value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} />
                {createForm.errors.name && <p className="text-sm text-danger">{createForm.errors.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipe Akun</Label>
                <Select
                  value={createForm.data.type}
                  onValueChange={(v) => createForm.setData('type', v as AccountRow['type'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Saldo Normal</Label>
                <Select
                  value={createForm.data.normal_balance}
                  onValueChange={(v) => createForm.setData('normal_balance', v as AccountRow['normal_balance'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Akun Induk (opsional)</Label>
              <Select
                value={createForm.data.parent_id || 'none'}
                onValueChange={(v) => createForm.setData('parent_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanpa induk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa induk</SelectItem>
                  {sortedAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.errors.parent_id && <p className="text-sm text-danger">{createForm.errors.parent_id}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi (opsional)</Label>
              <Input
                value={createForm.data.description}
                onChange={(e) => createForm.setData('description', e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createForm.processing}>
                Simpan Akun
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Akun */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Akun — {editTarget?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Nama Akun</Label>
              <Input value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} />
              {editForm.errors.name && <p className="text-sm text-danger">{editForm.errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input
                value={editForm.data.description}
                onChange={(e) => editForm.setData('description', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editForm.data.is_active} onCheckedChange={(v) => editForm.setData('is_active', v)} />
              <Label>Status Aktif</Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editForm.processing}>
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus akun {deleteTarget?.code} — {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Akun yang sudah memiliki mutasi jurnal tidak dapat dihapus — hanya akun kosong tanpa anak yang bisa
              dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              onClick={confirmDelete}
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
