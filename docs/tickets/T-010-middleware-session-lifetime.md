# T-010 — Middleware `AdjustSessionLifetime` (Timeout per Role)

**Fase induk:** Fase 1 (Autentikasi, Role & Pengguna)
**Estimasi:** S (≤2 jam)

## Deskripsi

Middleware yang menyetel durasi session berbeda per role — konsekuensi
konteks online yang tidak dibahas eksplisit di rencana asli (aplikasi
Livewire lokal tidak seketat ini soal timeout).

## Kriteria Penerimaan

- [ ] Middleware `AdjustSessionLifetime` set `config('session.lifetime')`
      **sebelum** session ditulis, berdasarkan role user yang login:
      cashier 30 menit, warehouse 1 jam, treasurer/admin/supervisor 2
      jam, owner 8 jam, guardian (wali) 2 jam
- [ ] Middleware terpasang di grup `web` untuk route yang butuh auth
      (bukan global — guest routes tidak butuh ini)
- [ ] Diverifikasi manual: login sebagai cashier, cek `session()
      ->get('_token')` expiry mengikuti 30 menit (via cek kolom
      `sessions.last_activity` di database)

## Blocking Edges

- T-006 harus sudah selesai.

## Referensi

- CONTEXT.md § Aktor
- `CATATAN-PERBAIKAN.md` § Fase 1 (Session timeout per role)

## Catatan Implementasi

- Ini **penambahan baru**, tidak ada di `PROMPT-POS-SKILLAGE-MART.md`
  asli — murni hasil `CATATAN-PERBAIKAN.md` karena konteks aplikasi
  online (rencana asli Livewire diasumsikan lokal/intranet tanpa
  pertimbangan timeout ketat).
- Middleware ini beda dari `EnsureIdempotencyKey` (T-011) — jangan
  digabung jadi satu middleware, tanggung jawabnya berbeda.
