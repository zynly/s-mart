# REVISI UI — LAYAR KASIR, FILTER KOLOM & LEBAR MODAL

> **Baca dulu sebelum mengerjakan:**
> 1. `@README-v2.md` — stack, aturan kode, token warna
> 2. `@REVISI-R1-v2.md` — keputusan yang sudah dikunci
> 3. `@fase-08-v2.md` — spesifikasi layar kasir
> 4. `@fase-ui-01-v2.md` — token warna dan aturan komponen
>
> Konfirmasi sebelum mulai:
> - Token warna apa yang dipakai untuk sidebar kasir?
> - Komponen apa yang dipakai untuk tabel data?
> - Apa nama guard untuk auth kasir?

---

## BAGIAN 1 — DESAIN ULANG LAYAR KASIR

Referensi visual: gambar yang dilampirkan.
Implementasikan PERSIS seperti referensi — layout, warna, komponen,
posisi elemen.

### 1.1 Struktur keseluruhan

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER (navy-900, h-14)                                             │
├────────────────────────────────────────┬─────────────────────────────┤
│  AREA KIRI (flex-1)                    │  PANEL KANAN (w-[420px])    │
│  ┌─────────────────────────────────┐   │                             │
│  │  Search Bar                     │   │  PELANGGAN / MEMBER         │
│  └─────────────────────────────────┘   │  RINGKASAN                  │
│   PRODUK CEPAT (carousel)              │  TOMBOL BAYAR               │
│                                        │                             │
│                                        │                             │
│  KERANJANG TRANSAKSI (tabel)           │                             │
├────────────────────────────────────────┴─────────────────────────────┤
│  FOOTER HOTKEY BAR (navy-900, h-16)         CASH MASUK / CASH KELUAR │
└──────────────────────────────────────────────────────────────────────┘
```

Layout: `flex flex-col h-screen overflow-hidden`
Baris tengah: `flex flex-1 overflow-hidden`
Area kiri: `flex-1 flex flex-col overflow-hidden p-4 gap-4`
Panel kanan: `w-[420px] shrink-0 border-l border-border flex flex-col p-4 gap-4`

### 1.2 Header

```tsx
// Tinggi: h-14, background: bg-navy-900, px-6
// Teks putih semua

<header className="h-14 bg-navy-900 flex items-center px-6 gap-4
                   shrink-0">

  {/* Kiri: Nama toko */}
  <span className="text-white font-bold text-xl tracking-wide">
    SKILLAGE MART
  </span>

  {/* Tengah: Info kasir — gunakan komponen pill/badge */}
  <div className="flex items-center gap-2 ml-4">

    {/* Kasir */}
    <div className="flex items-center gap-2 bg-navy-800 text-white
                    text-sm px-3 py-1.5 rounded-full border
                    border-navy-700">
      <UserIcon className="w-4 h-4" />
      Kasir: {namaKasir}
    </div>

    {/* Shift Aktif */}
    <div className="bg-navy-700 text-white text-sm px-3 py-1.5
                    rounded-full border border-blue-500">
      Shift Aktif
    </div>

    {/* Online/Offline */}
    <div className="flex items-center gap-1.5 bg-navy-800 text-white
                    text-sm px-3 py-1.5 rounded-full">
      <span className={cn(
        "w-2 h-2 rounded-full",
        isOnline ? "bg-green-400" : "bg-red-400"
      )} />
      {isOnline ? "Online" : "Offline"}
    </div>

    {/* Jam */}
    <div className="flex items-center gap-1.5 bg-navy-800 text-white
                    text-sm px-3 py-1.5 rounded-full">
      <ClockIcon className="w-4 h-4" />
      {jam}  {/* update tiap detik */}
    </div>

  </div>

  {/* Kanan: Tombol Keluar */}
  <div className="ml-auto">
    <button className="flex items-center gap-2 bg-transparent
                       border border-white/30 text-white text-sm
                       px-4 py-1.5 rounded-full hover:bg-white/10
                       transition-colors">
      <LockIcon className="w-4 h-4" />
      Keluar
    </button>
  </div>

</header>
```

### 1.3 Search bar

```tsx
// Background: white, border: border-gray-200, rounded-xl, h-12
// Ikon search kiri, ikon barcode kanan

<div className="relative">
  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2
                          w-5 h-5 text-gray-400" />
  <input
    ref={barcodeRef}
    type="text"
    placeholder="Scan barcode atau cari produk..."
    className="w-full h-12 pl-12 pr-12 rounded-xl border
               border-gray-200 bg-white text-sm
               focus:outline-none focus:ring-2 focus:ring-navy-500
               focus:border-transparent"
    onKeyDown={handleScan}
  />
  <BarcodeIcon className="absolute right-4 top-1/2 -translate-y-1/2
                            w-5 h-5 text-gray-400" />
