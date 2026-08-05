import { useMemo, useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Switch } from '@/Components/ui/switch'
import { Checkbox } from '@/Components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { formatMoney } from '@/Lib/money'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }

type PromoRow = {
  id: number
  code: string
  name: string
  type: string
  scope: string
  discount_type: string
  discount_value: number
  max_discount: number | null
  min_purchase: number | null
  min_qty: string | null
  buy_qty: string | null
  get_qty: string | null
  get_product_id: number | null
  tiers: { min_qty: number; discount: number }[] | null
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  days_of_week: number[] | null
  quota_total: number | null
  quota_per_member: number | null
  used_count: number
  priority: number
  is_stackable: boolean
  is_public: boolean
  is_active: boolean
  products: Ref[]
  categories: Ref[]
}

type PromosIndexProps = {
  tab: string
  promos: Paginated<PromoRow>
  products: Ref[]
  categories: Ref[]
  filters: { type?: string }
}

const TYPE_LABELS: Record<string, string> = {
  product: 'Diskon Produk',
  category: 'Diskon Kategori',
  member_level: 'Diskon Member Level',
  bundle: 'Bundling',
  buy_x_get_y: 'Beli X Gratis Y',
  tiered_qty: 'Diskon Bertingkat',
  happy_hour: 'Happy Hour',
  clearance: 'Clearance',
  birthday: 'Ulang Tahun',
}

// Gap G-01: PromoEngine::matchesProduct() tidak pernah menerapkan tipe ini
// (default => false) — diskon level anggota berjalan otomatis dari Level
// Keanggotaan, bonus ulang tahun dari proses terjadwal, BUKAN dari record
// Promo. Disembunyikan dari pilihan promo BARU; nilai lama tetap bisa
// dibuka/dinonaktifkan (lihat isLegacyType di bawah).
const LEGACY_TYPES = ['member_level', 'birthday']
const SELECTABLE_TYPE_ENTRIES = Object.entries(TYPE_LABELS).filter(([value]) => !LEGACY_TYPES.includes(value))

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

type Tier = { min_qty: number | ''; discount: number | '' }

type PromoForm = {
  code: string
  name: string
  description: string
  type: string
  scope: string
  discount_type: string
  discount_value: number
  max_discount: number | ''
  min_purchase: number | ''
  min_qty: number | ''
  buy_qty: number | ''
  get_qty: number | ''
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  days_of_week: number[]
  quota_total: number | ''
  quota_per_member: number | ''
  priority: number
  is_stackable: boolean
  is_public: boolean
  is_active: boolean
  product_ids: number[]
  category_ids: number[]
  tiers: Tier[]
}

const emptyForm: PromoForm = {
  code: '', name: '', description: '', type: 'product', scope: 'item', discount_type: 'percent',
  discount_value: 0, max_discount: '', min_purchase: '', min_qty: '', buy_qty: '', get_qty: '',
  start_date: '', end_date: '', start_time: '', end_time: '', days_of_week: [],
  quota_total: '', quota_per_member: '', priority: 0, is_stackable: false, is_public: false,
  is_active: true, product_ids: [], category_ids: [], tiers: [],
}

