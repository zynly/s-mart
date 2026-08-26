# FASE 16 V2 — PORTAL WALI SANTRI

> **Baca dulu sebelum mengerjakan:**
> 1. `@README-v2.md` — stack, aturan kode, aturan translasi
> 2. `@CATATAN-PERBAIKAN.md` — keputusan yang sudah dikunci
> 3. `@REVISI-R1-v2.md` — perubahan hasil uji coba (§ 8 khusus portal wali)
> 4. `@fase-04-v2.md` — DepositService, topup_requests
> 5. `@fase-03-v2.md` — MemberService, CardService, MemberLimitService
> 6. `@docs/CONTEXT.md` — kamus domain
>
> Konfirmasi pemahaman sebelum mulai:
> - Apa metode login wali? (HP + password, bukan OTP)
> - Apa yang terjadi bila top-up ditolak? (notifikasi dalam aplikasi)
> - Bagaimana reset password wali? (pertanyaan keamanan: NIS + nama + tanggal lahir)
> - Notifikasi lewat apa? (hanya dalam aplikasi — BUKAN WhatsApp)

**Target:** portal mobile-first yang bisa diakses wali dari HP untuk
memantau saldo, belanja anak, dan mengajukan top-up.

**Filosofi desain:** wali membuka portal dengan satu kekhawatiran —
"Anak saya baik-baik saja? Uangnya cukup?" Portal harus menjawab
pertanyaan itu dalam 3 detik pertama. Bukan untuk administrasi.
Bukan untuk laporan teknis. Sesimpel dan setenang mungkin.

**Prasyarat:** Fase 0–4 (fondasi, auth, master data, anggota, deposit)
sudah selesai.

**Estimasi:** 2 sesi (sesi A: auth + halaman utama + top-up,
sesi B: notifikasi + pengaturan + fitur lanjutan)

---