</div>
```

### 1.4 Produk Cepat (carousel horizontal)

```tsx
// Label: "PRODUK CEPAT" — teks kecil bold navy, uppercase, tracking-wide
// Carousel: scroll horizontal dengan tombol panah kiri-kanan
// Setiap kartu: rounded-xl border bg-white p-3 text-center
//   lebar fixed w-[160px] shrink-0

<section>
  <h2 className="text-xs font-bold text-navy-600 uppercase
                 tracking-widest mb-3">
    Produk Cepat
  </h2>

  <div className="relative">
    {/* Tombol kiri */}
    <button className="absolute left-0 top-1/2 -translate-y-1/2
                        z-10 w-8 h-8 bg-white border border-gray-200
                        rounded-full shadow flex items-center
                        justify-center hover:bg-gray-50 -ml-4">
      <ChevronLeftIcon className="w-4 h-4" />
    </button>

    {/* Kartu produk scroll */}
    <div className="flex gap-3 overflow-x-auto scrollbar-none
                    scroll-smooth px-1">
      {favorites.map(product => (
        <button
          key={product.id}
          onClick={() => addToCart(product)}
          className="w-[155px] shrink-0 bg-white border border-gray-200
                     rounded-xl p-3 text-left hover:border-navy-400
                     hover:shadow-sm transition-all group"
        >
          {/* Gambar produk */}
          <div className="w-full aspect-square mb-2 rounded-lg
                          overflow-hidden bg-gray-50">
            <img
              src={product.image_url ?? '/produk/_placeholder.png'}
              alt={product.name}
              className="w-full h-full object-contain p-1"
              loading="lazy"
            />
          </div>

          {/* Nama */}
          <p className="text-xs font-medium text-gray-800 line-clamp-2
                        leading-tight mb-1">
            {product.name}
          </p>

          {/* Harga — warna navy-600 bold */}
          <p className="text-sm font-bold text-navy-600">
            {formatMoney(product.price)}
          </p>
        </button>
      ))}
    </div>

    {/* Tombol kanan */}
    <button className="absolute right-0 top-1/2 -translate-y-1/2
                        z-10 w-8 h-8 bg-white border border-gray-200
                        rounded-full shadow flex items-center
                        justify-center hover:bg-gray-50 -mr-4">
      <ChevronRightIcon className="w-4 h-4" />
    </button>
  </div>
</section>
```

### 1.5 Keranjang Transaksi

```tsx
// Label: "KERANJANG TRANSAKSI"
// Tabel standar, kolom: Produk | Qty | Harga | Diskon | Total | Aksi

<section className="flex-1 flex flex-col overflow-hidden">
  <h2 className="text-xs font-bold text-navy-600 uppercase
                 tracking-widest mb-3">
    Keranjang Transaksi
  </h2>

  <div className="flex-1 overflow-hidden rounded-xl border
                  border-gray-200 bg-white">
    <div className="overflow-y-auto h-full">
      <table className="w-full text-sm">

        {/* Header tabel */}
        <thead className="sticky top-0 bg-gray-50 border-b
                          border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium
                           text-gray-600 w-[40%]">Produk</th>
            <th className="text-center px-3 py-3 font-medium
                           text-gray-600 w-[15%]">Qty</th>
            <th className="text-right px-3 py-3 font-medium
                           text-gray-600 w-[15%]">Harga</th>
            <th className="text-right px-3 py-3 font-medium
                           text-gray-600 w-[12%]">Diskon</th>
            <th className="text-right px-3 py-3 font-medium
                           text-gray-600 w-[12%]">Total</th>
            <th className="px-3 py-3 w-[6%]"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <tr key={item.key}
                className={cn(
                  "hover:bg-blue-50/30 transition-colors",
                  activeRow === i && "bg-blue-50"
                )}>

              {/* Produk: thumbnail + nama + SKU */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={item.image_url ?? '/produk/_placeholder.png'}
                    className="w-10 h-10 rounded-lg object-contain
                               bg-gray-50 border border-gray-100 shrink-0"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      SKU: {item.sku}
                    </p>
                  </div>
                </div>
              </td>

              {/* Qty: tombol minus, angka, tombol plus */}
              <td className="px-3 py-3">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => decrementQty(item.key)}
                    className="w-7 h-7 rounded-md border border-gray-300
                               flex items-center justify-center
                               hover:bg-gray-100 text-gray-600
                               font-bold text-sm">
                    −
                  </button>
                  <span className="w-8 text-center font-mono
                                   font-medium text-sm">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => incrementQty(item.key)}
                    className="w-7 h-7 rounded-md border border-gray-300
                               flex items-center justify-center
                               hover:bg-gray-100 text-gray-600
                               font-bold text-sm">
                    +
                  </button>
                </div>
              </td>

              {/* Harga */}
              <td className="px-3 py-3 text-right font-mono text-sm
                             text-gray-700">
                {formatNumber(item.unit_price)}
              </td>

              {/* Diskon */}
              <td className="px-3 py-3 text-right font-mono text-sm
                             text-gray-500">
                {item.discount_amount > 0
                  ? formatNumber(item.discount_amount)
                  : '−'}
              </td>

              {/* Total */}
              <td className="px-3 py-3 text-right font-mono font-bold
                             text-sm text-gray-900">
                {formatNumber(item.subtotal)}
              </td>

              {/* Hapus */}
              <td className="px-3 py-3 text-center">
                <button
                  onClick={() => removeItem(item.key)}
                  className="w-8 h-8 rounded-lg border border-red-200
                             bg-white text-red-500 flex items-center
                             justify-center hover:bg-red-50
                             transition-colors mx-auto">
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center
                        h-32 text-gray-400">
          <ShoppingCartIcon className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Keranjang kosong</p>
        </div>
      )}
    </div>
  </div>
