import { useMemo, useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
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
  asset: 'Aset', liability: 'Kewajiban', equity: 'Ekuitas', revenue: 'Pendapatan', expense: 'Beban',
}
const TYPE_BADGE: Record<AccountRow['type'], string> = {
  asset: 'bg-navy-600 text-white',
  liability: 'bg-warning text-white',
  equity: 'bg-teal-600 text-white',
  revenue: 'bg-success text-white',
  expense: 'bg-danger text-white',
}

export default function Index({ tab, accounts }: AccountsIndexProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AccountRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null)

  const createForm = useForm({
    code: '', name: '', type: 'asset' as AccountRow['type'], subtype: '',
    parent_id: '', normal_balance: 'debit' as AccountRow['normal_balance'], description: '',
  })
  const editForm = useForm({ name: '', subtype: '', description: '', is_active: true })

  const sorted = useMemo(() => [...accounts].sort((a, b) => a.code.localeCompare(b.code)), [accounts])
  const leafIds = useMemo(() => new Set(accounts.filter((a) => a.parent_id !== null).map((a) => a.parent_id)), [accounts])

  const submitCreate: FormEventHandler = (e) => {
    e.preventDefault()
    createForm.post(route('admin.accounts.store'), {
      preserveScroll: true,
      onSuccess: () => { createForm.reset(); setCreateOpen(false) },
    })
  }

  function openEdit(account: AccountRow) {
    setEditTarget(account)
    editForm.setData({ name: account.name, subtype: account.subtype ?? '', description: account.description ?? '', is_active: account.is_active })
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
        actions={<Button onClick={() => setCreateOpen(true)}>Tambah Akun</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'accounts', label: 'Bagan Akun', href: route('admin.accounts.index'), permission: 'setting.view' },
        { key: 'journals', label: 'Jurnal', href: route('admin.journals.index'), permission: 'journal.view' },
        { key: 'ledger', label: 'Buku Besar', href: route('admin.ledger.index'), permission: 'ledger.view' },
        { key: 'trial-balance', label: 'Neraca Saldo', href: route('admin.trial-balance.index'), permission: 'ledger.view' },
        { key: 'profit-loss', label: 'Laba Rugi', href: route('admin.profit-loss.index'), permission: 'ledger.view' },
        { key: 'balance-sheet', label: 'Neraca', href: route('admin.balance-sheet.index'), permission: 'ledger.view' },
        { key: 'accounting-periods', label: 'Periode', href: route('admin.accounting-periods.index'), permission: 'ledger.view' },
      ]} />

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-content-muted">
            <tr>
              <th className="p-2">Kode</th><th className="p-2">Nama</th><th className="p-2">Tipe</th>
              <th className="p-2">Saldo Normal</th><th className="p-2">Status</th><th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((account) => {
              const isHeader = leafIds.has(account.id)
              return (
                <tr key={account.id} className="border-t border-border">
                  <td className="p-2 font-mono">{account.code}</td>
                  <td className="p-2" style={{ paddingLeft: `${8 + (account.level - 1) * 20}px` }}>
                    <span className={isHeader ? 'font-semibold' : ''}>{account.name}</span>
                    {account.is_system && <Badge variant="outline" className="ml-2 text-xs">Sistem</Badge>}
                    {isHeader && <Badge variant="outline" className="ml-2 text-xs">Header</Badge>}
                  </td>
                  <td className="p-2"><Badge className={TYPE_BADGE[account.type]}>{TYPE_LABELS[account.type]}</Badge></td>
                  <td className="p-2 capitalize">{account.normal_balance === 'debit' ? 'Debit' : 'Kredit'}</td>
                  <td className="p-2">
                    {account.is_active ? <Badge className="bg-success text-white">Aktif</Badge> : <Badge className="bg-slate-500 text-white">Nonaktif</Badge>}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(account)}>Edit</Button>
                      {!account.is_system && (
                        <Button size="sm" variant="outline" className="text-danger" onClick={() => setDeleteTarget(account)}>Hapus</Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Akun</DialogTitle></DialogHeader>
          <form onSubmit={submitCreate} className="flex flex-col gap-4 px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode</Label>
                <Input value={createForm.data.code} onChange={(e) => createForm.setData('code', e.target.value)} placeholder="mis. 1-1700" />
                {createForm.errors.code && <p className="text-sm text-danger">{createForm.errors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} />
                {createForm.errors.name && <p className="text-sm text-danger">{createForm.errors.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={createForm.data.type} onValueChange={(v) => createForm.setData('type', v as AccountRow['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Saldo Normal</Label>
                <Select value={createForm.data.normal_balance} onValueChange={(v) => createForm.setData('normal_balance', v as AccountRow['normal_balance'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Akun Induk (opsional)</Label>
              <Select value={createForm.data.parent_id || 'none'} onValueChange={(v) => createForm.setData('parent_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Tanpa induk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa induk</SelectItem>
                  {sorted.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.errors.parent_id && <p className="text-sm text-danger">{createForm.errors.parent_id}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi (opsional)</Label>
              <Input value={createForm.data.description} onChange={(e) => createForm.setData('description', e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createForm.processing}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Akun — {editTarget?.code}</DialogTitle></DialogHeader>
          <form onSubmit={submitEdit} className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} />
              {editForm.errors.name && <p className="text-sm text-danger">{editForm.errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input value={editForm.data.description} onChange={(e) => editForm.setData('description', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editForm.data.is_active} onCheckedChange={(v) => editForm.setData('is_active', v)} />
              <Label>Aktif</Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editForm.processing}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun {deleteTarget?.code} — {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun yang sudah punya mutasi jurnal tidak bisa dihapus — hanya akun kosong tanpa anak yang bisa dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-white hover:bg-danger/90" onClick={confirmDelete}>Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
