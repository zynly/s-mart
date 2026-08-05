<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    @include('pdf.partials.member-card-style')
    <style>
        @page { margin: 0; size: 100mm 150mm; }
        body { font-family: Helvetica, Arial, sans-serif; margin: 8mm; }
        .preview-label {
            font-size: 8pt;
            font-weight: bold;
            color: #5F5440;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            margin: 0 0 2mm;
        }
        .preview-gap { height: 8mm; }
    </style>
</head>
<body>
    {{-- Depan DAN belakang berurutan dalam satu halaman pratinjau —
         supaya operator bisa cek keduanya sebelum cetak massal (sesuai
         niat asli: pratinjau dulu sebelum menghabiskan kertas). --}}
    <p class="preview-label">Tampak Depan</p>
    @include('pdf.partials.member-card-item', ['member' => $member, 'card' => $card, 'barcode' => $barcode])

    <div class="preview-gap"></div>

    <p class="preview-label">Tampak Belakang</p>
    @include('pdf.partials.member-card-back', ['member' => $member, 'card' => $card])
</body>
</html>