</section>
```

### 1.6 Panel Kanan

```tsx
<aside className="w-[420px] shrink-0 border-l border-gray-200
                  bg-white flex flex-col p-5 gap-5 overflow-y-auto">

  {/* PELANGGAN / MEMBER */}
  <section>
    <h3 className="text-xs font-bold text-gray-500 uppercase
                   tracking-widest mb-3">
      Pelanggan / Member
    </h3>

    {/* Tombol scan kartu */}
    <button
      onClick={() => setMemberPickerOpen(true)}
      className="w-full flex items-center justify-center gap-2
                 border-2 border-dashed border-navy-300 rounded-xl
                 py-3 text-navy-600 font-medium text-sm
                 hover:border-navy-500 hover:bg-navy-50
                 transition-colors">
      <ScanIcon className="w-5 h-5" />
      Scan kartu member
    </button>

    {/* Bila member sudah dipilih */}
    {member && (
      <div className="mt-3 flex items-center gap-3 p-3 rounded-xl
                      bg-gray-50 border border-gray-200">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-200
                        overflow-hidden shrink-0">
          {member.photo
            ? <img src={member.photo} className="w-full h-full object-cover" />
            : <UserCircleIcon className="w-full h-full text-gray-400 p-1" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {member.name}
          </p>
          <p className="text-xs text-gray-500">
            Saldo: <span className="font-mono font-medium text-navy-700">
              {formatMoney(member.balance)}
            </span>
          </p>
          <p className="text-xs text-gray-400">
            ID Member: {member.member_number}
          </p>
          <Badge className="mt-1 text-xs" variant="outline">
            Aktif
          </Badge>
        </div>

        {/* Hapus pilihan member */}
        <button
          onClick={clearMember}
          className="text-gray-400 hover:text-gray-600">
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    )}
  </section>

  {/* RINGKASAN */}
  <section>
    <h3 className="text-xs font-bold text-gray-500 uppercase
                   tracking-widest mb-3">
      Ringkasan
    </h3>

    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-gray-600">
        <span>Subtotal</span>
        <span className="font-mono">{formatMoney(subtotal)}</span>
      </div>

      {totalDiscount > 0 && (
        <div className="flex justify-between text-red-500">
          <span>Diskon</span>
          <span className="font-mono">− {formatMoney(totalDiscount)}</span>
        </div>
      )}

      {tax > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>Pajak</span>
          <span className="font-mono">{formatMoney(tax)}</span>
        </div>
      )}

      {/* Garis pemisah */}
      <div className="border-t border-gray-200 pt-2 mt-2">
        <div className="flex justify-between items-baseline">
          <span className="font-bold text-base text-gray-900">TOTAL</span>
          <span className="font-mono font-bold text-2xl text-navy-700">
            {formatMoney(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  </section>

  {/* TOMBOL BAYAR */}
  <button
    onClick={() => setPaymentOpen(true)}
    disabled={items.length === 0}
    className="w-full flex items-center justify-center gap-2
               bg-green-500 hover:bg-green-600 disabled:bg-gray-300
               text-white font-bold text-base rounded-xl py-4
               transition-colors">
    <WalletIcon className="w-5 h-5" />
    BAYAR {formatMoney(grandTotal)}
  </button>

  {/* CASH MASUK / CASH KELUAR */}
  <div className="grid grid-cols-2 gap-3">

    {/* Cash Masuk */}
    <button
      onClick={() => setCashInOpen(true)}
      className="flex items-center gap-2 bg-white border
                 border-gray-200 rounded-xl p-3 hover:bg-green-50
                 hover:border-green-300 transition-colors group">
      <div className="w-10 h-10 bg-green-100 rounded-lg flex
                      items-center justify-center shrink-0
                      group-hover:bg-green-200 transition-colors">
        <ArrowDownIcon className="w-5 h-5 text-green-600" />
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold text-green-700">
          Cash Masuk
        </p>
        <p className="text-xs text-gray-400">Tambah kas laci</p>
      </div>
      <ChevronRightIcon className="w-4 h-4 text-gray-300 ml-auto" />
    </button>

    {/* Cash Keluar */}
    <button
      onClick={() => setCashOutOpen(true)}
      className="flex items-center gap-2 bg-white border
                 border-gray-200 rounded-xl p-3 hover:bg-red-50
                 hover:border-red-300 transition-colors group">
      <div className="w-10 h-10 bg-red-100 rounded-lg flex
                      items-center justify-center shrink-0
                      group-hover:bg-red-200 transition-colors">
        <ArrowUpIcon className="w-5 h-5 text-red-600" />
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold text-red-700">
          Cash Keluar
        </p>
        <p className="text-xs text-gray-400">Pengeluaran kas kecil</p>
      </div>
      <ChevronRightIcon className="w-4 h-4 text-gray-300 ml-auto" />
    </button>

  </div>

</aside>
```

### 1.7 Footer Hotkey Bar

```tsx
// Background: bg-navy-900, h-16
// 8 tombol sejajar, lebar merata, rounded-lg

<footer className="h-16 bg-navy-900 flex items-center px-4 gap-2
                   shrink-0">
  {[
    { key: 'F2', label: 'Cari',      icon: SearchIcon,      handler: openSearch },
    { key: 'F3', label: 'Member',    icon: UserIcon,        handler: openMember },
    { key: 'F4', label: 'Diskon',    icon: TagIcon,         handler: openDiskon },
    { key: 'F6', label: 'Tahan',     icon: PauseIcon,       handler: holdCart  },
    { key: 'F7', label: 'Panggil',   icon: PhoneIcon,       handler: recallHold },
    { key: 'F9', label: 'Bayar',     icon: CreditCardIcon,  handler: openPayment,
      className: 'bg-green-600 border-green-500 hover:bg-green-700' },
    { key: 'F9', label: 'Cash Masuk', icon: ArrowDownIcon,  handler: openCashIn,
      className: 'bg-green-700 border-green-600 hover:bg-green-800' },
    { key: 'F10', label: 'Cash Keluar', icon: ArrowUpIcon,  handler: openCashOut,
      className: 'bg-red-700 border-red-600 hover:bg-red-800' },
  ].map(btn => (
    <button
      key={btn.key + btn.label}
      onClick={btn.handler}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5",
        "rounded-lg border border-navy-700 bg-navy-800",
        "text-white text-xs font-medium py-2 px-2",
        "hover:bg-navy-700 transition-colors",
        btn.className
      )}>
      <span className="font-mono font-bold text-[10px] opacity-70">
        {btn.key}
      </span>
      <btn.icon className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden sm:inline">{btn.label}</span>
    </button>
  ))}