export default function Index({ tab, promos, products, categories, filters }: PromosIndexProps) {
  const [typeFilter, setTypeFilter] = useState(filters.type ?? '')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PromoRow | null>(null)
  const form = useForm<PromoForm>(emptyForm)

  function applyFilter(type: string) {
    setTypeFilter(type)
    router.get(route('admin.promos.index'), { type }, { preserveState: true, replace: true })
  }

  function openCreate() {
    setEditing(null)
    form.setData({ ...emptyForm })
    setFormOpen(true)
  }

  function openEdit(promo: PromoRow) {
    setEditing(promo)
    form.setData({
      code: promo.code, name: promo.name, description: '', type: promo.type, scope: promo.scope,
      discount_type: promo.discount_type, discount_value: promo.discount_value,
      max_discount: promo.max_discount ?? '', min_purchase: promo.min_purchase ?? '',
      min_qty: promo.min_qty ? Number(promo.min_qty) : '', buy_qty: promo.buy_qty ? Number(promo.buy_qty) : '',
      get_qty: promo.get_qty ? Number(promo.get_qty) : '',
      start_date: promo.start_date ?? '', end_date: promo.end_date ?? '',
      start_time: promo.start_time ?? '', end_time: promo.end_time ?? '',
      days_of_week: promo.days_of_week ?? [], quota_total: promo.quota_total ?? '',
      quota_per_member: promo.quota_per_member ?? '', priority: promo.priority,
      is_stackable: promo.is_stackable, is_public: promo.is_public, is_active: promo.is_active,
      product_ids: promo.products.map((p) => p.id), category_ids: promo.categories.map((c) => c.id),
      tiers: (promo.tiers ?? []).map((t) => ({ min_qty: Number(t.min_qty), discount: Number(t.discount) })),
    })
    setFormOpen(true)
  }

  // Gap G-01: tipe promo yang tidak diterapkan mesin diskon checkout —
  // dipertahankan hanya agar promo LAMA bertipe ini tetap bisa dibuka/
  // dinonaktifkan, bukan untuk dipilih pada promo baru (lihat SELECTABLE_TYPE_ENTRIES).
  const isLegacyType = LEGACY_TYPES.includes(form.data.type)

  // Gap G-02: PromoEngine::tieredDiscountAmount() membaca `tiers`, bukan
  // `min_qty` tunggal — beralih ke/dari tiered_qty menyesuaikan `tiers` agar
  // form selalu konsisten dengan apa yang benar-benar dipakai mesin diskon.
  function handleTypeChange(value: string) {
    form.setData({
      ...form.data,
      type: value,
      tiers: value === 'tiered_qty' ? (form.data.tiers.length ? form.data.tiers : [{ min_qty: '', discount: '' }]) : [],
    })
  }

  function addTier() {
    form.setData({ ...form.data, tiers: [...form.data.tiers, { min_qty: '', discount: '' }] })
  }

  function removeTier(index: number) {
    form.setData({ ...form.data, tiers: form.data.tiers.filter((_, i) => i !== index) })
  }

  function updateTier(index: number, field: 'min_qty' | 'discount', value: number | '') {
    form.setData({
      ...form.data,
      tiers: form.data.tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    })
  }

  const duplicateTierQty = useMemo(() => {
    const values = form.data.tiers.map((t) => t.min_qty).filter((v) => v !== '')
    return new Set(values).size !== values.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data.tiers])

  const submit: FormEventHandler = (e) => {
    e.preventDefault()

    const options = {
      preserveScroll: true,
      onSuccess: () => setFormOpen(false),
    }

    if (editing) {
      form.put(route('admin.promos.update', editing.id), options)
    } else {
      form.post(route('admin.promos.store'), options)
    }
  }

  function toggleDay(day: number) {
    const current = form.data.days_of_week
    form.setData('days_of_week', current.includes(day) ? current.filter((d) => d !== day) : [...current, day])
  }

  function toggleActive(promo: PromoRow) {
    router.put(route('admin.promos.toggle', promo.id), {}, { preserveScroll: true })
  }

  const columns: ColumnDef<PromoRow, unknown>[] = useMemo(() => [
    { accessorKey: 'code', header: 'Kode' },
    { accessorKey: 'name', header: 'Nama' },
    { id: 'type', header: 'Tipe', cell: ({ row }) => TYPE_LABELS[row.original.type] ?? row.original.type },
    {
      id: 'discount',
      header: 'Diskon',
      cell: ({ row }) => {
        const p = row.original
        if (p.discount_type === 'percent') return `${p.discount_value}%`
        if (p.discount_type === 'amount') return formatMoney(p.discount_value)
        return p.discount_type
      },
    },
    { id: 'usage', header: 'Pemakaian', cell: ({ row }) => `${row.original.used_count}${row.original.quota_total ? ` / ${row.original.quota_total}` : ''}` },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={row.original.is_active ? 'bg-success text-white' : 'bg-slate-400 text-white'}>
          {row.original.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>Ubah</Button>
          <Button size="sm" variant="outline" onClick={() => toggleActive(row.original)}>
            {row.original.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Promo"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Promo' }]}
        actions={<Button onClick={openCreate}>Tambah Promo</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'promos', label: 'Promo', href: route('admin.promos.index'), permission: 'promo.view' },
        { key: 'coupons', label: 'Kupon', href: route('admin.coupons.index'), permission: 'coupon.view' },
      ]} />

      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-content-muted">
        <b>Diskon Member Level</b> dan <b>Ulang Tahun</b> tidak tersedia untuk promo baru — keduanya tidak diterapkan mesin diskon saat checkout.
        Diskon level anggota berjalan otomatis dari pengaturan Level Keanggotaan; bonus ulang tahun berjalan dari proses terjadwal tersendiri.
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter || 'all'} onValueChange={(v) => applyFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-56">
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
        data={promos.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: promos.current_page,
          perPage: promos.per_page,
          total: promos.total,
          onPageChange: (page) => router.get(route('admin.promos.index'), { type: typeFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Ubah Promo — ${editing.name}` : 'Tambah Promo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode</Label>
                <Input value={form.data.code} onChange={(e) => form.setData('code', e.target.value.toUpperCase())} />
                {form.errors.code && <p className="text-sm text-danger">{form.errors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipe Promo</Label>
                {isLegacyType ? (
                  <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                    <span className="font-medium">{TYPE_LABELS[form.data.type]}</span> — tipe ini tidak lagi didukung mesin diskon checkout.
                    Promo lama ini bisa dinonaktifkan, tapi tipenya tidak bisa diubah menjadi tipe ini lagi untuk promo baru.
                  </div>
                ) : (
                  <Select value={form.data.type} onValueChange={handleTypeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SELECTABLE_TYPE_ENTRIES.map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {form.errors.type && <p className="text-sm text-danger">{form.errors.type}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Cakupan</Label>
                <Select value={form.data.scope} onValueChange={(v) => form.setData('scope', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">Per Item</SelectItem>
                    <SelectItem value="bill">Per Nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Jenis Diskon</Label>
                <Select value={form.data.discount_type} onValueChange={(v) => form.setData('discount_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Persen</SelectItem>
                    <SelectItem value="amount">Nominal</SelectItem>
                    <SelectItem value="fixed_price">Harga Tetap</SelectItem>
                    <SelectItem value="free_item">Gratis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nilai Diskon</Label>
                <Input type="number" value={form.data.discount_value} onChange={(e) => form.setData('discount_value', Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Maks. Diskon (opsional)</Label>
                <Input type="number" value={form.data.max_discount} onChange={(e) => form.setData('max_discount', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </div>

            {(form.data.type === 'product' || form.data.type === 'buy_x_get_y' || form.data.type === 'bundle' || form.data.type === 'tiered_qty' || form.data.type === 'happy_hour') && (
              <div className="space-y-1.5">
                <Label>Produk Sasaran (kosongkan = semua produk)</Label>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 py-1 text-sm">
                      <Checkbox
                        checked={form.data.product_ids.includes(p.id)}
                        onCheckedChange={(checked) => form.setData('product_ids', checked ? [...form.data.product_ids, p.id] : form.data.product_ids.filter((id) => id !== p.id))}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.data.type === 'category' && (
              <div className="space-y-1.5">
                <Label>Kategori Sasaran</Label>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2">
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                      <Checkbox
                        checked={form.data.category_ids.includes(c.id)}
                        onCheckedChange={(checked) => form.setData('category_ids', checked ? [...form.data.category_ids, c.id] : form.data.category_ids.filter((id) => id !== c.id))}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.data.type === 'buy_x_get_y' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Beli Qty</Label>
                  <Input type="number" value={form.data.buy_qty} onChange={(e) => form.setData('buy_qty', e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gratis Qty</Label>
                  <Input type="number" value={form.data.get_qty} onChange={(e) => form.setData('get_qty', e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
            )}

            {form.data.type === 'bundle' && (
              <div className="space-y-1.5">
                <Label>Minimal Qty</Label>
                <Input type="number" value={form.data.min_qty} onChange={(e) => form.setData('min_qty', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            )}

            {form.data.type === 'tiered_qty' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tingkatan Diskon (Tier)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addTier}>+ Tambah Tier</Button>
                </div>
                <p className="text-xs text-content-muted">
                  Tier dengan Minimal Qty tertinggi yang terpenuhi oleh qty pembelian yang dipakai — bukan akumulasi semua tier.
                </p>

                {form.data.tiers.length === 0 && (
                  <p className="text-sm text-danger">Tambahkan minimal 1 tier — tanpa tier, promo ini tidak memberi diskon sama sekali.</p>
                )}

                <div className="space-y-2">
                  {form.data.tiers.map((tier, index) => (
                    <div key={index} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Minimal Qty</Label>
                        <Input
                          type="number" min={0} step="0.001" value={tier.min_qty}
                          onChange={(e) => updateTier(index, 'min_qty', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Diskon (%)</Label>
                        <Input
                          type="number" min={0} max={100} value={tier.discount}
                          onChange={(e) => updateTier(index, 'discount', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => removeTier(index)}>Hapus</Button>
                    </div>
                  ))}
                </div>

                {duplicateTierQty && <p className="text-sm text-danger">Minimal Qty tidak boleh sama antar tier.</p>}
                {form.errors.tiers && <p className="text-sm text-danger">{form.errors.tiers}</p>}
              </div>
            )}

            {form.data.type === 'happy_hour' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Jam Mulai</Label>
                    <Input type="time" value={form.data.start_time} onChange={(e) => form.setData('start_time', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jam Selesai</Label>
                    <Input type="time" value={form.data.end_time} onChange={(e) => form.setData('end_time', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Hari</Label>
                  <div className="flex gap-2">
                    {DAY_LABELS.map((label, index) => {
                      const day = index + 1
                      return (
                        <Button
                          key={day}
                          type="button"
                          size="sm"
                          variant={form.data.days_of_week.includes(day) ? 'default' : 'outline'}
                          onClick={() => toggleDay(day)}
                        >
                          {label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tanggal Mulai (opsional)</Label>
                <Input type="date" value={form.data.start_date} onChange={(e) => form.setData('start_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Selesai (opsional)</Label>
                <Input type="date" value={form.data.end_date} onChange={(e) => form.setData('end_date', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Kuota Total (opsional)</Label>
                <Input type="number" value={form.data.quota_total} onChange={(e) => form.setData('quota_total', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Kuota per Anggota</Label>
                <Input type="number" value={form.data.quota_per_member} onChange={(e) => form.setData('quota_per_member', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Prioritas</Label>
                <Input type="number" value={form.data.priority} onChange={(e) => form.setData('priority', Number(e.target.value))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.data.is_stackable} onCheckedChange={(v) => form.setData('is_stackable', v)} />
                Bisa ditumpuk
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.data.is_public} onCheckedChange={(v) => form.setData('is_public', v)} />
                Tampil di storefront
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', v)} />
                Aktif
              </label>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={form.processing || (form.data.type === 'tiered_qty' && (form.data.tiers.length === 0 || duplicateTierQty))}
              >
                {editing ? 'Simpan Perubahan' : 'Buat Promo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
