# ADR-0005: Sistem Kredit Anggota via `receivable_limit`, bukan `allow_negative`

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Rencana asli Fase 3 (Anggota & Kartu) punya field
`allow_negative` dan `credit_limit` di tabel `members`, sementara Fase 9
(Pembayaran) punya metode bayar terpisah "Kredit/Tempo" yang menerbitkan
`Receivable`. Ini konflik langsung — dua mekanisme kredit berbeda.

## Keputusan

**Hanya satu mekanisme kredit**: metode bayar **Kredit** di Fase 9.
Belanja di atas saldo menerbitkan `Receivable` (piutang), dibatasi oleh
kolom baru `members.receivable_limit` (batas total piutang **aktif** per
anggota, dicek via `canUseCredit()`).

Kolom `allow_negative` dan `credit_limit` **dibuang** dari tabel
`members`.

## Alternatif yang Dipertimbangkan

1. **Pertahankan `allow_negative`** — saldo deposit boleh minus sampai
   batas tertentu. Ditolak: mencampur konsep "saldo" (ledger append-only,
   sumber kebenaran tunggal) dengan "utang" (piutang terpisah per
   transaksi, punya siklus bayar/jatuh-tempo sendiri) — membingungkan
   secara akuntansi dan sulit dilacak jatuh temponya.
2. **Dua mekanisme berjalan paralel** — ditolak: aturan bisnis jadi
   ambigu (santri bisa punya saldo minus DAN piutang sekaligus?).

## Konsekuensi

- Belanja di atas saldo → tolak, kecuali kasir pilih metode bayar Kredit
  dan `canUseCredit()` mengizinkan (piutang aktif + nominal baru ≤
  `receivable_limit`).
- Di atas limit → tolak kecuali ada override supervisor via PIN.
- Permission `receivable.delete` ("Hapus Piutang") eksklusif untuk
  owner, hanya untuk piutang > 90 hari (menyelesaikan konflik istilah
  `receivable.write_off` vs "hapus piutang" di Fase 1/9 — nama final:
  `receivable.delete`).
- Laporan Aging (0–30/31–60/61–90/>90 hari) berlaku untuk piutang ini.

## Tanggal Peninjauan Ulang

Setelah Fase 9 (Pembayaran) selesai — pastikan tidak ada sisa referensi
`allow_negative`/`credit_limit` di kode maupun dokumen fase lanjutan.
