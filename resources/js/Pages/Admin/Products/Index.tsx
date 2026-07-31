import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Switch } from '@/Components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }
type UnitRef = { id: number; code: string; name: string }

type ProductRow = {
  id: number
  sku: string
  name: string
  category: Ref | null
  brand: Ref | null
  base_unit: UnitRef
  is_active: boolean
  is_favorite: boolean
  is_visible_public: boolean
  barcodes: { id: number; barcode: string; is_primary: boolean }[]
  prices: { id: number; price: number; outlet_id: number }[]
}

type ProductsIndexProps = {
  products: Paginated<ProductRow>
  categories: Ref[]
  brands: Ref[]
  units: UnitRef[]
  outlets: Ref[]
  filters: { search?: string; category_id?: string; brand_id?: string; status?: string }
  canViewCost: boolean
}

type BarcodeField = { barcode: string; unit_id: string; is_primary: boolean }

const emptyForm = {
  sku: '',
  name: '',
  category_id: '',
  brand_id: '',
  base_unit_id: '',
  description: '',
  is_expirable: false as boolean,
  is_consignment: false as boolean,
  consignment_percent: '',
  min_stock: 0,
  max_stock: '',
  is_active: true as boolean,
  is_favorite: false as boolean,
  is_visible_public: false as boolean,
  description_public: '',
  barcodes: [] as BarcodeField[],
  price: { outlet_id: '', unit_id: '', price: 0, member_price: null as number | null },
}

