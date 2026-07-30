# T-011 — Middleware `EnsureIdempotencyKey` + Rate Limit Login

**Fase induk:** Fase 1 (Autentikasi, Role & Pengguna)
**Estimasi:** S (≤2 jam)

## Deskripsi

Middleware pencegah double-submit untuk endpoint tulis kritis, dan
konfigurasi rate limiting login — dua kebutuhan keamanan lintas-fase
yang sebaiknya disiapkan sejak Fase 1 sebelum endpoint kritis pertama
(deposit, sale) dibangun.

## Kriteria Penerimaan

- [ ] Middleware `EnsureIdempotencyKey` membaca header
      `X-Idempotency-Key`; bila tidak ada pada route yang mendaftarkan
      middleware ini, tolak dengan HTTP 400
- [ ] Middleware didaftarkan (belum diterapkan ke route bisnis — itu
      tugas fase masing-masing) untuk endpoint yang **akan** wajib
      memakainya nanti: `/pos/complete`, `/pos/scan`,
      `/admin/deposit/topup`, `/admin/deposit/withdraw`,
      `/wali/top-up`, `/admin/receivable/{id}/pay`,
      `/admin/debt/{id}/pay` — didaftarkan sebagai alias middleware yang
      siap dipakai ("`idempotent`"), penerapan konkret ke tiap route
      terjadi di fase pemilik endpoint tsb (T-026, T-051, dst)
- [ ] Rate limiter Laravel dikonfigurasi: login staff 5x/menit per IP,
      login wali 5x/menit per nomor HP (disiapkan strukturnya, dipakai
      penuh di T-096)
- [ ] PIN member: 3x salah → kunci 15 menit (selaras dengan
      `AuthorizationService`, T-008, tapi ini untuk PIN pembayaran
      member bukan PIN supervisor — dua konteks berbeda)

## Blocking Edges

- T-006 harus sudah selesai.

## Referensi

- CONTEXT.md § Istilah Teknis (Idempotency Key)
- SPEC.md § 4 poin 20, 25, § 5 (Keamanan)
- `CATATAN-PERBAIKAN.md` § Perbaikan Lintas-Fase (daftar endpoint wajib
  idempotency_key)

## Catatan Implementasi

- Middleware ini **disiapkan** di Fase 1, tapi penerapannya ke route
  konkret terjadi bertahap seiring endpoint itu dibangun (Fase 4, 8, 9,
  16) — jangan terapkan ke route yang belum ada di Fase 1.
- Rate limit PIN member (3x → kunci 15 menit) **berbeda** dari rate
  limit PIN supervisor di `AuthorizationService` (T-008) — member yang
  terkunci tidak bisa bayar pakai saldo, supervisor yang terkunci tidak
  bisa memberi otorisasi. Pastikan cache key keduanya tidak bentrok.