```
=== FASE 16 V2: PORTAL WALI SANTRI ===

──────────────────────────────────────────────
1. TABEL
──────────────────────────────────────────────

guardians:
  id, name, phone (unique, format: 628xxxxxxxxx),
  email (nullable), password (bcrypt),
  is_active (bool, default true),
  pin_reset_attempts (int, default 0),
  pin_reset_locked_until (datetime, nullable),
  last_login_at (datetime, nullable),
  last_login_ip (string, nullable),
  last_login_user_agent (string 500, nullable),
  timestamps

guardian_member:                  ← pivot wali ↔ anak
  id, guardian_id, member_id,
  is_primary (bool, default false),
  timestamps
  Unique: (guardian_id, member_id)

notification_settings:
  id, guardian_id,
  transaction_alert (bool, default true),
  low_balance_alert (bool, default true),
  low_balance_threshold (bigint, default 20000),
  weekly_summary (bool, default true),
  topup_alert (bool, default true),
  timestamps

notification_logs:                ← sudah ada di Fase 15/16 asli
  id, notifiable_type, notifiable_id,
  channel (inapp|wa|email),
  template, payload (json),
  status (pending|sent|failed|read),
  sent_at, read_at, error,
  timestamps

CATATAN: tabel notifications bawaan Laravel dipakai untuk notifikasi
dalam aplikasi. notification_logs untuk audit pengiriman.

──────────────────────────────────────────────
2. AUTH WALI
──────────────────────────────────────────────

Guard terpisah: 'guardian' — bukan guard 'web' yang dipakai staff.

config/auth.php tambahkan:
  guards.guardian:
    driver: session
    provider: guardians
  providers.guardians:
    driver: eloquent
    model: App\Models\Guardian

Session timeout wali: 2 jam (dari config/settings, bisa diubah owner
via Fase 17).

Rate limit login: 5x per menit per nomor HP.

HALAMAN AUTH WALI:

/wali/login — Pages/Wali/Auth/Login.tsx
  Layout: WaliGuestLayout (beda dari GuestLayout staff)
  Desain:
    - Background: gradient khaki-50 ke khaki-100
    - Kartu putih rounded-2xl shadow-lg tengah layar
    - Logo sekolah atas kartu (kecil)
    - Judul: "Portal Orang Tua / Wali"
    - Subjudul: "Skillage Mart · SMK Skill Village"
    - Input HP (format otomatis: 08xx → 628xx saat submit)
    - Input password (dengan toggle show/hide)
    - Tombol Login: navy penuh, lebar, tinggi
    - Link "Lupa Password?" → /wali/lupa-password
    - Footer: "Belum punya akun? Hubungi admin sekolah."
      (wali tidak bisa daftar sendiri — admin yang buatkan)

/wali/lupa-password — Pages/Wali/Auth/ForgotPassword.tsx
  LANGKAH 1 — Input nomor HP:
    Judul: "Verifikasi Identitas"
    Input HP yang terdaftar
    Tombol Lanjut → validasi HP ada di database
    Bila tidak ada → pesan netral "Data tidak ditemukan"
    Rate limit: 3 percobaan per HP per jam. Gagal 3x →
    kunci HP tersebut 24 jam (guardian.pin_reset_locked_until)

  LANGKAH 2 — Pertanyaan keamanan (muncul bila HP valid):
    Sistem memilih satu anak wali secara acak dan menampilkan:
    "Untuk memverifikasi identitas Anda, jawab pertanyaan
     berikut tentang anak Anda."
    - Input NIS anak (TIDAK sebut nama anak — wali harus tahu)
    - Input nama lengkap anak (harus persis, case-insensitive)
    - Date picker tanggal lahir anak
    Semua tiga harus benar dalam satu submit.
    ⚠ PENTING: pesan gagal SELALU netral:
    "Data tidak cocok. Silakan coba lagi atau hubungi admin."
    JANGAN sebut mana yang salah (itu bocor info).
    JANGAN tampilkan nama/daftar anak untuk dipilih.

  LANGKAH 3 — Set password baru:
    Input password baru (min 8 karakter)
    Indikator kekuatan: Lemah / Sedang / Kuat
    Ulangi password baru
    Simpan → login otomatis + notifikasi:
    "Password berhasil diubah pada [waktu] dari IP [ip]"

/wali/logout — POST route, clear guardian session

──────────────────────────────────────────────
3. LAYOUT WALI
──────────────────────────────────────────────

WaliLayout.tsx (resources/js/Layouts/WaliLayout.tsx):

HEADER (sticky top):
  - Background: navy-800
  - Kiri: logo kecil + "Portal Wali"
  - Kanan: ikon lonceng 🔔 (dengan badge merah jumlah belum dibaca)
    + nama wali singkat + tombol profil

BOTTOM NAVIGATION BAR (sticky bottom, hanya di mobile):
  4 tab dengan ikon + label:
  [🏠 Beranda] [👶 Anak] [💰 Top-Up] [👤 Akun]

  Ikon aktif: mustard
  Ikon tidak aktif: gray-400
  Background bar: white dengan shadow-up tipis
  Setiap tab navigasi ke route Inertia masing-masing

KONTEN: flex-1 overflow-y-auto, padding bawah 80px (ruang bottom nav)
MAX-WIDTH: 480px, center di layar yang lebih lebar (untuk tablet/desktop)

PULL TO REFRESH:
  Tambahkan di semua halaman utama. Gesture swipe-down memicu
  router.reload({ preserveScroll: false }).
  Implementasi via usePullToRefresh() hook:
    useEffect: pasang touchstart, touchmove, touchend listener
    Threshold: tarik > 60px → trigger refresh
    Animasi: spinner kecil saat loading

SKELETON LOADING:
  Saat data dimuat, tampilkan placeholder abu-abu animasi pulse.
  JANGAN spinner tengah layar — itu membuat wali cemas.
  Gunakan komponen <Skeleton> dari shadcn.

──────────────────────────────────────────────
4. HALAMAN BERANDA — /wali
──────────────────────────────────────────────

Pages/Wali/Home.tsx

Data dari controller:
  - Nama wali (sapaan: Pak/Bu berdasarkan data atau default "Bapak/Ibu")
  - Array anak: foto, nama, kelas, saldo, status kartu, terakhir belanja
  - 5 transaksi terhari ini atau hari terakhir (bila belum ada hari ini)
  - Top-up request pending (bila ada)

TAMPILAN:

Sapaan:
  "Selamat [pagi/siang/sore/malam], Pak/Bu {nama} 👋"
  Tanggal hari ini (Indonesia: Rabu, 30 Juli 2026)

Kartu anak (satu kartu per anak, bisa swipe horizontal bila > 1):

  ┌─────────────────────────────────┐
  │ [foto bulat]  Ahmad Fauzi       │
  │               X PPLG 1         │
  │                                 │
  │         Rp 61.500               │
  │    (font-mono 2xl, warna sesuai)│
  │                                 │
  │  [●] Kartu Aktif                │
  │  Terakhir belanja: 2 jam lalu   │
  │                                 │
  │  [Top-Up Sekarang] [Riwayat]    │
  └─────────────────────────────────┘

WARNA SALDO sesuai kondisi:
  > Rp 25.000  → text-success (hijau)
  Rp 10.000–25.000 → text-warning (oranye)
  < Rp 10.000  → text-danger (merah) + animate-pulse halus
  Kartu border ikut warna saldo (border-2 sesuai warna)

Bila anak > 1: tampilkan indikator dot di bawah kartu (•••)
dan bisa swipe. Di desktop: kartu berjejer 2 kolom.

LIMIT HARIAN (bila diset):
  Di bawah saldo, tampilkan progress bar:
  "Batas Hari Ini: Rp 9.500 / Rp 15.000"
  Progress bar dengan warna yang sama seperti saldo

BELANJA TERKINI (di bawah kartu):
  Judul: "Aktivitas Terkini"
  List 5 transaksi terakhir dalam format timeline:
    [jam]  [nama produk]  [−Rp nominal]
  Waktu ditampilkan RELATIF: "tadi", "2 jam lalu", "kemarin",
    "3 hari lalu" — BUKAN timestamp absolut
  Bila beli > 1 item: "Roti Coklat + 2 produk lain"
  Tap → buka detail transaksi
  Tombol "Lihat semua riwayat" di bawah

PERINGATAN TOP-UP PENDING (bila ada):
  Banner oranye di bawah kartu:
  "⏳ Top-Up Rp 50.000 menunggu verifikasi · Dikirim tadi pagi"
  Tap → buka halaman status top-up

EMPTY STATE BELANJA:
  Bila belum ada belanja hari ini:
  "Belum ada belanja hari ini 🌟"
  (jangan tulis "No data" — itu tidak manusiawi)

──────────────────────────────────────────────
5. HALAMAN DETAIL ANAK — /wali/anak/{member_id}
──────────────────────────────────────────────

Pages/Wali/Child.tsx

AKSES: wali hanya bisa akses anak yang terdaftar di guardian_member.
Coba akses anak orang lain → 403.

BAGIAN ATAS:
  Foto + nama + kelas + saldo besar
  Saldo dengan warna kondisi (sama seperti beranda)

LIMIT HARIAN:
  Progress bar dengan angka:
  "Rp 9.500 dari Rp 15.000 (63%)"
  [=======---] warna sesuai kondisi
  Tombol "Ajukan Perubahan Limit" → form Dialog sederhana
    Input nominal limit baru + alasan → dikirim ke admin
    Admin menyetujui di panel admin

GRAFIK BELANJA MINGGUAN:
  Bar chart sederhana (recharts BarChart, tipis dan ringan):
  7 batang untuk 7 hari terakhir (Sen–Min)
  Tinggi batang proporsional dengan nominal belanja
  Warna: mustard
  Di bawah chart: "Total 7 hari: Rp 47.000 ·
  Rata-rata/hari: Rp 6.700"
  Tap batang → tampilkan nominal di tooltip

YANG SERING DIBELI (top 5 bulan ini):
  Judul: "Belanja Favorit Bulan Ini"
  List dengan ikon emoji kategori + nama + frekuensi:
    🍞 Roti Coklat         12x
    🥤 Minuman Teh Kotak    8x
    🍜 Mie Instan           6x
  (ikon emoji diambil dari kategori produk, default 🛍)
  Bila tidak ada data: "Belum ada data bulan ini"

RIWAYAT BELANJA:
  Dikelompokkan per hari (format kalender):

    ─── Hari Ini ──────────────────
    12:30  Roti Coklat + 2 lainnya   Rp 10.500
    07:15  Air Mineral                Rp 2.000

    ─── Kemarin ───────────────────
    14:00  Mie Instan, Teh Kotak     Rp 8.500

    ─── 28 Juli ───────────────────
    ...

  Load more: tombol "Muat lebih banyak" (bukan infinite scroll —
  itu bisa bikin wali scroll tanpa sadar berapa banyak data)

  Tap transaksi → Dialog detail:
    Daftar item lengkap, nominal per item, total, kasir, waktu

STATUS KARTU:
  Section paling bawah:
  "Kartu Member"
  ● Aktif · No. 202600001
  Terakhir dipakai: [waktu relatif]

  Tombol [Laporkan Kartu Hilang] — warna bahaya (danger), kecil
  Tap → Dialog konfirmasi:
    "Kartu yang dilaporkan hilang akan dinonaktifkan. Admin akan
     menghubungi Anda untuk proses kartu pengganti.
     Saldo tidak akan hilang."
    [Batal] [Ya, Laporkan]
  Setelah submit → status kartu jadi 'lost' + notifikasi ke admin

──────────────────────────────────────────────
6. HALAMAN TOP-UP — /wali/top-up
──────────────────────────────────────────────

Pages/Wali/Topup.tsx

SUB-HALAMAN 1 — Ajukan Top-Up:

  Pilih anak (bila > 1): dropdown dengan nama + saldo saat ini
  Tampilkan saldo sekarang dengan warna kondisi

  Input nominal:
    Input angka besar (font-mono 2xl, center)
    Auto-format: ketik 50000 → tampil "Rp 50.000"
    Tombol cepat: [20rb] [50rb] [100rb] [200rb]
    Minimal: Rp 10.000 (dari config pos.deposit_min_topup)
    Validasi realtime: nominal di bawah minimal → border merah

  Info rekening tujuan:
    Kartu per rekening (bisa ada beberapa):
    ┌─────────────────────────┐
    │ 🏦 BCA                  │
    │ 1234 5678 90            │
    │ a.n. SMK Skill Village  │
    │ [Salin Nomor]           │
    └─────────────────────────┘
    Tombol "Salin Nomor" → copy to clipboard + toast "Disalin!"
    Nomor rekening diambil dari config storefront (bisa diubah admin)

  Nama pengirim:
    Input teks, pre-fill dengan nama wali

  Tanggal transfer:
    Date picker, default hari ini, tidak bisa pilih masa depan

  Unggah bukti:
    Tombol besar: "📷 Foto Bukti Transfer"
    Tap → file picker dengan accept="image/*" dan capture="environment"
    Setelah pilih: pratinjau thumbnail + tombol ganti
    Compress gambar di client (max 1MB) sebelum upload menggunakan
    canvas.toBlob() dengan quality 0.7 — penting untuk wali dengan
    kuota internet terbatas
    Format yang diterima: JPG, PNG, WEBP
    Validasi: wajib ada bukti, max 5MB sebelum compress

  Tombol Kirim Permohonan:
    Navy penuh, lebar, disabled sampai semua field valid
    Loading state saat submit: spinner + "Mengirim..."
    Setelah berhasil → navigasi ke halaman status dengan animasi

  Info waktu verifikasi:
    "ℹ️ Saldo akan ditambahkan setelah admin memverifikasi.
     Biasanya dalam 1×24 jam kerja (Senin–Sabtu)."

SUB-HALAMAN 2 — Riwayat Top-Up:

  Tab di atas: [Ajukan] [Riwayat]

  List semua top-up request:
    Setiap item:
    [ikon status] [nominal] [tanggal]
    [status badge: Menunggu / Disetujui / Ditolak]

    Warna badge:
    Menunggu  → kuning (warning)
    Disetujui → hijau (success)
    Ditolak   → merah (danger)

    Tap item → Dialog detail:
      Nominal, tanggal ajukan, tanggal diproses, nama admin yang
      memproses, alasan bila ditolak, thumbnail bukti transfer

──────────────────────────────────────────────
7. HALAMAN AKUN — /wali/akun
──────────────────────────────────────────────

Pages/Wali/Account.tsx

PROFIL:
  Foto avatar (inisial nama bila tidak ada foto)
  Nama lengkap
  Nomor HP (masked: 0812-xxxx-1234)
  Tombol Edit Profil → form nama, email (opsional)

PENGATURAN:

  Notifikasi:
    Toggle per jenis:
    - Notifikasi transaksi anak [ON]
    - Peringatan saldo menipis [ON]
      Nominal threshold: input bila ON
    - Rekap mingguan [ON]
    - Status top-up [ON]

  Keamanan:
    Tombol "Ubah Password" → form:
      Password lama (wajib)
      Password baru (min 8, indikator kekuatan)
      Ulangi password baru
      Simpan → toast sukses + logout semua sesi lain

BANTUAN:
  Link "FAQ" → /faq (halaman publik, tanpa login)
  Link "Kirim Pesan ke Admin" → form pesan sederhana:
    Subjek (dropdown: Saldo / Kartu / Top-Up / Lainnya)
    Pesan (textarea)
    Kirim → tersimpan di tabel feedbacks, admin dapat notifikasi

KELUAR:
  Tombol merah, di bagian paling bawah
  Konfirmasi: "Yakin ingin keluar?"

──────────────────────────────────────────────
8. HALAMAN NOTIFIKASI — /wali/notifikasi
──────────────────────────────────────────────

Pages/Wali/Notifications.tsx

Dibuka dari ikon lonceng di header.

TAMPILAN:
  List notifikasi, terbaru di atas:
  Item belum dibaca: background surface-alt (sedikit lebih gelap)
  Item sudah dibaca: background surface

  Setiap item:
  [ikon jenis] [judul] [waktu relatif]
               [pesan singkat]

  Ikon per jenis:
    ✅ Top-up disetujui
    ❌ Top-up ditolak
    ⚠️ Saldo menipis
    🛍 Transaksi anak
    🎂 Ulang tahun (bila ada bonus)
    📊 Rekap mingguan

  Tap item → tandai dibaca + buka detail (Dialog atau navigate)
  Tombol "Tandai semua dibaca" di atas bila ada yang belum dibaca

POLLING:
  Poll /wali/api/notif-count setiap 30 detik (hanya angka belum dibaca)
  Implementasi: useEffect + setInterval + cleanup
  Bila ada yang baru: update badge lonceng + bunyi lonceng halus
    (Web Audio API, bisa dinonaktifkan di pengaturan)
  Judul tab: "(3) Portal Wali" saat ada 3 belum dibaca

TEMPLATE NOTIFIKASI:

  TopupApproved:
    Judul: "Top-Up Berhasil ✅"
    Pesan: "Top-up Rp 50.000 untuk Ahmad Fauzi telah disetujui.
            Saldo sekarang Rp 73.500."

  TopupRejected:
    Judul: "Top-Up Ditolak ❌"
    Pesan: "Top-up Rp 50.000 ditolak. Alasan: {alasan}.
            Silakan ajukan ulang atau hubungi admin."

  LowBalance:
    Judul: "Saldo Menipis ⚠️"
    Pesan: "Saldo Ahmad Fauzi tersisa Rp 8.000. Silakan top-up
            agar anak Anda bisa berbelanja."
    Tombol di notifikasi: [Top-Up Sekarang]

  WeeklySummary:
    Judul: "Rekap Minggu Ini 📊"
    Pesan: "Ahmad belanja Rp 47.000 minggu ini.
            Sisa saldo: Rp 61.500."

  Birthday (bila konfigurasi bonus aktif):
    Judul: "Selamat Ulang Tahun! 🎂"
    Pesan: "Selamat ulang tahun Ahmad Fauzi! Bonus saldo
            Rp 10.000 telah ditambahkan."

──────────────────────────────────────────────
9. COMMAND & SCHEDULER
──────────────────────────────────────────────

php artisan notify:low-balance  (harian 07:00)
  - Cari anak dengan balance_cache < threshold per wali
  - Buat notifikasi inapp via Guardian::notify()
  - Chunk 200 per iterasi

php artisan notify:weekly-summary  (Ahad 19:00)
  - Hitung total belanja 7 hari untuk semua anak
  - Buat notifikasi per wali
  - Sertakan grafik mini sebagai teks (tidak perlu gambar)

php artisan promo:birthday  (harian 06:00, sudah ada di Fase 10)
  - Bila konfigurasi bonus ulang tahun = notif:
    Buat notifikasi ulang tahun ke wali juga

Semua command: chunkById(500), log error, tidak crash bila wali tidak
punya pengaturan notifikasi (fallback ke default).

──────────────────────────────────────────────
10. BACKEND
──────────────────────────────────────────────

ROUTES (routes/web.php, group prefix 'wali', guard 'guardian'):

  GET  /wali/login                → Wali\Auth\LoginController@show
  POST /wali/login                → Wali\Auth\LoginController@store
  POST /wali/logout               → Wali\Auth\LoginController@destroy
  GET  /wali/lupa-password        → Wali\Auth\ForgotPasswordController@show
  POST /wali/lupa-password        → Wali\Auth\ForgotPasswordController@verify
  POST /wali/reset-password       → Wali\Auth\ForgotPasswordController@reset

  GET  /wali                      → Wali\HomeController@index
  GET  /wali/anak/{member}        → Wali\ChildController@show
  GET  /wali/top-up               → Wali\TopupController@index
  POST /wali/top-up               → Wali\TopupController@store
  GET  /wali/akun                 → Wali\AccountController@index
  PATCH /wali/akun                → Wali\AccountController@update
  PATCH /wali/akun/password       → Wali\AccountController@updatePassword
  GET  /wali/notifikasi           → Wali\NotificationController@index
  PATCH /wali/notifikasi/baca-semua → Wali\NotificationController@readAll
  PATCH /wali/notifikasi/{id}     → Wali\NotificationController@read

  GET  /wali/api/notif-count      → JSON {count: int} — untuk polling
  POST /wali/anak/{member}/laporkan-kartu → Wali\ChildController@reportLostCard
  POST /wali/anak/{member}/ajukan-limit → Wali\ChildController@requestLimit
  POST /wali/pesan                → Wali\MessageController@store

MIDDLEWARE WALI:
  'auth:guardian' — guard terpisah
  'guardian.active' — cek guardian.is_active = true
  Rate limit login: throttle:5,1 per HP

CONTROLLER PENTING:

  Wali\HomeController@index:
    Ambil semua anak wali (via guardian_member)
    Untuk setiap anak: saldo, status kartu, terakhir belanja,
      5 transaksi terbaru, top-up pending
    Kirim ke Inertia. JANGAN kirim: alamat lengkap, NIS penuh,
      riwayat lengkap (hanya 5 terbaru)

  Wali\ChildController@show:
    Verifikasi anak adalah anak wali ini (policy)
    Data: saldo, limit, grafik 7 hari, top 5 produk bulan ini,
      riwayat belanja (paginate 15 per load), status kartu
    JANGAN kirim: HPP, nama supplier, detail outlet

  Wali\TopupController@store:
    Validasi: nominal, gambar, nama pengirim, tanggal
    Simpan gambar ke storage/app/topup-proofs/ (BUKAN public)
    Buat baris topup_requests dengan status pending
    Notifikasi ke semua admin/treasurer via database notification
    Return: redirect ke riwayat top-up dengan flash sukses

SECURITY KHUSUS PORTAL WALI:
  - Wali hanya bisa akses data anaknya sendiri (Guardian Policy)
  - Rate limit: login 5x/menit, reset password 3x/jam
  - Gambar bukti top-up di storage PRIVATE (bukan public folder)
    — diakses via signed URL sementara
  - Session cookie: SameSite=Lax, Secure (production), HttpOnly
  - Jangan tampilkan nomor kartu lengkap (hanya 4 digit terakhir)
  - Response Inertia tidak boleh mengandung:
    unit_cost, hpp, supplier_id, pin, password

──────────────────────────────────────────────
11. KOMPONEN REACT BARU
──────────────────────────────────────────────

resources/js/Components/wali/:

<ChildCard member saldo status />
  → Kartu anak dengan saldo berwarna, swipeable bila > 1

<BalanceDisplay amount condition />
  → Nominal saldo dengan warna kondisi + animasi pulse bila kritis

<DailyLimitBar used limit />
  → Progress bar limit harian dengan persentase

<WeeklyChart data />
  → Bar chart 7 hari (recharts, ringan)
  → Responsive: tinggi 120px di mobile

<FavoriteProducts items />
  → Daftar top 5 produk dengan ikon emoji + frekuensi

<TransactionTimeline items />
  → Timeline belanja dikelompokkan per hari
  → Waktu relatif (timeAgo function)

<TopupStatusCard request />
  → Kartu status top-up dengan badge warna

<NotificationItem notification />
  → Item notifikasi dengan ikon + read/unread state

<PullToRefresh onRefresh />
  → Wrapper gesture pull-to-refresh

<BankCard bank accountNumber accountName />
  → Kartu rekening tujuan top-up + tombol salin

<ImageUploadPreview value onChange maxSizeMB />
  → Upload gambar dengan pratinjau + compress otomatis

Hook baru:

usePullToRefresh(onRefresh: () => void): void
useNotificationPoll(intervalMs: number): { count: number }
useTimeAgo(date: string | Date): string
useImageCompress(quality: number): (file: File) => Promise<File>

──────────────────────────────────────────────
12. PANEL ADMIN — TAMBAHAN UNTUK PORTAL WALI
──────────────────────────────────────────────

Tambahkan ke panel admin (tanpa membuat menu baru, masuk sebagai tab
atau bagian dari menu yang ada):

/admin/anggota, tab Wali:
  DataTable wali: nama, HP, jumlah anak, terakhir login, aktif
  CRUD wali: tambah (admin yang buatkan akun), nonaktifkan
  Baris wali → tab anak terhubung
  Tombol Reset Password (admin reset manual untuk wali yang kesulitan)

/admin/deposit, tab Verifikasi Transfer (DIPERKUAT):
  - Preview gambar bukti dengan zoom (pakai react-medium-image-zoom)
  - Cek hash gambar: peringatan bila gambar identik pernah dipakai
    (indikasi bukti dipakai ulang)
  - Nominal > 500rb → wajib PIN supervisor sebelum setujui
  - Tombol Setujui butuh konfirmasi kedua:
    "Apakah Anda sudah memverifikasi mutasi rekening bank?"
    [Batal] [Sudah, Setujui]
  - Setelah setujui/tolak → notifikasi otomatis ke wali (inapp)

/admin/pengaturan, tambahkan bagian Portal Wali:
  Nomor rekening tujuan top-up (bisa lebih dari 1):
    - Nama bank, nomor rekening, nama pemilik
    - CRUD sederhana
  Nominal minimal top-up
  Pesan footer struk (teks konfirmasi di halaman top-up)
  Threshold saldo menipis (default notifikasi)

──────────────────────────────────────────────
13. DESAIN DETAIL
──────────────────────────────────────────────

FONT DI PORTAL WALI:
  Semua sama dengan aplikasi utama (Inter + JetBrains Mono).
  Nominal saldo: font-mono, ukuran sangat besar (text-4xl min).

SPACING:
  Padding halaman: px-4 py-4 (lebih rapat dari admin — layar kecil)
  Gap antar section: gap-4
  Kartu: rounded-2xl shadow-sm border border-border

ANIMASI:
  Transisi halaman: fade ringan (150ms opacity)
  Saldo pulse: animate-pulse hanya bila kritis
  Badge notifikasi: scale masuk saat muncul (scale-0 → scale-100)
  Skeleton: animate-pulse standard dari shadcn

EMPTY STATE:
  Belum ada transaksi: "Belum ada belanja hari ini 🌟"
  Belum ada notifikasi: "Semua sudah dibaca 👍"
  Belum ada top-up: "Belum pernah top-up"
  Semua dengan ikon dan warna muted — JANGAN teks teknis

ERROR STATE:
  Bila gagal load data: "Gagal memuat data. Tarik ke bawah untuk
  mencoba lagi." — dengan ikon dan tombol Coba Lagi
  JANGAN tampilkan pesan error teknis ke wali

AKSESIBILITAS:
  Semua tombol min 44×44px (standar touch target)
  Label aria pada semua input dan tombol ikon
  Kontras teks minimal WCAG AA (4.5:1)
  Tombol bahaya (hapus/laporkan): konfirmasi selalu

──────────────────────────────────────────────
CHECKLIST VERIFIKASI
──────────────────────────────────────────────

AUTH & KEAMANAN
□ Login wali dengan HP + password → berhasil
□ Login salah 5x dalam semenit → 429 Too Many Requests
□ Login wali tidak bisa masuk ke /admin (guard berbeda)
□ Admin tidak bisa masuk ke /wali (guard berbeda)
□ Wali coba akses data anak orang lain via URL → 403
□ Wali coba akses via API (hapus JS) → tetap 403
□ Response Inertia wali tidak mengandung: unit_cost, hpp, pin
□ Gambar bukti top-up di storage private, tidak bisa diakses
  langsung via URL tanpa autentikasi

RESET PASSWORD
□ Input HP yang tidak terdaftar → pesan netral
□ Input HP valid → muncul pertanyaan keamanan
□ Sistem TIDAK menampilkan nama/daftar anak
□ Salah satu dari tiga jawaban meleset → gagal dengan pesan netral
  (tidak sebut mana yang salah)
□ Ketiga benar → bisa set password baru
□ Gagal 3x dalam sejam → HP terkunci 24 jam
□ Reset sukses → login otomatis + notifikasi perubahan

BERANDA
□ Saldo tampil besar dan dengan warna sesuai kondisi
□ < Rp 10.000 → border merah + pulse
□ Waktu belanja: "2 jam lalu" bukan "14:32:15"
□ Pull to refresh berfungsi di mobile
□ Skeleton muncul saat loading (bukan spinner)
□ Swipe antar anak bila ada > 1 anak

DETAIL ANAK
□ Grafik 7 hari tampil (recharts bar chart)
□ Top 5 produk bulan ini tampil
□ Riwayat dikelompokkan per hari
□ Load more berfungsi (bukan infinite scroll)
□ Progress bar limit harian akurat
□ Laporkan kartu hilang → konfirmasi → kartu status 'lost'
□ Notifikasi ke admin setelah kartu dilaporkan hilang

TOP-UP
□ Tombol cepat nominal berfungsi
□ Nominal di bawah minimum → border merah + pesan
□ Nomor rekening bisa disalin (copy to clipboard)
□ Unggah foto dari kamera HP berfungsi
□ Gambar dikompres di client sebelum upload
□ Submit → redirect ke riwayat dengan status "Menunggu"
□ Riwayat top-up tampil dengan badge status berwarna

NOTIFIKASI
□ Lonceng di header dengan badge jumlah belum dibaca
□ Top-up disetujui admin → notifikasi muncul di wali
□ Top-up ditolak + alasan → notifikasi muncul di wali
□ Poll 30 detik berjalan (cek di Network tab DevTools)
□ Notifikasi baru → bunyi lonceng halus
□ Judul tab berubah: "(3) Portal Wali"
□ Tandai semua dibaca → badge hilang

PANEL ADMIN
□ Tab Wali di /admin/anggota ada
□ Admin bisa tambah/nonaktifkan wali
□ Verifikasi top-up > 500rb → PIN supervisor diminta
□ Verifikasi top-up → konfirmasi kedua muncul
□ Setelah setujui → notifikasi otomatis ke wali
□ Setelah tolak → notifikasi dengan alasan ke wali
□ Gambar bukti identik yang pernah dipakai → peringatan muncul

COMMAND
□ php artisan notify:low-balance → jalan tanpa error
□ php artisan notify:weekly-summary → jalan tanpa error
□ Command tidak crash bila ada wali tanpa pengaturan notifikasi

commit: "Fase 16: portal wali santri lengkap"
```

