{{--
    Sisi BELAKANG kartu member — fitur baru (belum pernah dibuat
    sebelumnya). Dipakai bersama oleh cetak massal
    (member-cards.blade.php, halaman 2) dan pratinjau
    (member-card-preview.blade.php), sama seperti sisi depan.

    Desain: ornamen emas (token `mustard` aplikasi, BUKAN warna amber
    terpisah — dikonfirmasi user) bertumpuk kanan-atas + aksen navy
    diagonal kiri-bawah, daftar Ketentuan Penggunaan, footer senada
    sisi depan supaya depan/belakang terasa satu keluarga desain.
--}}
<div class="member-card member-card-back">
    <div class="card-pattern"></div>

    <div class="card-ornament-gold"></div>
    <div class="card-ornament-navy-strip"></div>

    <div class="card-back-content">
        <p class="terms-title">Ketentuan Penggunaan</p>
        <ul class="terms-list">
            <li>Kartu ini hanya berlaku untuk santri aktif.</li>
            <li>Wajib dibawa saat bertransaksi di Skillage Mart.</li>
            <li>Tidak dapat dipindahtangankan.</li>
            <li>Jika hilang, segera laporkan kepada pengelola.</li>
        </ul>
    </div>

    <div class="card-footer">SKILLAGE MART &middot; {{ $card->card_number }}</div>
</div>
