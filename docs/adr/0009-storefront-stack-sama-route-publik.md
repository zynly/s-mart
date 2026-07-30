# ADR-0009: Storefront pakai stack sama (Inertia+React), route publik terpisah

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Rencana asli 18 fase tidak mencakup storefront publik.
`fase-19-storefront-publik.md` menambahkannya sebagai fase baru: katalog
produk publik (seperti Alfamart/Superindo, tapi tanpa checkout online).

## Keputusan

Storefront dibangun dengan **stack yang sama** (Laravel + Inertia +
React), bukan aplikasi/framework terpisah, di bawah route publik `/`
(terpisah dari `/admin` dan `/pos`). Tiga area aplikasi:

1. **Publik** (`/`) — katalog, tanpa login, tanpa checkout online.
2. **Portal Wali** (`/wali`) — login HP + password.
3. **Admin & Kasir** (`/admin`, `/pos`) — login staff.

## Alternatif yang Dipertimbangkan

1. **Static site generator terpisah** (Astro, dst) — butuh sinkronisasi
   data produk manual/API tambahan, kompleksitas ops ganda untuk solo
   maintainer.
2. **Tidak ada storefront** — ditolak, ini kebutuhan eksplisit dari
   README-v2.md (transparansi harga ke calon santri/wali).

## Konsekuensi

- `ProductPublicData` DTO terpisah dari `ProductData` admin — **wajib**
  menyaring HPP, margin, dan angka stok (hanya badge Tersedia/Habis).
- Produk dengan `is_visible_public = false` tidak boleh muncul lewat
  jalur apapun di storefront (termasuk API/DTO manapun).
- Caching agresif (`cache_ttl_minutes` di `config/storefront.php`) untuk
  mengurangi beban shared hosting pada halaman publik berlalu-lintas
  tinggi.
- SEO dasar (meta tag, sitemap) jadi bagian storefront, bukan
  ditambahkan belakangan.

## Tanggal Peninjauan Ulang

Saat Fase 19 (Storefront Publik) dan Fase UI-01 selesai diimplementasikan.
