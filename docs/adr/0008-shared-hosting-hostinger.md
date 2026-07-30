# ADR-0008: Deploy shared hosting Hostinger, migrasi VPS setelah bulan ke-6

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Proyek solo-maintainer dengan skala satu outlet (~70+
santri). Anggaran hosting terbatas — VPS/managed cloud tidak proporsional
di tahap awal.

## Keputusan

Deploy ke **shared hosting Hostinger** (Premium/Business), dengan
konsekuensi arsitektur eksplisit:
- **Tidak ada Redis** — cache & session pakai driver `database`/`file`.
- **Tidak ada queue worker/Supervisor** — queue jalan lewat **cron**
  (polling per menit), bukan `queue:work` persisten.
- **Tidak ada websocket/Reverb** — tidak feasible di shared hosting.
- **Backup harian** via cron ke Backblaze B2 (offsite), retention lokal
  30 hari / offsite 90 hari, notifikasi ke owner bila backup gagal.

## Alternatif yang Dipertimbangkan

1. **VPS sejak awal** — lebih fleksibel (Supervisor, Redis, Reverb),
   tapi biaya & kompleksitas ops tidak proporsional untuk skala satu
   outlet sekolah dengan satu maintainer.
2. **Platform managed (Laravel Forge + DigitalOcean, dst)** — bagus
   tapi budget tidak tersedia di fase MVP ini.

## Konsekuensi

- Semua job antrian (ekspor Excel besar, notifikasi WA, dst) didesain
  idempotent dan toleran terhadap keterlambatan eksekusi (polling cron,
  bukan instan).
- Ekspor Excel > 5000 baris → wajib lewat antrian cron, kirim email saat
  selesai — tidak boleh render langsung di request HTTP (timeout risk).
- Target performa: layar kasir < 800ms p95 untuk 30 concurrent user
  (skenario istirahat santri bareng). Diuji dengan `k6`/`wrk` di Fase 18.
- `session:auto-close` dan job pemeliharaan lain dijadwalkan lewat
  Laravel Scheduler + cron sistem (`* * * * * php artisan schedule:run`).

## Tanggal Peninjauan Ulang

Setelah bulan ke-6 produksi, atau lebih cepat bila uji beban Fase 18
menunjukkan target performa tidak tercapai — evaluasi migrasi ke VPS.