</footer>
```

### 1.8 Aturan wajib layar kasir

```
PosLayout SELALU menerapkan theme navy-dominan (dark mode paksa):
- Saat mount PosLayout: document.documentElement.classList.add('dark')
- Saat unmount: kembalikan ke preferensi user dari useThemeStore
- TIDAK ada tombol toggle tema di layar kasir

Background halaman /pos:
- Area konten utama (bukan panel putih): bg-gray-50
  (terang agar kartu produk dan tabel kontras)
- Panel kanan: bg-white
- Header & footer: bg-navy-900

Auto-focus input scan:
  const focusBarcode = useCallback(() => {
    requestAnimationFrame(() => barcodeRef.current?.focus())
  }, [])

  // Panggil focusBarcode() setelah SETIAP aksi:
  // addItem, removeItem, updateQty, closeMemberDialog,
  // closePaymentDialog, closeHoldDialog
```

---

## BAGIAN 2 — FILTER KOLOM: GANTI NAMA DATABASE KE LABEL INDONESIA

### 2.1 Masalah

Filter di DataTable masih menampilkan nama kolom database seperti
`member_id`, `created_at`, `is_active`, `cashier_session_id`.
Ini tidak boleh terlihat oleh pengguna.

### 2.2 Solusi terpusat

Buat atau perbarui `resources/js/Lib/labels.ts`:

```ts
// resources/js/Lib/labels.ts
// Kamus lengkap: nama kolom database → label Indonesia
// Tambahkan terus setiap kali ada kolom baru yang tampil di filter