---

## CATATAN UNTUK ZIYAD

**Yang paling sering salah di halaman wali:**

1. **Bocor data internal ke response.** Controller yang ceroboh bisa
   mengirim seluruh model Member ke React, termasuk `pin`, `unit_cost`,
   dan kolom internal. Selalu buat DTO atau `only()` di setiap controller:
   ```php
   return Inertia::render('Wali/Home', [
       'children' => $guardian->members->map(fn($m) => [
           'id' => $m->id,
           'name' => $m->name,
           'class_name' => $m->class_name,
           'balance' => $m->balance_cache,
           'card_status' => $m->activeCard?->status,
           // JANGAN: 'pin', 'unit_cost', 'hpp', 'supplier_id'
       ]),
   ]);
   ```

2. **Guard tertukar.** Middleware `auth` (tanpa `:guardian`) akan mengarah
   ke guard web (staff). Semua route wali WAJIB pakai `auth:guardian`.

3. **Kompresi gambar bukti transfer.** Wali di desa sering punya kuota
   internet terbatas. Screenshot WhatsApp bisa 3-5MB. Tanpa kompresi,
   upload bisa gagal atau sangat lambat. Pastikan canvas.toBlob() jalan
   sebelum upload.

4. **Waktu relatif yang benar.** `date-fns/formatDistanceToNow` dengan
   locale `id` dan `addSuffix: true` menghasilkan "sekitar 2 jam yang lalu".
   Untuk "tadi" gunakan threshold < 5 menit.

5. **Polling yang efisien.** Poll hanya `/wali/api/notif-count` (satu angka
   integer), BUKAN seluruh daftar notifikasi. Ini menghemat bandwidth dan
   load server signifikan.
