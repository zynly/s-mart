# ADR-0010: Payment gateway ditunda ke Fase 19+, MVP hanya manual top-up

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Portal Wali (Fase 16) butuh mekanisme top-up saldo santri
dari jarak jauh. Integrasi payment gateway (Midtrans/Xendit) menambah
kompleksitas signifikan (webhook, rekonsiliasi otomatis, biaya MDR,
sertifikasi keamanan pembayaran).

## Keputusan

MVP hanya mendukung **top-up manual**: wali mengajukan `TopupRequest`
dengan upload bukti transfer, diverifikasi manual oleh admin/treasurer
(tidak butuh sesi kasir aktif — uang masuk ke rekening bank, bukan
laci). Kolom `topup_requests.payment_provider` selalu bernilai
`'manual'` di MVP; kolom ini sudah disiapkan strukturnya (bukan
diaktifkan) untuk integrasi Midtrans/Xendit di Fase 19+.

Notifikasi WhatsApp memakai `NullGateway` (hanya log) sebagai default —
implementasi Fonnte/Wablas menyusul, tidak memblokir MVP.

## Alternatif yang Dipertimbangkan

**Integrasi payment gateway sejak MVP** — ditolak: menambah dependency
eksternal (biaya transaksi, kepatuhan PCI/keamanan, downtime pihak
ketiga) sebelum volume transaksi cukup besar untuk membenarkan
kompleksitas itu.

## Konsekuensi

- Verifikasi top-up adalah proses manual dengan SLA (mis. diverifikasi
  dalam jam kerja), bukan instan — wali diberi tahu status via
  notifikasi (email/WA NullGateway di MVP).
- Struktur data (`payment_provider`, `payment_reference`) sudah
  mengakomodasi integrasi gateway nanti tanpa migrasi ulang skema.
- Rate limit login wali: 5x/menit per nomor HP (mencegah brute force
  pada mekanisme manual ini).

## Tanggal Peninjauan Ulang

Fase 19+ — saat volume top-up manual jadi beban operasional berarti bagi
admin/treasurer, evaluasi aktivasi payment gateway otomatis.
