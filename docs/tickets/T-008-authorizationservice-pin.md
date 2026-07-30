# T-008 — `AuthorizationService::requestOverride()` (PIN Otorisasi Supervisor)

**Fase induk:** Fase 1 (Autentikasi, Role & Pengguna)
**Estimasi:** S (≤2 jam)

## Deskripsi

Service dan modal PIN yang dipakai lintas-fase untuk otorisasi tindakan
melampaui wewenang kasir biasa (void, ubah harga, diskon di atas batas,
approve selisih kas/opname).

## Kriteria Penerimaan

- [ ] `AuthorizationService::requestOverride(string $permission, string
      $pin): User` mencari user yang **punya permission tsb** DAN PIN
      cocok (`Hash::check`), mengembalikan user itu sebagai "penyetuju"
- [ ] Salah PIN 3x berturut-turut → kunci percobaan 15 menit
      (cache-based, key per user atau per permission — bukan global)
- [ ] Setiap percobaan (berhasil/gagal) dicatat ke activity log
      (`spatie/laravel-activitylog`, via `LogsActivityCustom` trait dari
      T-001)
- [ ] Modal PIN (`Components/common/ConfirmDialog` + `PinInput`, sudah
      ada dari Fase 0) dipakai sebagai basis — bukan bikin modal baru
      dari nol
- [ ] Endpoint/Inertia action untuk override menerima `permission` dan
      `pin`, mengembalikan error jelas (PIN salah / permission tidak
      ditemukan / terkunci — bukan pesan generik)

## Blocking Edges

- T-006 dan T-007 harus sudah selesai (butuh kolom `users.pin` dan
  permission terdaftar).

## Referensi

- CONTEXT.md § Istilah Teknis (Supervisor Override)
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 1, bagian 4

## Catatan Implementasi

- Dipakai lintas banyak fase berikutnya (void T-070, ubah harga T-014,
  diskon di atas batas T-063, approve opname T-074, approve selisih kas
  T-045/T-046) — desain sejak awal sebagai service generik yang menerima
  string permission, bukan method khusus per kasus pemakaian.
- `PinInput` dari Fase 0 sudah mendukung auto-advance & masking — modal
  ini tinggal merangkai `PinInput` + tombol submit + pemanggilan service,
  bukan membangun input PIN dari nol.
