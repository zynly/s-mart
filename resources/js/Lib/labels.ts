// REVISI-R1-v2.md §3.1 — kamus label bahasa Indonesia terpusat untuk
// nama kolom database, dipakai sebagai KAMUS RUJUKAN saat menulis
// `header:`/`filterLabel:` kolom baru (bukan pengganti otomatis untuk
// kolom yang sudah eksplisit diberi label Indonesia sendiri-sendiri di
// tiap halaman — audit kode menunjukkan pola itu SUDAH konsisten
// dipakai di seluruh halaman admin yang ada, lihat Laporan Implementasi
// §8 "Temuan Tambahan" untuk detail).
export const COLUMN_LABELS: Record<string, string> = {
  // Umum
  id: 'ID',
  created_at: 'Dibuat',
  updated_at: 'Diperbarui',
  is_active: 'Status Aktif',
  reference: 'No. Referensi',
  note: 'Catatan',
  outlet_id: 'Outlet',
  user_id: 'Petugas',

  // Produk
  sku: 'Kode SKU',
  product_id: 'Produk',
  category_id: 'Kategori',
  brand_id: 'Merek',
  base_unit_id: 'Satuan Dasar',
  min_stock: 'Stok Minimum',
  max_stock: 'Stok Maksimum',
  is_expirable: 'Punya Kadaluwarsa',
  is_consignment: 'Barang Titipan',
  is_favorite: 'Produk Favorit',
  is_visible_public: 'Tampil di Katalog',

  // Anggota
  member_id: 'Anggota',
  member_number: 'No. Anggota',
  nis: 'NIS',
  class_name: 'Kelas',
  major: 'Jurusan',
  entry_year: 'Angkatan',
  balance_cache: 'Saldo',
  point_balance: 'Poin',
  receivable_limit: 'Batas Piutang',
  guardian_name: 'Nama Wali',
  guardian_phone: 'HP Wali',

  // Transaksi
  sale_date: 'Tanggal Jual',
  grand_total: 'Total',
  subtotal: 'Subtotal',
  total_discount: 'Diskon',
  paid_amount: 'Dibayar',
  change_amount: 'Kembalian',
  gross_profit: 'Laba Kotor',
  total_cost: 'Total HPP',
  cashier_session_id: 'Sesi Kasir',

  // Stok
  qty: 'Jumlah',
  qty_remaining: 'Sisa',
  unit_cost: 'HPP Satuan',
  batch_no: 'No. Batch',
  expired_at: 'Kadaluwarsa',
  received_at: 'Diterima',

  // Kas
  cash_account_id: 'Akun Kas',
  opening_cash: 'Modal Awal',
  expected_cash: 'Kas Seharusnya',
  actual_cash: 'Kas Fisik',
  difference: 'Selisih',

  // Pembelian
  supplier_id: 'Pemasok',
  purchase_date: 'Tanggal Beli',
  due_date: 'Jatuh Tempo',
  invoice_no: 'No. Faktur',
  remaining_amount: 'Sisa',
}

/**
 * Dipakai saat membuat definisi kolom baru: kembalikan label dari
 * kamus, atau `accessorKey` mentah + warning di console (development
 * saja) supaya kolom yang lupa diberi label ketahuan saat development,
 * bukan diam-diam tampil sebagai nama kolom database di produksi.
 */
export function columnLabel(accessorKey: string, explicit?: string): string {
  if (explicit) return explicit

  const label = COLUMN_LABELS[accessorKey]

  if (!label && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[COLUMN_LABELS] Tidak ada label Indonesia untuk kolom "${accessorKey}" — tambahkan ke resources/js/Lib/labels.ts.`)
  }

  return label ?? accessorKey
}