export const COLUMN_LABELS: Record<string, string> = {

  // ── Umum ───────────────────────────────────────────────────────────
  id:                       'ID',
  created_at:               'Dibuat',
  updated_at:               'Diperbarui',
  deleted_at:               'Dihapus',
  is_active:                'Status',
  status:                   'Status',
  note:                     'Catatan',
  reference:                'No. Referensi',
  outlet_id:                'Outlet',
  user_id:                  'Petugas',
  approved_by:              'Disetujui Oleh',
  created_by:               'Dibuat Oleh',
  description:              'Deskripsi',
  type:                     'Tipe',
  amount:                   'Nominal',
  total:                    'Total',
  date:                     'Tanggal',

  // ── Produk ─────────────────────────────────────────────────────────
  sku:                      'Kode SKU',
  name:                     'Nama Produk',
  product_id:               'Produk',
  category_id:              'Kategori',
  brand_id:                 'Merek',
  base_unit_id:             'Satuan Dasar',
  unit_id:                  'Satuan',
  min_stock:                'Stok Minimum',
  max_stock:                'Stok Maksimum',
  is_expirable:             'Punya Kadaluwarsa',
  is_consignment:           'Barang Titipan',
  is_favorite:              'Produk Favorit',
  is_visible_public:        'Tampil di Katalog',
  slug:                     'Slug URL',
  price:                    'Harga Jual',
  member_price:             'Harga Member',
  effective_from:           'Berlaku Mulai',
  effective_to:             'Berlaku Sampai',

  // ── Anggota ────────────────────────────────────────────────────────
  member_id:                'Anggota',
  member_number:            'No. Anggota',
  nis:                      'NIS',
  class_name:               'Kelas',
  major:                    'Jurusan',
  entry_year:               'Angkatan',
  gender:                   'Jenis Kelamin',
  birth_date:               'Tanggal Lahir',
  phone:                    'No. HP',
  balance_cache:            'Saldo',
  point_balance:            'Poin',
  receivable_limit:         'Batas Piutang',
  daily_limit:              'Limit Harian',
  weekly_limit:             'Limit Mingguan',
  guardian_name:            'Nama Wali',
  guardian_phone:           'HP Wali',
  guardian_relation:        'Hubungan',
  member_level_id:          'Level',
  suspended_until:          'Diblokir Sampai',
  suspend_reason:           'Alasan Blokir',
  joined_at:                'Terdaftar',
  graduated_at:             'Lulus',

  // ── Kartu Member ───────────────────────────────────────────────────
  card_number:              'No. Kartu',
  member_card_id:           'Kartu',
  issued_at:                'Diterbitkan',
  blocked_at:               'Diblokir',
  block_reason:             'Alasan Blokir',
  print_count:              'Jumlah Cetak',
  last_used_at:             'Terakhir Dipakai',

  // ── Transaksi ──────────────────────────────────────────────────────
  sale_date:                'Tanggal Jual',
  grand_total:              'Total',
  subtotal:                 'Subtotal',
  total_discount:           'Diskon',
  paid_amount:              'Dibayar',
  change_amount:            'Kembalian',
  gross_profit:             'Laba Kotor',
  total_cost:               'HPP',
  cashier_session_id:       'Sesi Kasir',
  void_reason:              'Alasan Void',
  voided_at:                'Waktu Void',
  voided_by:                'Di-void Oleh',
  idempotency_key:          'Kunci Idempotency',

  // ── Deposit ────────────────────────────────────────────────────────
  deposit_transaction_id:   'Transaksi Deposit',
  balance_before:           'Saldo Sebelum',
  balance_after:            'Saldo Sesudah',
  topup_amount:             'Nominal Top-Up',
  transfer_date:            'Tanggal Transfer',
  bank_name:                'Nama Bank',
  sender_name:              'Nama Pengirim',
  verified_by:              'Diverifikasi Oleh',
  verified_at:              'Waktu Verifikasi',
  reject_reason:            'Alasan Tolak',

  // ── Stok ───────────────────────────────────────────────────────────
  qty:                      'Jumlah',
  qty_remaining:            'Sisa Stok',
  qty_in:                   'Masuk',
  qty_base:                 'Jumlah Dasar',
  unit_cost:                'HPP Satuan',
  avg_cost:                 'HPP Rata-rata',
  last_cost:                'HPP Terakhir',
  batch_no:                 'No. Batch',
  expired_at:               'Kadaluwarsa',
  received_at:              'Diterima',
  is_consignment:           'Titipan',
  stock_layer_id:           'Layer Stok',

  // ── Pembelian ──────────────────────────────────────────────────────
  supplier_id:              'Pemasok',
  purchase_id:              'Pembelian',
  purchase_date:            'Tanggal Beli',
  due_date:                 'Jatuh Tempo',
  invoice_no:               'No. Faktur',
  remaining_amount:         'Sisa',
  paid_amount:              'Terbayar',
  payment_type:             'Cara Bayar',
  other_cost:               'Biaya Lain',
  expected_date:            'Estimasi Tiba',
  qty_ordered:              'Qty Dipesan',
  qty_received:             'Qty Diterima',

  // ── Kas ────────────────────────────────────────────────────────────
  cash_account_id:          'Akun Kas',
  cash_category_id:         'Kategori Kas',
  opening_cash:             'Modal Awal',
  expected_cash:            'Kas Seharusnya',
  actual_cash:              'Kas Fisik',
  difference:               'Selisih',
  total_sales_cash:         'Penjualan Tunai',
  total_sales_deposit:      'Penjualan Saldo',
  total_sales_noncash:      'Penjualan Non-tunai',
  total_cash_in:            'Kas Masuk',
  total_cash_out:           'Kas Keluar',
  total_drop:               'Drop Cash',
  opened_at:                'Dibuka',
  closed_at:                'Ditutup',
  transaction_count:        'Jumlah Transaksi',
  void_count:               'Jumlah Void',

  // ── Hutang & Piutang ───────────────────────────────────────────────
  total_amount:             'Total',
  remaining_amount:         'Sisa',
  receivable_id:            'Piutang',
  debt_id:                  'Hutang',
  payment_date:             'Tanggal Bayar',
  payment_method:           'Metode Bayar',

  // ── Promo ──────────────────────────────────────────────────────────
  promo_id:                 'Promo',
  coupon_id:                'Kupon',
  discount_type:            'Tipe Diskon',
  discount_value:           'Nilai Diskon',
  max_discount:             'Maks. Diskon',
  min_purchase:             'Min. Belanja',
  start_date:               'Mulai',
  end_date:                 'Berakhir',
  quota_total:              'Kuota Total',
  used_count:               'Terpakai',
  is_stackable:             'Bisa Ditumpuk',
  is_public:                'Tampil Publik',

  // ── Laporan ────────────────────────────────────────────────────────
  sale_count:               'Jumlah Transaksi',
  total_revenue:            'Total Omzet',
  total_profit:             'Total Laba',
  avg_transaction:          'Rata-rata/Transaksi',
  member_count:             'Jumlah Anggota',

  // ── Pengguna ───────────────────────────────────────────────────────
  username:                 'Username',
  employee_code:            'Kode Karyawan',
  last_login_at:            'Login Terakhir',
  last_login_ip:            'IP Login Terakhir',
  two_factor_enabled:       '2FA Aktif',
}

