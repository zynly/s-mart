import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { DataTable } from '@/Components/common/DataTable'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Switch } from '@/Components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'

type CategoryRow = {
  id: number
  code: string
  name: string
  parent_id: number | null
  parent: { id: number; name: string } | null
  description: string | null
  is_active: boolean
}

const emptyForm = { code: '', name: '', parent_id: '', description: '', is_active: true as boolean }

export default function Index({ categories }: { categories: CategoryRow[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const form = useForm(emptyForm)

  function openCreate() {
    setEditing(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: CategoryRow) {
    setEditing(row)
    form.setData({
      code: row.code,
      name: row.name,
      parent_id: row.parent_id ? String(row.parent_id) : '',
      description: row.description ?? '',
      is_active: row.is_active,
    })
    form.clearErrors()
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    const options = { preserveScroll: true as const, onSuccess: () => setSheetOpen(false) }
    if (editing) {
      form.put(route('admin.categories.update', editing.id), options)
    } else {
      form.post(route('admin.categories.store'), options)
    }
  }

  const columns: ColumnDef<CategoryRow, unknown>[] = [
    { accessorKey: 'code', header: 'Kode' },
    { accessorKey: 'name', header: 'Nama' },
    { id: 'parent', header: 'Induk', cell: ({ row }) => row.original.parent?.name ?? '—' },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (row.original.is_active ? <Badge className="bg-success text-white">Aktif</Badge> : <Badge variant="destructive">Nonaktif</Badge>),
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
            <DropdownMenuItem
              className="text-danger"
              disabled={!row.original.is_active}
              onClick={() => router.delete(route('admin.categories.destroy', row.original.id), { preserveScroll: true })}
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
        title="Kategori"
        subtitle="Kategori produk (mendukung sub-kategori 1 tingkat)"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Kategori' }]}
        actions={<Button onClick={openCreate}>Tambah Kategori</Button>}
      />

      <DataTable columns={columns} data={categories} getRowId={(row) => String(row.id)} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Ubah Kategori' : 'Tambah Kategori'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-code">Kode</Label>
              <Input id="c-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} />
              {form.errors.code && <p className="text-sm text-danger">{form.errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nama</Label>
              <Input id="c-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
              {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Induk (opsional)</Label>
              <Select value={form.data.parent_id || 'none'} onValueChange={(v) => form.setData('parent_id', v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanpa induk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa induk</SelectItem>
                  {categories
                    .filter((c) => c.id !== editing?.id && c.parent_id === null)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Deskripsi</Label>
              <Textarea id="c-desc" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="c-active" checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', c)} />
              <Label htmlFor="c-active" className="font-normal">Aktif</Label>
            </div>
            <SheetFooter>
              <Button type="submit" disabled={form.processing}>Simpan</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
