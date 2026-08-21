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
import { Search, Filter, CheckSquare, RotateCcw, X, Plus, Trash2, Tag, Percent, Sparkles, Layers, ShoppingBag, Package, Receipt, Folder } from 'lucide-react'

type Ref = {
  id: number
  name: string
  sku?: string | null
  category_id?: number | null
  category?: { id: number; name: string } | null
}

type PromoRow = {
  id: number
  code: string
  name: string
  description?: string | null
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
  product: 'Diskon Barang Tertentu',
  category: 'Diskon Kategori Barang',
  bundle: 'Paket Hemat (Bundling)',
  buy_x_get_y: 'Beli X Gratis Y (Buy 1 Get 1)',
  tiered_qty: 'Makin Banyak Makin Murah (Grosir/Bertingkat)',
  happy_hour: 'Diskon Jam Tertentu (Flash Sale / Jam Khusus)',
  clearance: 'Cuci Gudang (Habiskan Stok)',
  member_level: 'Diskon Member Level (Sistem)',
  birthday: 'Bonus Ulang Tahun (Sistem)',
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  product: 'Potongan harga khusus untuk satu atau beberapa barang pilihan.',
  category: 'Diskon untuk seluruh barang yang berada di dalam satu kategori terpilih.',
  bundle: 'Beli minimal jumlah tertentu langsung dapat harga paket lebih hemat.',
  buy_x_get_y: 'Beli sejumlah barang tertentu dan dapatkan gratis barang.',
  tiered_qty: 'Tingkatan diskon makin tinggi seiring bertambahnya jumlah pembelian.',
  happy_hour: 'Diskon yang hanya berlaku pada jam dan hari-hari tertentu.',
  clearance: 'Potongan harga besar untuk mengosongkan dan menghabiskan stok lama.',
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

  // Filter state for product selection
  const [prodSearch, setProdSearch] = useState('')
  const [selectedCatFilters, setSelectedCatFilters] = useState<number[]>([])
  const [prodFilterTab, setProdFilterTab] = useState<'all' | 'selected'>('all')

  // Sub-modal filter state for category selection
  const [catFilterModalOpen, setCatFilterModalOpen] = useState(false)
  const [catModalSearch, setCatModalSearch] = useState('')

  // Filter state for category selection (promo tipe category)
  const [catSearch, setCatSearch] = useState('')

  function applyFilter(type: string) {
    setTypeFilter(type)
    router.get(route('admin.promos.index'), { type }, { preserveState: true, replace: true })
  }

  function resetFilters() {
    setProdSearch('')
    setSelectedCatFilters([])
    setProdFilterTab('all')
    setCatSearch('')
    setCatModalSearch('')
  }

  function openCreate() {
    setEditing(null)
    resetFilters()
    form.setData({ ...emptyForm })
    setFormOpen(true)
  }

  function openEdit(promo: PromoRow) {
    setEditing(promo)
    resetFilters()
    form.setData({
      code: promo.code, name: promo.name, description: promo.description ?? '', type: promo.type, scope: promo.scope,
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

  const isLegacyType = LEGACY_TYPES.includes(form.data.type)

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
  }, [form.data.tiers])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCatFilters.length > 0 && (!p.category_id || !selectedCatFilters.includes(p.category_id))) {
        return false
      }
      if (prodFilterTab === 'selected' && !form.data.product_ids.includes(p.id)) {
        return false
      }
      if (prodSearch.trim()) {
        const q = prodSearch.toLowerCase()
        const matchName = p.name.toLowerCase().includes(q)
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false
        const matchCat = p.category?.name ? p.category.name.toLowerCase().includes(q) : false
        if (!matchName && !matchSku && !matchCat) return false
      }
      return true
    })
  }, [products, selectedCatFilters, prodFilterTab, prodSearch, form.data.product_ids])

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories
    const q = catSearch.toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, catSearch])

  const modalFilteredCategories = useMemo(() => {
    if (!catModalSearch.trim()) return categories
    const q = catModalSearch.toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, catModalSearch])

  function selectAllFilteredProducts() {
    const idsToAdd = filteredProducts.map((p) => p.id)
    const newSet = new Set([...form.data.product_ids, ...idsToAdd])
    form.setData('product_ids', Array.from(newSet))
  }

  function unselectAllFilteredProducts() {
    const idsToRemove = new Set(filteredProducts.map((p) => p.id))
    form.setData('product_ids', form.data.product_ids.filter((id) => !idsToRemove.has(id)))
  }

  function resetProductSelection() {
    form.setData('product_ids', [])
  }

  function selectAllFilteredCategories() {
    const idsToAdd = filteredCategories.map((c) => c.id)
    const newSet = new Set([...form.data.category_ids, ...idsToAdd])
    form.setData('category_ids', Array.from(newSet))
  }

  function resetCategorySelection() {
    form.setData('category_ids', [])
  }

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
    { accessorKey: 'name', header: 'Nama Promo' },
    { id: 'type', header: 'Jenis Promo', cell: ({ row }) => TYPE_LABELS[row.original.type] ?? row.original.type },
    {
      id: 'discount',
      header: 'Potongan Diskon',
      cell: ({ row }) => {
        const p = row.original
        if (p.discount_type === 'percent') return `${p.discount_value}%`
        if (p.discount_type === 'amount') return formatMoney(p.discount_value)
        if (p.discount_type === 'fixed_price') return `Harga Pas ${formatMoney(p.discount_value)}`
        if (p.discount_type === 'free_item') return 'Gratis Barang'
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

  const hasProductSelection = form.data.type === 'product' || form.data.type === 'buy_x_get_y' || form.data.type === 'bundle' || form.data.type === 'tiered_qty' || form.data.type === 'happy_hour'

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Promo & Diskon Kasir"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Promo' }]}
        actions={<Button onClick={openCreate} className="gap-2"><Plus className="size-4" /> Tambah Promo Baru</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'promos', label: 'Promo Toko', href: route('admin.promos.index'), permission: 'promo.view' },
        { key: 'coupons', label: 'Kupon / Voucher', href: route('admin.coupons.index'), permission: 'coupon.view' },
      ]} />

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-content-muted flex items-start gap-2.5">
        <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
        <div>
          <b>Diskon Toko:</b> Promo yang aktif akan diterapkan secara otomatis oleh sistem mesin kasir POS saat barang yang sesuai dimasukkan ke keranjang belanja.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter || 'all'} onValueChange={(v) => applyFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Semua Jenis Promo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis Promo</SelectItem>
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

      {/* Dialog Modal Tambah / Edit Promo (Lebar, Proporsional, Bersih) */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="flex flex-col h-[90vh] max-h-[90vh] w-[96vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl overflow-hidden p-0 rounded-2xl shadow-2xl border-border bg-card">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Tag className="size-5 text-primary" />
              {editing ? `Ubah Promo — ${editing.name}` : 'Tambah Promo Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Kolom Kiri: Pengaturan Dasar & Aturan Promo (5 dari 12 kolom) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Bagian 1: Identitas Promo */}
                  <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-muted/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Tag className="size-3.5" /> 1. Identitas Promo
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Kode Promo</Label>
                        <Input
                          placeholder="Contoh: HEMAT10, B2G1"
                          value={form.data.code}
                          onChange={(e) => form.setData('code', e.target.value.toUpperCase())}
                        />
                        {form.errors.code && <p className="text-xs text-danger">{form.errors.code}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Nama Promo</Label>
                        <Input
                          placeholder="Contoh: Diskon Minuman"
                          value={form.data.name}
                          onChange={(e) => form.setData('name', e.target.value)}
                        />
                        {form.errors.name && <p className="text-xs text-danger">{form.errors.name}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Keterangan / Deskripsi (Opsional)</Label>
                      <Textarea
                        rows={2}
                        placeholder="Jelaskan syarat dan ketentuan promo..."
                        value={form.data.description}
                        onChange={(e) => form.setData('description', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Bagian 2: Tipe & Bentuk Diskon */}
                  <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-muted/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Percent className="size-3.5" /> 2. Jenis &amp; Nilai Potongan
                    </h4>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Jenis Promo</Label>
                      {isLegacyType ? (
                        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                          <span className="font-medium">{TYPE_LABELS[form.data.type]}</span>
                        </div>
                      ) : (
                        <Select value={form.data.type} onValueChange={handleTypeChange}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SELECTABLE_TYPE_ENTRIES.map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                <div className="font-medium">{label}</div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {TYPE_DESCRIPTIONS[form.data.type] && (
                        <p className="text-[11px] text-content-muted">{TYPE_DESCRIPTIONS[form.data.type]}</p>
                      )}
                      {form.errors.type && <p className="text-xs text-danger">{form.errors.type}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Cakupan</Label>
                        <Select value={form.data.scope} onValueChange={(v) => form.setData('scope', v)}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="item">
                              <div className="flex items-center gap-1.5">
                                <Package className="size-3.5 text-content-muted" />
                                <span>Per Barang</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="bill">
                              <div className="flex items-center gap-1.5">
                                <Receipt className="size-3.5 text-content-muted" />
                                <span>Per Total Nota</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Bentuk Potongan</Label>
                        <Select value={form.data.discount_type} onValueChange={(v) => form.setData('discount_type', v)}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Persen (%)</SelectItem>
                            <SelectItem value="amount">Nominal (Rp)</SelectItem>
                            <SelectItem value="fixed_price">Harga Pas (Rp)</SelectItem>
                            <SelectItem value="free_item">Gratis Barang</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          {form.data.discount_type === 'percent' ? 'Besar Diskon (%)' : form.data.discount_type === 'amount' ? 'Nominal Potongan (Rp)' : form.data.discount_type === 'fixed_price' ? 'Harga Pas Jadi (Rp)' : 'Nilai'}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.data.discount_value}
                          onChange={(e) => form.setData('discount_value', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Maks. Potongan Rp</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Tak terbatas"
                          value={form.data.max_discount}
                          onChange={(e) => form.setData('max_discount', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 3: Masa Berlaku & Kuota */}
                  <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-muted/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">3. Periode &amp; Batas Kuota</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal Mulai</Label>
                        <Input type="date" value={form.data.start_date} onChange={(e) => form.setData('start_date', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal Berakhir</Label>
                        <Input type="date" value={form.data.end_date} onChange={(e) => form.setData('end_date', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Kuota Total</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Tak terbatas"
                          value={form.data.quota_total}
                          onChange={(e) => form.setData('quota_total', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Kuota / Member</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Tak terbatas"
                          value={form.data.quota_per_member}
                          onChange={(e) => form.setData('quota_per_member', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Prioritas</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={form.data.priority}
                          onChange={(e) => form.setData('priority', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Opsi Switch */}
                  <div className="flex flex-col gap-2.5 p-3.5 rounded-xl border border-border bg-muted/20">
                    <label className="flex items-center justify-between text-xs font-medium cursor-pointer">
                      <span>Bisa Ditumpuk dengan Diskon Lain</span>
                      <Switch checked={form.data.is_stackable} onCheckedChange={(v) => form.setData('is_stackable', v)} />
                    </label>
                    <label className="flex items-center justify-between text-xs font-medium cursor-pointer">
                      <span>Tampilkan di Halaman Depan / Publik</span>
                      <Switch checked={form.data.is_public} onCheckedChange={(v) => form.setData('is_public', v)} />
                    </label>
                    <label className="flex items-center justify-between text-xs font-medium cursor-pointer">
                      <span>Status Aktif</span>
                      <Switch checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', v)} />
                    </label>
                  </div>
                </div>

                {/* Kolom Kanan: Target Sasaran & Aturan Khusus (7 dari 12 kolom) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Pemilihan Produk Sasaran */}
                  {hasProductSelection && (
                    <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4 flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <Label className="text-xs font-bold flex items-center gap-1.5 text-primary">
                            <ShoppingBag className="size-4" />
                            Pilih Barang Sasaran Promo
                          </Label>
                          <p className="text-[11px] text-content-muted">
                            Kosongkan pilihan jika promo otomatis berlaku untuk <b>semua barang</b> di toko.
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary shrink-0 self-start sm:self-auto">
                          {form.data.product_ids.length} Barang Dipilih
                        </span>
                      </div>

                      {/* Toolbar Filter & Pencarian Produk */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                        <div className="sm:col-span-5">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCatFilterModalOpen(true)}
                            className="h-8.5 text-xs bg-background w-full flex items-center justify-between gap-2 px-3 border-border hover:border-primary/50"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Folder className="size-3.5 text-primary shrink-0" />
                              <span className="truncate">
                                {selectedCatFilters.length === 0
                                  ? 'Semua Kategori (Filter)'
                                  : `${selectedCatFilters.length} Kategori Dipilih`}
                              </span>
                            </div>
                            {selectedCatFilters.length > 0 ? (
                              <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-mono">
                                {selectedCatFilters.length}
                              </Badge>
                            ) : (
                              <Filter className="size-3 text-content-muted shrink-0" />
                            )}
                          </Button>
                        </div>

                        <div className="sm:col-span-7 relative">
                          <Search className="size-3.5 absolute left-2.5 top-2.5 text-content-muted" />
                          <Input
                            className="h-8.5 pl-8 text-xs bg-background"
                            placeholder="Ketik nama barang atau barcode..."
                            value={prodSearch}
                            onChange={(e) => setProdSearch(e.target.value)}
                          />
                          {prodSearch && (
                            <button
                              type="button"
                              onClick={() => setProdSearch('')}
                              className="absolute right-2.5 top-2 text-content-muted hover:text-content"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Filter Status & Tombol Aksi Cepat */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-0.5">
                          <button
                            type="button"
                            onClick={() => setProdFilterTab('all')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition ${prodFilterTab === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-content-muted hover:text-content'}`}
                          >
                            Semua ({products.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setProdFilterTab('selected')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition ${prodFilterTab === 'selected' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-content-muted hover:text-content'}`}
                          >
                            Hanya Terpilih ({form.data.product_ids.length})
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5"
                            onClick={selectAllFilteredProducts}
                            disabled={filteredProducts.length === 0}
                          >
                            Pilih Semua yang Tampil ({filteredProducts.length})
                          </Button>
                          {form.data.product_ids.length > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-danger hover:text-danger hover:bg-danger/10"
                              onClick={resetProductSelection}
                            >
                              Reset Pilihan
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Kotak Daftar Produk (Tinggi Lega) */}
                      <div className="min-h-[280px] max-h-[380px] overflow-y-auto rounded-xl border border-border bg-background p-2.5 divide-y divide-border/40">
                        {filteredProducts.length === 0 ? (
                          <div className="py-12 text-center text-xs text-content-muted">
                            Tidak ada barang yang cocok dengan filter atau kata kunci pencarian.
                          </div>
                        ) : (
                          filteredProducts.map((p) => {
                            const isChecked = form.data.product_ids.includes(p.id)
                            return (
                              <label
                                key={p.id}
                                className={`flex items-center justify-between gap-3 py-2 px-2.5 rounded-lg cursor-pointer transition ${isChecked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'}`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) =>
                                      form.setData(
                                        'product_ids',
                                        checked
                                          ? [...form.data.product_ids, p.id]
                                          : form.data.product_ids.filter((id) => id !== p.id)
                                      )
                                    }
                                  />
                                  <div className="truncate">
                                    <span className="font-semibold text-xs text-content block truncate">{p.name}</span>
                                    {p.sku && <span className="text-[10px] text-content-muted font-mono">{p.sku}</span>}
                                  </div>
                                </div>
                                {p.category?.name && (
                                  <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                                    {p.category.name}
                                  </Badge>
                                )}
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Kategori Sasaran */}
                  {form.data.type === 'category' && (
                    <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4 flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <Label className="text-xs font-bold flex items-center gap-1.5 text-primary">
                            <Layers className="size-4" />
                            Pilih Kategori Sasaran Promo
                          </Label>
                          <p className="text-[11px] text-content-muted">
                            Seluruh barang dalam kategori yang dicentang akan otomatis mendapat diskon ini.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={selectAllFilteredCategories}
                          >
                            Pilih Semua
                          </Button>
                          {form.data.category_ids.length > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-danger"
                              onClick={resetCategorySelection}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="size-3.5 absolute left-2.5 top-2.5 text-content-muted" />
                        <Input
                          className="h-8.5 pl-8 text-xs bg-background"
                          placeholder="Cari nama kategori..."
                          value={catSearch}
                          onChange={(e) => setCatSearch(e.target.value)}
                        />
                      </div>

                      <div className="min-h-[280px] max-h-[380px] overflow-y-auto rounded-xl border border-border bg-background p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredCategories.map((c) => (
                          <label key={c.id} className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg border border-border/50 hover:bg-muted/40 text-xs cursor-pointer">
                            <Checkbox
                              checked={form.data.category_ids.includes(c.id)}
                              onCheckedChange={(checked) =>
                                form.setData(
                                  'category_ids',
                                  checked
                                    ? [...form.data.category_ids, c.id]
                                    : form.data.category_ids.filter((id) => id !== c.id)
                                )
                              }
                            />
                            <span className="truncate font-medium">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Buy X Get Y */}
                  {form.data.type === 'buy_x_get_y' && (
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Beli Sebanyak (Qty X)</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Contoh: 2"
                          value={form.data.buy_qty}
                          onChange={(e) => form.setData('buy_qty', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Gratis Sebanyak (Qty Y)</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Contoh: 1"
                          value={form.data.get_qty}
                          onChange={(e) => form.setData('get_qty', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Bundling */}
                  {form.data.type === 'bundle' && (
                    <div className="space-y-1.5 p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <Label className="text-xs font-semibold">Minimal Pembelian (Qty) untuk Dapat Harga Paket</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Contoh: 3"
                        value={form.data.min_qty}
                        onChange={(e) => form.setData('min_qty', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                  )}

                  {/* Tiered / Grosir */}
                  {form.data.type === 'tiered_qty' && (
                    <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-bold">Tingkatan Diskon (Makin Banyak Makin Murah)</Label>
                          <p className="text-[11px] text-content-muted">
                            Diskon otomatis mengambil tingkatan Qty tertinggi yang terpenuhi di keranjang.
                          </p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={addTier} className="h-7 text-xs gap-1">
                          <Plus className="size-3.5" /> Tambah Tier
                        </Button>
                      </div>

                      {form.data.tiers.length === 0 && (
                        <p className="text-xs text-danger font-medium">Tambahkan minimal 1 tingkatan tier.</p>
                      )}

                      <div className="space-y-2">
                        {form.data.tiers.map((tier, index) => (
                          <div key={index} className="flex items-end gap-2 bg-background p-2.5 rounded-lg border border-border">
                            <div className="flex-1 space-y-1">
                              <Label className="text-[11px]">Beli Minimal (Qty)</Label>
                              <Input
                                type="number"
                                min={1}
                                step="1"
                                className="h-8 text-xs"
                                value={tier.min_qty}
                                onChange={(e) => updateTier(index, 'min_qty', e.target.value === '' ? '' : Number(e.target.value))}
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-[11px]">Diskon (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                className="h-8 text-xs"
                                value={tier.discount}
                                onChange={(e) => updateTier(index, 'discount', e.target.value === '' ? '' : Number(e.target.value))}
                              />
                            </div>
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeTier(index)} className="h-8 text-danger hover:text-danger hover:bg-danger/10">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {duplicateTierQty && <p className="text-xs text-danger">Minimal Qty tidak boleh sama antar tier.</p>}
                      {form.errors.tiers && <p className="text-xs text-danger">{form.errors.tiers}</p>}
                    </div>
                  )}

                  {/* Happy Hour */}
                  {form.data.type === 'happy_hour' && (
                    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/10">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Jam Mulai</Label>
                          <Input type="time" value={form.data.start_time} onChange={(e) => form.setData('start_time', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Jam Selesai</Label>
                          <Input type="time" value={form.data.end_time} onChange={(e) => form.setData('end_time', e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Hari Berlaku</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {DAY_LABELS.map((label, index) => {
                            const day = index + 1
                            const active = form.data.days_of_week.includes(day)
                            return (
                              <Button
                                key={day}
                                type="button"
                                size="sm"
                                variant={active ? 'default' : 'outline'}
                                className="h-7 text-xs px-2.5"
                                onClick={() => toggleDay(day)}
                              >
                                {label}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Fixed Footer (Bebas dari negative margin clipping) */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3 shrink-0 rounded-b-2xl">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="px-5">
                Batal
              </Button>
              <Button
                type="submit"
                disabled={form.processing || (form.data.type === 'tiered_qty' && (form.data.tiers.length === 0 || duplicateTierQty))}
                className="gap-2 font-semibold px-6"
              >
                {editing ? 'Simpan Perubahan Promo' : 'Buat & Aktifkan Promo'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog: Filter Kategori Produk Sasaran (Grid 4 Kolom Rapi dengan Checkbox) */}
      <Dialog open={catFilterModalOpen} onOpenChange={setCatFilterModalOpen}>
        <DialogContent className="flex flex-col h-[80vh] max-h-[80vh] w-[92vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 rounded-2xl shadow-2xl border-border bg-card">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Folder className="size-4.5 text-primary" />
              Pilih Filter Kategori Barang Sasaran
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="size-3.5 absolute left-3 top-3 text-content-muted" />
                <Input
                  placeholder="Cari nama kategori..."
                  value={catModalSearch}
                  onChange={(e) => setCatModalSearch(e.target.value)}
                  className="pl-9 text-xs bg-background h-9"
                />
                {catModalSearch && (
                  <button
                    type="button"
                    onClick={() => setCatModalSearch('')}
                    className="absolute right-3 top-2.5 text-content-muted hover:text-content"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  onClick={() => setSelectedCatFilters(categories.map((c) => c.id))}
                >
                  <CheckSquare className="size-3.5" /> Pilih Semua
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-danger hover:text-danger hover:bg-danger/10 gap-1"
                  onClick={() => setSelectedCatFilters([])}
                >
                  <RotateCcw className="size-3.5" /> Reset (Semua)
                </Button>
              </div>
            </div>

            {/* Grid 4 Kolom Kategori dengan Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[440px] overflow-y-auto p-1">
              {modalFilteredCategories.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-content-muted">
                  Tidak ada kategori yang sesuai pencarian.
                </div>
              ) : (
                modalFilteredCategories.map((cat) => {
                  const isChecked = selectedCatFilters.includes(cat.id)
                  const productCount = products.filter((p) => p.category_id === cat.id).length
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center justify-between gap-2 p-3 rounded-xl border cursor-pointer transition select-none ${
                        isChecked
                          ? 'border-primary bg-primary/10 shadow-xs'
                          : 'border-border/80 bg-card hover:bg-muted/40 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            setSelectedCatFilters((prev) =>
                              checked ? [...prev, cat.id] : prev.filter((id) => id !== cat.id)
                            )
                          }
                        />
                        <span className="text-xs font-medium text-content truncate">{cat.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono px-1.5 h-4.5 bg-background">
                        {productCount}
                      </Badge>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className="px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between gap-2 shrink-0">
            <span className="text-xs text-content-muted">
              {selectedCatFilters.length === 0
                ? 'Semua kategori aktif (tanpa filter khusus)'
                : `${selectedCatFilters.length} dari ${categories.length} kategori dipilih`}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => setCatFilterModalOpen(false)}
              className="font-semibold text-xs px-5"
            >
              Terapkan Filter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