// Helper: ambil label, fallback ke nama kolom yang diformat
export function getLabel(key: string): string {
  if (COLUMN_LABELS[key]) return COLUMN_LABELS[key]

  // Fallback: ubah snake_case jadi Title Case
  // 'member_level_id' → 'Member Level Id'
  const formatted = key
    .replace(/_id$/, '')          // hapus _id di akhir
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  if (process.env.NODE_ENV === 'development') {
    console.warn(`[DataTable] Label tidak ditemukan untuk kolom: "${key}". `
      + `Tambahkan ke Lib/labels.ts`)
  }

  return formatted
}
```

### 2.3 Terapkan ke DataTable

Perbarui komponen `<DataTable>` yang sudah ada:

```tsx
// resources/js/Components/common/DataTable.tsx

import { getLabel } from '@/Lib/labels'

// Saat render header kolom:
// Bila column.header tidak diset → gunakan getLabel(column.accessorKey)

const resolveHeader = (column: ColumnDef<any>): string => {
  if (typeof column.header === 'string') return column.header
  if (column.accessorKey) return getLabel(column.accessorKey as string)
  return ''
}
```

### 2.4 Audit semua DataTable yang ada

Buka setiap halaman yang punya tabel, cek filter-nya:
- `/admin/anggota` → filter member
- `/admin/produk` → filter produk
- `/admin/deposit` → filter deposit
- `/admin/penjualan` → filter penjualan
- `/admin/pembelian` → filter pembelian
- `/admin/stok` → filter stok
- `/admin/kas` → filter sesi kasir
- `/admin/laporan` → filter laporan
- `/admin/promo` → filter promo
- `/admin/pengguna` → filter pengguna

Untuk setiap halaman: pastikan semua kolom dan filter menampilkan
label Indonesia, bukan nama database.

---

## BAGIAN 3 — LEBAR MODAL/SHEET RESPONSIF

### 3.1 Masalah

Sheet (modal dari kanan) terlalu pendek — konten di dalamnya sesak.
Sebaliknya, Sheet yang simpel juga tidak perlu terlalu lebar.

### 3.2 Solusi: lebar adaptif berdasarkan konten

Buat helper untuk menentukan lebar Sheet:

```tsx
// resources/js/Lib/sheet-sizes.ts

