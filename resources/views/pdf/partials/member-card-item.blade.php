{{--
    REVISI-R1-v2.md §9 — kartu anggota, dipakai bersama oleh cetak
    massal (member-cards.blade.php) dan pratinjau satu kartu
    (member-card-preview.blade.php) supaya keduanya PERSIS identik.

    Catatan font (lihat laporan implementasi §8 "Temuan Tambahan"):
    spesifikasi asli minta Poppins/Inter SemiBold (label) dan IBM Plex
    Mono/Space Mono (data) — font-file-nya TIDAK tersedia di proyek ini
    dan tidak bisa diunduh dari sesi ini. Diganti font dasar dompdf yang
    SELALU tersedia tanpa embed (Helvetica bold utk label, Courier utk
    data) supaya render PDF terjamin benar, bukan diam-diam fallback
    kalau font custom gagal dimuat. Ganti ke font asli kapan saja
    dengan menaruh file .ttf di resources/fonts lalu daftarkan
    @font-face di sini — struktur CSS class sudah disiapkan.
--}}
<div class="member-card">
    <div class="card-pattern"></div>

    <div class="card-ornament"></div>

    <div class="card-logos">
        @php
            $logoFiles = ['logo1.jpeg', 'logo2.png', 'logo3.jpeg'];
        @endphp
        @foreach ($logoFiles as $logoFile)
            @php $logoPath = public_path('logo/'.$logoFile); @endphp
            @if (file_exists($logoPath))
                <img src="{{ $logoPath }}" alt="Logo" class="card-logo">
            @else
                <div class="card-logo card-logo-placeholder">LOGO</div>
            @endif
        @endforeach
    </div>

    <div class="card-content">
        <div class="card-photo">
            @php
                $photoPath = $member->photo ? storage_path('app/public/'.$member->photo) : null;
            @endphp
            @if ($photoPath && file_exists($photoPath))
                <img src="{{ $photoPath }}" alt="Foto">
            @else
                <span>FOTO</span>
            @endif
        </div>

        <div class="card-info">
            <div class="info-row">
                <div class="info-label">FULL NAME</div>
                <div class="info-value">{{ strtoupper($member->name) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">NIS</div>
                <div class="info-value">{{ $member->nis ?? '—' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">KELAS</div>
                <div class="info-value">{{ $member->class_name ?? '—' }}@if($member->major) &middot; {{ $member->major }} @endif</div>
            </div>
        </div>
    </div>

    <div class="card-barcode">
        <img src="data:image/png;base64,{{ $barcode }}" alt="barcode">
        <div class="barcode-number">{{ $card->card_number }}</div>
    </div>

    <div class="card-footer">BERLAKU SELAMA MENJADI SANTRI</div>
</div>
