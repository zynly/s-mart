import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { ConfirmDialog } from '@/Components/common/ConfirmDialog'
import { PinInput } from '@/Components/common/PinInput'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Switch } from '@/Components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
import { AppSheet } from '@/Components/common/AppSheet'
import type { Paginated } from '@/Types'

type UserRow = {
  id: number
  name: string
  username: string
  email: string
  phone: string | null
  employee_code: string | null
  is_active: boolean
  roles: { id: number; name: string }[]
}

type UsersIndexProps = {
  tab: string
  users: Paginated<UserRow>
  roles: string[]
  filters: { search?: string; role?: string }
}

const emptyForm = {
  name: '',
  username: '',
  email: '',
  phone: '',
  employee_code: '',
  password: '',
  role: '',
  is_active: true as boolean,
}

export default function Index({ tab, users, roles, filters }: UsersIndexProps) {
  const [search, setSearch] = useState(filters.search ?? '')
  const [roleFilter, setRoleFilter] = useState(filters.role ?? '')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [pinTarget, setPinTarget] = useState<UserRow | null>(null)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null)
  const [pinValue, setPinValue] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const form = useForm(emptyForm)

  function applyFilter() {
    router.get(route('admin.users.index'), { search, role: roleFilter }, { preserveState: true, replace: true })
  }

  function openCreate() {
    setEditingUser(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(user: UserRow) {
    setEditingUser(user)
    form.setData({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone ?? '',
      employee_code: user.employee_code ?? '',
      password: '',
      role: user.roles[0]?.name ?? '',
      is_active: user.is_active,
    })
    form.clearErrors()
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()

    if (editingUser) {
      form.put(route('admin.users.update', editingUser.id), {
        preserveScroll: true,
        onSuccess: () => setSheetOpen(false),
      })
    } else {
      form.post(route('admin.users.store'), {
        preserveScroll: true,
        onSuccess: () => setSheetOpen(false),
      })
    }
  }

  function submitPin() {
    if (!pinTarget) return
    router.put(
      route('admin.users.set-pin', pinTarget.id),
      { pin: pinValue },
      { preserveScroll: true, onSuccess: () => { setPinTarget(null); setPinValue('') } },
    )
  }

  function submitResetPassword() {
    if (!resetTarget) return
    router.put(
      route('admin.users.reset-password', resetTarget.id),
      { password: newPassword },
      { preserveScroll: true, onSuccess: () => { setResetTarget(null); setNewPassword('') } },
    )
  }

  function submitDeactivate() {
    if (!deactivateTarget) return
    router.delete(route('admin.users.destroy', deactivateTarget.id), {
      preserveScroll: true,
      onSuccess: () => setDeactivateTarget(null),
    })
  }

  const columns: ColumnDef<UserRow, unknown>[] = [
    { accessorKey: 'name', header: 'Nama' },
    { accessorKey: 'username', header: 'Username' },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => <Badge variant="secondary">{row.original.roles[0]?.name ?? '-'}</Badge>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="bg-success text-white">Aktif</Badge>
        ) : (
          <Badge variant="destructive">Nonaktif</Badge>
        ),
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
            <DropdownMenuItem onClick={() => setResetTarget(row.original)}>Reset Password</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPinTarget(row.original)}>Atur PIN</DropdownMenuItem>
            <DropdownMenuItem
              className="text-danger"
              onClick={() => setDeactivateTarget(row.original)}
              disabled={!row.original.is_active}
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
        title="Pengguna"
        subtitle="Kelola akun staf (owner, admin, supervisor, kasir, warehouse, bendahara)"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Pengguna' }]}
        actions={<Button onClick={openCreate}>Tambah Pengguna</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'users', label: 'Pengguna', href: route('admin.users.index'), permission: 'user.view' },
        { key: 'roles', label: 'Role & Izin', href: route('admin.roles.index'), permission: 'role.view' },
        { key: 'activity-logs', label: 'Log Aktivitas', href: route('admin.activity-logs.index'), permission: 'setting.view' },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Cari nama/username/email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
          className="max-w-xs"
        />
        <Select value={roleFilter || 'all'} onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua role</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={applyFilter}>
          Terapkan
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: users.current_page,
          perPage: users.per_page,
          total: users.total,
          onPageChange: (page) => router.get(route('admin.users.index'), { search, role: roleFilter, page }, { preserveState: true }),
        }}
      />

      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editingUser ? 'Ubah Pengguna' : 'Tambah Pengguna'}
        description={editingUser ? `Perbarui data ${editingUser.name}.` : 'Buat akun staf baru.'}
        size="md"
        footer={<Button type="submit" form="user-form" disabled={form.processing}>Simpan</Button>}
      >
          <form id="user-form" onSubmit={submit} className="flex flex-col gap-4 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Nama</Label>
              <Input id="u-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
              {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-username">Username</Label>
              <Input id="u-username" value={form.data.username} onChange={(e) => form.setData('username', e.target.value)} />
              {form.errors.username && <p className="text-sm text-danger">{form.errors.username}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
              {form.errors.email && <p className="text-sm text-danger">{form.errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-phone">No. HP</Label>
              <Input id="u-phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-employee-code">Kode Karyawan</Label>
              <Input
                id="u-employee-code"
                value={form.data.employee_code}
                onChange={(e) => form.setData('employee_code', e.target.value)}
              />
            </div>
            {!editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="u-password">Password</Label>
                <Input
                  id="u-password"
                  type="password"
                  value={form.data.password}
                  onChange={(e) => form.setData('password', e.target.value)}
                />
                {form.errors.password && <p className="text-sm text-danger">{form.errors.password}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.data.role} onValueChange={(v) => form.setData('role', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.errors.role && <p className="text-sm text-danger">{form.errors.role}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="u-active"
                checked={form.data.is_active}
                onCheckedChange={(checked) => form.setData('is_active', checked)}
              />
              <Label htmlFor="u-active" className="font-normal">
                Aktif
              </Label>
            </div>
          </form>
      </AppSheet>

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={`Nonaktifkan ${deactivateTarget?.name ?? ''}?`}
        description="Pengguna tidak akan bisa login lagi sampai diaktifkan kembali oleh admin."
        variant="destructive"
        confirmLabel="Nonaktifkan"
        onConfirm={submitDeactivate}
      />

      <Sheet open={pinTarget !== null} onOpenChange={(open) => !open && setPinTarget(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-sm rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Atur PIN — {pinTarget?.name}</SheetTitle>
            <SheetDescription>PIN 6 digit dipakai untuk otorisasi supervisor.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center gap-4 px-4 pb-4">
            <PinInput length={6} value={pinValue} onChange={setPinValue} onComplete={submitPin} />
            <Button onClick={submitPin} disabled={pinValue.length !== 6}>
              Simpan PIN
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={resetTarget !== null} onOpenChange={(open) => !open && setResetTarget(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-sm rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Reset Password — {resetTarget?.name}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <Input
              type="password"
              placeholder="Password baru"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button onClick={submitResetPassword} disabled={newPassword.length < 8}>
              Simpan Password
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