export type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export const SHEET_WIDTHS: Record<SheetSize, string> = {
  sm:   'w-full sm:max-w-sm',      // ~384px  — konfirmasi sederhana
  md:   'w-full sm:max-w-lg',      // ~512px  — form ringan (1 tab)
  lg:   'w-full sm:max-w-2xl',     // ~672px  — form sedang (2-3 tab)
  xl:   'w-full sm:max-w-4xl',     // ~896px  — form kompleks (4+ tab)
  full: 'w-full sm:max-w-[90vw]',  // 90% layar — form sangat kompleks
}
```

Petakan setiap Sheet ke ukuran yang tepat:

| Halaman / Form | Ukuran | Alasan |
|---|---|---|
| Tambah/Edit Kategori, Brand, Satuan | `sm` | Hanya 2-3 field |
| Tambah/Edit Pengguna | `md` | Form sedang, tab identitas saja |
| Tambah/Edit Supplier, Metode Bayar | `md` | Form sedang |
| Tambah/Edit Anggota | `xl` | 5 tab: Identitas, Wali, Level, Limit, Kartu |
| Tambah/Edit Produk | `xl` | 6 tab: Umum, Gambar, Barcode, Harga, Konversi, Stok |
| Tambah Pembelian | `full` | Banyak baris item + panel batch/expired |
| Form Retur Penjualan | `xl` | Dua panel: cari nota + keranjang retur |
| Form Promo | `xl` | Tab berubah sesuai tipe, banyak kondisi |
| Tutup Sesi Kasir | `lg` | Dua panel: rincian sistem + hitung pecahan |
| Detail Transaksi (read-only) | `lg` | Banyak baris item |
| Konfirmasi Void / Hapus | `sm` | Hanya teks + tombol |
| Modal Supervisor PIN | `sm` | Hanya input PIN |
| Modal Pembayaran | `lg` | Split payment, banyak metode |

### 3.3 Implementasi

Perbarui komponen Sheet (atau buat wrapper `<AppSheet>`):

```tsx
// resources/js/Components/common/AppSheet.tsx

import { Sheet, SheetContent, SheetHeader,
         SheetTitle, SheetDescription } from '@/Components/ui/sheet'
import { SHEET_WIDTHS, SheetSize } from '@/Lib/sheet-sizes'
import { cn } from '@/Lib/utils'

interface AppSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: SheetSize
  children: React.ReactNode
  footer?: React.ReactNode   // tombol Simpan/Batal dipasang di sini
}

