{{-- REVISI-R1-v2.md §9.1 — token warna & ukuran persis sesuai spesifikasi. --}}
<style>
    .member-card {
        width: 85.6mm;
        height: 54mm;
        position: relative;
        background-color: #FAFAF8;
        border: 0.35mm solid rgba(216, 216, 216, 0.7);
        border-radius: 2.6mm; /* ~28-30px pada referensi cetak 300dpi */
        overflow: hidden;
        box-sizing: border-box;
    }

    /* Pola geometris islami — repeating-linear-gradient (tanpa aset
       eksternal, rendering dompdf paling andal) menggantikan SVG/PNG
       tiling; kesan "garis bersudut" tercapai dari dua arah diagonal
       yang saling silang. */
    .card-pattern {
        position: absolute;
        inset: 0;
        opacity: 0.16;
        background-image:
            repeating-linear-gradient(45deg, #C7CBD1 0, #C7CBD1 1.5px, transparent 1.5px, transparent 10px),
            repeating-linear-gradient(-45deg, #C7CBD1 0, #C7CBD1 1.5px, transparent 1.5px, transparent 10px);
    }

    /* Ornamen navy bertumpuk kanan-atas — dua bidang miring dengan gradasi
       warna sesuai palet spesifikasi, ditumpuk memakai border-radius
       elips supaya berkesan bidang lengkung/diagonal. */
    .card-ornament {
        position: absolute;
        top: -14mm;
        right: -10mm;
        width: 34mm;
        height: 30mm;
        background: linear-gradient(135deg, #115C82 0%, #0A4C72 45%, #07395A 75%, #042A45 100%);
        border-radius: 40% 45% 60% 35%;
        transform: rotate(18deg);
        opacity: 0.97;
    }

    .card-logos {
        position: absolute;
        top: 2.2mm;
        left: 3mm;
        display: table;
        width: auto;
    }

    .card-logo {
        display: inline-block;
        height: 4.6mm;
        margin-right: 2mm;
        vertical-align: middle;
    }

    .card-logo-placeholder {
        width: 8mm;
        height: 4.6mm;
        line-height: 4.6mm;
        text-align: center;
        font-family: Helvetica, Arial, sans-serif;
        font-size: 4.5pt;
        font-weight: bold;
        color: #8A8A8A;
        background-color: #ECECEC;
        border: 0.2mm solid #D8D8D8;
    }

    .card-content {
        position: absolute;
        top: 9.5mm;
        left: 3mm;
        right: 3mm;
    }

    .card-photo {
        position: absolute;
        top: 0;
        left: 0;
        width: 16.5mm;
        height: 22.9mm;
        background-color: #D9D9D9;
        text-align: center;
        vertical-align: middle;
        line-height: 22.9mm;
        font-family: Courier, monospace;
        font-weight: bold;
        font-size: 6.5pt;
        color: #252525;
        overflow: hidden;
    }

    .card-photo img {
        width: 16.5mm;
        height: 22.9mm;
        object-fit: cover;
    }

    .card-info {
        margin-left: 19.5mm;
        padding-top: 0.5mm;
    }

    .info-row { margin-bottom: 1.8mm; }

    .info-label {
        font-family: Helvetica, Arial, sans-serif;
        font-weight: bold;
        font-size: 6pt;
        letter-spacing: 0.3pt;
        color: #111111;
    }

    .info-value {
        font-family: Courier, monospace;
        font-size: 5.5pt;
        color: #111111;
        line-height: 1.45;
        margin-top: 0.3mm;
    }

    .card-barcode {
        position: absolute;
        right: 3mm;
        bottom: 5.5mm;
        text-align: center;
        background-color: #FFFFFF;
        padding: 0.7mm 1mm;
    }

    .card-barcode img { height: 8mm; }

    .barcode-number {
        font-family: Courier, monospace;
        font-size: 5pt;
        letter-spacing: 0.5pt;
        color: #0F1B33;
        margin-top: 0.3mm;
    }

    .card-footer {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4.2mm;
        line-height: 4.2mm;
        text-align: center;
        font-family: Courier, monospace;
        font-weight: bold;
        font-size: 5pt;
        letter-spacing: 0.4pt;
        color: #333333;
        border-top: 0.25mm dashed rgba(122, 122, 122, 0.75);
        background-color: #FAFAF8;
        z-index: 5;
    }

    /* ================== SISI BELAKANG ================== */

    /* Ornamen emas bertumpuk kanan-atas — palet `mustard` aplikasi
       (resources/css/app.css §2 REVISI-R1), bukan amber terpisah,
       supaya kartu tetap satu identitas visual dengan seluruh
       aplikasi. Bentuk sama seperti .card-ornament (elips miring)
       supaya depan/belakang terasa senada. */
    .card-ornament-gold {
        position: absolute;
        top: -13mm;
        right: -9mm;
        width: 32mm;
        height: 28mm;
        background: linear-gradient(135deg, #EBC95D 0%, #E0B02F 40%, #C9A227 75%, #A8831F 100%);
        border-radius: 42% 48% 58% 38%;
        transform: rotate(-14deg);
        opacity: 0.95;
    }

    /* Aksen navy diagonal kiri-bawah — bidang tipis miring, referensi
       "ribbon" navy di pojok kartu (lihat docs/member.vue, elemen
       murni inspirasi visual, bukan kode yang dipakai). */
    .card-ornament-navy-strip {
        position: absolute;
        bottom: -3mm;
        left: -6mm;
        width: 26mm;
        height: 7mm;
        background: #152E56;
        transform: skewX(-28deg);
    }

    .card-back-content {
        position: absolute;
        top: 4.5mm;
        left: 3.5mm;
        right: 5mm;
        bottom: 6mm;
    }

    .terms-title {
        font-family: Helvetica, Arial, sans-serif;
        font-weight: bold;
        font-size: 7pt;
        letter-spacing: 0.4pt;
        text-transform: uppercase;
        color: #0F1B33;
        margin: 0 0 2mm;
    }

    .terms-list {
        margin: 0;
        padding-left: 3mm;
        list-style: disc;
    }

    .terms-list li {
        font-family: Helvetica, Arial, sans-serif;
        font-size: 5.5pt;
        line-height: 1.55;
        color: #1B2A4A;
        margin-bottom: 1mm;
    }
</style>