export default function Index({ products, categories, brands, units, outlets, filters, canViewCost }: ProductsIndexProps) {
  const [search, setSearch] = useState(filters.search ?? '')
  const [categoryFilter, setCategoryFilter] = useState(filters.category_id ?? '')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const form = useForm(emptyForm)

  function applyFilter() {
    router.get(route('admin.products.index'), { search, category_id: categoryFilter }, { preserveState: true, replace: true })
  }

  function openCreate() {
    setEditing(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: ProductRow) {
    setEditing(row)
    form.setData({
      sku: row.sku,
      name: row.name,
      category_id: row.category ? String(row.category.id) : '',
      brand_id: row.brand ? String(row.brand.id) : '',
      base_unit_id: String(row.base_unit.id),
      description: '',
      is_expirable: false,
      is_consignment: false,
      consignment_percent: '',
      min_stock: 0,
      max_stock: '',
      is_active: row.is_active,
      is_favorite: row.is_favorite,
      is_visible_public: row.is_visible_public,
      description_public: '',
      barcodes: row.barcodes.map((b) => ({ barcode: b.barcode, unit_id: String(row.base_unit.id), is_primary: b.is_primary })),
      price: { outlet_id: '', unit_id: '', price: 0, member_price: null },
    })
    form.clearErrors()
    setSheetOpen(true)
  }

  function addBarcode() {
    form.setData('barcodes', [...form.data.barcodes, { barcode: '', unit_id: form.data.base_unit_id, is_primary: form.data.barcodes.length === 0 }])
  }

  function removeBarcode(index: number) {
    form.setData('barcodes', form.data.barcodes.filter((_, i) => i !== index))
  }

  function updateBarcode(index: number, patch: Partial<BarcodeField>) {
    form.setData('barcodes', form.data.barcodes.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    const options = { preserveScroll: true as const, onSuccess: () => setSheetOpen(false) }
    if (editing) {
      form.put(route('admin.products.update', editing.id), options)
    } else {
      form.post(route('admin.products.store'), options)
    }
  }

  const columns: ColumnDef<ProductRow, unknown>[] = [
    { accessorKey: 'sku', header: 'SKU' },
    { accessorKey: 'name', header: 'Nama' },
    { id: 'category', header: 'Kategori', cell: ({ row }) => row.original.category?.name ?? '—' },
    {
      id: 'price',
      header: 'Harga',
      cell: ({ row }) => (row.original.prices[0] ? <Money amount={row.original.prices[0].price} /> : '—'),
    },
    {
      id: 'flags',
      header: 'Tanda',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.is_favorite && <Badge className="bg-gold text-navy-900">Favorit</Badge>}
          {row.original.is_visible_public && <Badge className="bg-teal text-white">Publik</Badge>}
        </div>
      ),
    },
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
              onClick={() => router.delete(route('admin.products.destroy', row.original.id), { preserveScroll: true })}
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
        title="Produk"
        subtitle={canViewCost ? 'HPP & margin tampil (izin product.view_cost)' : undefined}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Produk' }]}
        actions={<Button onClick={openCreate}>Tambah Produk</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Cari nama/SKU/barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
          className="max-w-xs"
        />
        <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={applyFilter}>Terapkan</Button>
      </div>

      <DataTable
        columns={columns}
        data={products.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: products.current_page,
          perPage: products.per_page,
          total: products.total,
          onPageChange: (page) => router.get(route('admin.products.index'), { search, category_id: categoryFilter, page }, { preserveState: true }),
        }}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editing ? 'Ubah Produk' : 'Tambah Produk'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-4 pb-4">
            <Tabs defaultValue="umum">
              <TabsList>
                <TabsTrigger value="umum">Umum</TabsTrigger>
                <TabsTrigger value="barcode">Barcode</TabsTrigger>
                {!editing && <TabsTrigger value="harga">Harga</TabsTrigger>}
                <TabsTrigger value="stok">Stok Min-Maks</TabsTrigger>
              </TabsList>

              <TabsContent value="umum" className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-sku">SKU</Label>
                  <Input id="p-sku" value={form.data.sku} onChange={(e) => form.setData('sku', e.target.value)} />
                  {form.errors.sku && <p className="text-sm text-danger">{form.errors.sku}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">Nama</Label>
                  <Input id="p-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                  {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select value={form.data.category_id || 'none'} onValueChange={(v) => form.setData('category_id', v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa kategori</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Select value={form.data.brand_id || 'none'} onValueChange={(v) => form.setData('brand_id', v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa brand</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Satuan Dasar</Label>
                  <Select value={form.data.base_unit_id} onValueChange={(v) => form.setData('base_unit_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.errors.base_unit_id && <p className="text-sm text-danger">{form.errors.base_unit_id}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-desc">Deskripsi</Label>
                  <Textarea id="p-desc" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="p-expirable" checked={form.data.is_expirable} onCheckedChange={(c) => form.setData('is_expirable', c)} />
                  <Label htmlFor="p-expirable" className="font-normal">Produk kadaluwarsa (wajib tanggal saat terima)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="p-favorite" checked={form.data.is_favorite} onCheckedChange={(c) => form.setData('is_favorite', c)} />
                  <Label htmlFor="p-favorite" className="font-normal">Favorit (tombol cepat kasir)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="p-public" checked={form.data.is_visible_public} onCheckedChange={(c) => form.setData('is_visible_public', c)} />
                  <Label htmlFor="p-public" className="font-normal">Tampil di storefront publik</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="p-active" checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', c)} />
                  <Label htmlFor="p-active" className="font-normal">Aktif</Label>
                </div>
              </TabsContent>

              <TabsContent value="barcode" className="flex flex-col gap-3">
                {form.data.barcodes.map((b, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label>Barcode</Label>
                      <Input value={b.barcode} onChange={(e) => updateBarcode(index, { barcode: e.target.value })} />
                    </div>
                    <div className="w-28 space-y-1.5">
                      <Label>Satuan</Label>
                      <Select value={b.unit_id} onValueChange={(v) => updateBarcode(index, { unit_id: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeBarcode(index)}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addBarcode} className="w-fit">
                  <Plus className="size-3.5" /> Tambah Barcode
                </Button>
              </TabsContent>

              {!editing && (
                <TabsContent value="harga" className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <Label>Outlet</Label>
                    <Select value={form.data.price.outlet_id} onValueChange={(v) => form.setData('price', { ...form.data.price, outlet_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih outlet" />
                      </SelectTrigger>
                      <SelectContent>
                        {outlets.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Satuan Harga</Label>
                    <Select value={form.data.price.unit_id} onValueChange={(v) => form.setData('price', { ...form.data.price, unit_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih satuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Harga Jual</Label>
                    <MoneyInput value={form.data.price.price} onChange={(v) => form.setData('price', { ...form.data.price, price: v })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Harga Anggota (opsional)</Label>
                    <MoneyInput
                      value={form.data.price.member_price ?? 0}
                      onChange={(v) => form.setData('price', { ...form.data.price, member_price: v || null })}
                    />
                  </div>
                </TabsContent>
              )}

              <TabsContent value="stok" className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-min">Stok Minimum</Label>
                  <Input
                    id="p-min"
                    type="number"
                    min={0}
                    value={form.data.min_stock}
                    onChange={(e) => form.setData('min_stock', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-max">Stok Maksimum</Label>
                  <Input
                    id="p-max"
                    type="number"
                    min={0}
                    value={form.data.max_stock}
                    onChange={(e) => form.setData('max_stock', e.target.value)}
                  />
                  {form.errors.max_stock && <p className="text-sm text-danger">{form.errors.max_stock}</p>}
                </div>
              </TabsContent>
            </Tabs>

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