export function AppSheet({
  open, onOpenChange, title, description,
  size = 'md', children, footer
}: AppSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          SHEET_WIDTHS[size],
          'flex flex-col p-0 gap-0'
        )}
      >
        {/* Header sticky */}
        <SheetHeader className="px-6 py-5 border-b border-border
                                shrink-0">
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        {/* Konten scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer sticky (bila ada) */}
        {footer && (
          <div className="px-6 py-4 border-t border-border
                          bg-surface shrink-0 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

Pola pemakaian:

```tsx
<AppSheet
  open={editOpen}
  onOpenChange={setEditOpen}
  title="Ubah Anggota"
  size="xl"
  footer={
    <>
      <Button variant="outline" onClick={() => setEditOpen(false)}>
        Batal
      </Button>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Menyimpan...' : 'Simpan'}
      </Button>
    </>
  }
>
  <MemberForm member={selected} />
</AppSheet>
```

### 3.4 Ganti semua Sheet yang ada

Cari semua penggunaan `<SheetContent>` di codebase dan ganti ke
`<AppSheet>` dengan ukuran yang sesuai tabel di § 3.2.

Perintah cari:
```bash
grep -rn "SheetContent" resources/js --include="*.tsx" -l
```

Buka setiap file yang muncul dan terapkan ukuran yang tepat.

### 3.5 Aturan tambahan untuk Sheet

```
1. Header Sheet SELALU sticky (tidak ikut scroll)
   → SheetHeader dengan position sticky, bg-surface, border-b

2. Footer (tombol Simpan/Batal) SELALU sticky di bawah
   → Dengan border-t dan bg-surface

3. Konten di tengah yang overflow-y-auto
   → Sehingga form yang panjang tetap bisa diakses

4. Padding konsisten: px-6 py-5 untuk header/footer/konten

5. Bila ada tab (Tabs shadcn) di dalam Sheet:
   → TabsList sticky di bawah header Sheet (position sticky, top-0)
   → TabsContent overflow-y-auto

6. Jangan pernah buka Sheet di dalam Sheet
   → Gunakan Dialog untuk konfirmasi yang muncul dari dalam Sheet
```

---

## CHECKLIST VERIFIKASI

### Layar Kasir
- [ ] Header sesuai referensi: brand + pill kasir/shift/online/jam + tombol keluar
- [ ] Search bar rounded-xl, ikon search kiri, ikon barcode kanan
- [ ] Grid produk cepat horizontal dengan carousel (panah kiri-kanan)
- [ ] Setiap kartu produk: gambar, nama, harga navy-600
- [ ] Tabel keranjang: thumbnail produk + nama + SKU, tombol −/+/hapus
- [ ] Panel kanan: scan kartu, info member bila dipilih, ringkasan, BAYAR, Cash Masuk/Keluar
- [ ] Tombol Cash Masuk: ikon hijau, label "Cash Masuk" + "Tambah kas laci"
- [ ] Tombol Cash Keluar: ikon merah, label "Cash Keluar" + "Pengeluaran kas kecil"
- [ ] Footer hotkey bar 8 tombol: F2 Cari, F3 Member, F4 Diskon, F6 Tahan,
      F7 Panggil, F9 Bayar (hijau), F9 Cash Masuk (hijau gelap),
      F10 Cash Keluar (merah gelap)
- [ ] Input barcode auto-focus setelah setiap aksi
- [ ] Layar kasir selalu mode navy-dominan (dark paksa PosLayout)
- [ ] Hanya produk dengan stok di outlet user yang tampil di grid

### Filter Kolom
- [ ] `Lib/labels.ts` berisi semua kolom yang ada di tabel
- [ ] Warning di console (dev) bila kolom tidak punya label
- [ ] Buka `/admin/anggota` → filter tidak ada nama database
- [ ] Buka `/admin/produk` → filter tidak ada nama database
- [ ] Buka `/admin/penjualan` → filter tidak ada nama database
- [ ] Buka `/admin/pembelian` → filter tidak ada nama database
- [ ] Buka `/admin/deposit` → filter tidak ada nama database
- [ ] Buka `/admin/stok` → filter tidak ada nama database
- [ ] Buka `/admin/kas` → filter tidak ada nama database
- [ ] Buka `/admin/promo` → filter tidak ada nama database
- [ ] Buka `/admin/pengguna` → filter tidak ada nama database

### Modal/Sheet Responsif
- [ ] Sheet Anggota (xl): 5 tab, konten tidak terpotong kiri-kanan
- [ ] Sheet Produk (xl): 6 tab, konten tidak terpotong
- [ ] Sheet Pembelian buka halaman baru (full page, bukan Sheet)
- [ ] Sheet Kategori/Brand/Satuan (sm): tidak terlalu lebar
- [ ] Sheet Konfirmasi Void/Hapus (sm): proporsional
- [ ] Header Sheet sticky: tidak ikut scroll saat konten panjang
- [ ] Footer Sheet sticky: tombol Simpan/Batal selalu terlihat
- [ ] Konten tengah scrollable: form panjang bisa di-scroll
- [ ] Tab di dalam Sheet: TabsList sticky di bawah header
- [ ] Tidak ada Sheet di dalam Sheet (gunakan Dialog untuk konfirmasi)

```
commit: "UI: desain ulang kasir, label kolom Indonesia, Sheet responsif"
```
