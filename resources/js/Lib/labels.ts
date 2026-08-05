// REVISI-R1-v2.md §3.1 — kamus label bahasa Indonesia terpusat untuk
// nama kolom database, dipakai sebagai KAMUS RUJUKAN saat menulis
// `header:`/`filterLabel:` kolom baru (bukan pengganti otomatis untuk
// kolom yang sudah eksplisit diberi label Indonesia sendiri-sendiri di
// tiap halaman — audit kode menunjukkan pola itu SUDAH konsisten
// dipakai di seluruh halaman admin yang ada, lihat Laporan Implementasi
// §8 "Temuan Tambahan" untuk detail).
export const COLUMN_LABELS: Record<string, string> = {
  // ── Umum ───────────────────────────────────────────────────────────
  id: 'ID',
  created_at: 'Dibuat',
  updated_at: 'Diperbarui',
  deleted_at: 'Dihapus',
  is_active: 'Status Aktif',
  status: 'Status',
  note: 'Catatan',
  reference: 'No. Referensi',
  outlet_id: 'Outlet',
  user_id: 'Petugas',
  approved_by: 'Disetujui Oleh',
  created_by: 'Dibuat Oleh',
  description: 'Deskripsi',
  type: 'Tipe',
  amount: 'Nominal',
  total: 'Total',
  date: 'Tanggal',

  // ── Produk ─────────────────────────────────────────────────────────
  sku: 'Kode SKU',
  name: 'Nama Produk',
  product_id: 'Produk',
  category_id: 'Kategori',
  brand_id: 'Merek',
  base_unit_id: 'Satuan Dasar',
  unit_id: 'Satuan',
  min_stock: 'Stok Minimum',
  max_stock: 'Stok Maksimum',
  is_expirable: 'Punya Kadaluwarsa',
  is_consignment: 'Barang Titipan',
  is_favorite: 'Produk Favorit',
  is_visible_public: 'Tampil di Katalog',
  slug: 'Slug URL',
  price: 'Harga Jual',
  member_price: 'Harga Member',
  effective_from: 'Berlaku Mulai',
  effective_to: 'Berlaku Sampai',

  // ── Anggota ────────────────────────────────────────────────────────
  member_id: 'Anggota',
  member_number: 'No. Anggota',
  nis: 'NIS',
  class_name: 'Kelas',
  major: 'Jurusan',
  entry_year: 'Angkatan',
  gender: 'Jenis Kelamin',
  birth_date: 'Tanggal Lahir',
  phone: 'No. HP',
  balance_cache: 'Saldo',
  point_balance: 'Poin',
  receivable_limit: 'Batas Piutang',
  daily_limit: 'Limit Harian',
  weekly_limit: 'Limit Mingguan',
  guardian_name: 'Nama Wali',
  guardian_phone: 'HP Wali',
  guardian_relation: 'Hubungan',
  member_level_id: 'Level',
  suspended_until: 'Diblokir Sampai',
  suspend_reason: 'Alasan Blokir',
  joined_at: 'Terdaftar',
  graduated_at: 'Lulus',

  // ── Kartu Member ───────────────────────────────────────────────────
  card_number: 'No. Kartu',
  member_card_id: 'Kartu',
  issued_at: 'Diterbitkan',
  blocked_at: 'Diblokir',
  block_reason: 'Alasan Blokir',
  print_count: 'Jumlah Cetak',
  last_used_at: 'Terakhir Dipakai',

  // ── Transaksi ──────────────────────────────────────────────────────
  sale_date: 'Tanggal Jual',
  grand_total: 'Total',
  subtotal: 'Subtotal',
  total_discount: 'Diskon',
  paid_amount: 'Dibayar',
  change_amount: 'Kembalian',
  gross_profit: 'Laba Kotor',
  total_cost: 'HPP',
  cashier_session_id: 'Sesi Kasir',
  void_reason: 'Alasan Void',
  voided_at: 'Waktu Void',
  voided_by: 'Di-void Oleh',
  idempotency_key: 'Kunci Idempotency',

  // ── Deposit ────────────────────────────────────────────────────────
  deposit_transaction_id: 'Transaksi Deposit',
  balance_before: 'Saldo Sebelum',
  balance_after: 'Saldo Sesudah',
  topup_amount: 'Nominal Top-Up',
  transfer_date: 'Tanggal Transfer',
  bank_name: 'Nama Bank',
  sender_name: 'Nama Pengirim',
  verified_by: 'Diverifikasi Oleh',
  verified_at: 'Waktu Verifikasi',
  reject_reason: 'Alasan Tolak',

  // ── Stok ───────────────────────────────────────────────────────────
  qty: 'Jumlah',
  qty_remaining: 'Sisa Stok',
  qty_in: 'Masuk',
  qty_base: 'Jumlah Dasar',
  unit_cost: 'HPP Satuan',
  avg_cost: 'HPP Rata-rata',
  last_cost: 'HPP Terakhir',
  batch_no: 'No. Batch',
  expired_at: 'Kadaluwarsa',
  received_at: 'Diterima',
  stock_layer_id: 'Layer Stok',

  // ── Pembelian ──────────────────────────────────────────────────────
  supplier_id: 'Pemasok',
  purchase_id: 'Pembelian',
  purchase_date: 'Tanggal Beli',
  due_date: 'Jatuh Tempo',
  invoice_no: 'No. Faktur',
  remaining_amount: 'Sisa',
  payment_type: 'Cara Bayar',
  other_cost: 'Biaya Lain',
  expected_date: 'Estimasi Tiba',
  qty_ordered: 'Qty Dipesan',
  qty_received: 'Qty Diterima',

  // ── Kas ────────────────────────────────────────────────────────────
  cash_account_id: 'Akun Kas',
  cash_category_id: 'Kategori Kas',
  opening_cash: 'Modal Awal',
  expected_cash: 'Kas Seharusnya',
  actual_cash: 'Kas Fisik',
  difference: 'Selisih',
  total_sales_cash: 'Penjualan Tunai',
  total_sales_deposit: 'Penjualan Saldo',
  total_sales_noncash: 'Penjualan Non-tunai',
  total_cash_in: 'Kas Masuk',
  total_cash_out: 'Kas Keluar',
  total_drop: 'Drop Cash',
  opened_at: 'Dibuka',
  closed_at: 'Ditutup',
  transaction_count: 'Jumlah Transaksi',
  void_count: 'Jumlah Void',

  // ── Hutang & Piutang ───────────────────────────────────────────────
  total_amount: 'Total',
  receivable_id: 'Piutang',
  debt_id: 'Hutang',
  payment_date: 'Tanggal Bayar',
  payment_method: 'Metode Bayar',

  // ── Promo ──────────────────────────────────────────────────────────
  promo_id: 'Promo',
  coupon_id: 'Kupon',
  discount_type: 'Tipe Diskon',
  discount_value: 'Nilai Diskon',
  max_discount: 'Maks. Diskon',
  min_purchase: 'Min. Belanja',
  start_date: 'Mulai',
  end_date: 'Berakhir',
  quota_total: 'Kuota Total',
  used_count: 'Terpakai',
  is_stackable: 'Bisa Ditumpuk',
  is_public: 'Tampil Publik',

  // ── Laporan ────────────────────────────────────────────────────────
  sale_count: 'Jumlah Transaksi',
  total_revenue: 'Total Omzet',
  total_profit: 'Total Laba',
  avg_transaction: 'Rata-rata/Transaksi',
  member_count: 'Jumlah Anggota',

  // ── Pengguna ───────────────────────────────────────────────────────
  username: 'Username',
  employee_code: 'Kode Karyawan',
  last_login_at: 'Login Terakhir',
  last_login_ip: 'IP Login Terakhir',
  two_factor_enabled: '2FA Aktif',
}

/**
 * REVISI-UI-KASIR.md §2.2 — kembalikan label dari kamus; bila tidak
 * ada, format `snake_case`/`_id` jadi Title Case (mis. `member_level_id`
 * → `Member Level`) alih-alih menampilkan nama kolom database mentah
 * apa adanya. Warning di console (dev saja) supaya kolom yang lupa
 * didaftarkan ketahuan saat development, bukan diam-diam tampil di
 * produksi.
 */
export function getLabel(accessorKey: string): string {
  const label = COLUMN_LABELS[accessorKey]

  if (label) return label

  const formatted = accessorKey
    .replace(/_id$/, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[COLUMN_LABELS] Tidak ada label Indonesia untuk kolom "${accessorKey}" — tambahkan ke resources/js/Lib/labels.ts.`)
  }

  return formatted
}

/**
 * Dipakai saat membuat definisi kolom: kembalikan label eksplisit
 * kalau ada (halaman sudah menulis header sendiri), atau jatuh ke
 * `getLabel()`.
 */
export function columnLabel(accessorKey: string, explicit?: string): string {
  return explicit || getLabel(accessorKey)
}
