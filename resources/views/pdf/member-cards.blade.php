<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    @include('pdf.partials.member-card-style')
    <style>
        @page { margin: 8mm 6mm; }
        body { font-family: Helvetica, Arial, sans-serif; }
        .grid { width: 100%; border-collapse: collapse; }
        .grid td { padding: 3.5mm 2.5mm; vertical-align: top; }
        .cut-guide { border: 0.15mm dashed #B5B5B5; padding: 1mm; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    {{--
        Cetak DUPLEX-siap: halaman cetak per 8 kartu (2 kolom x 4 baris = 8 kartu/lembar A4).
        Sisi DEPAN diurutkan biasa (kiri ke kanan), sedangkan sisi BELAKANG dicerminkan
        (kanan ke kiri) agar saat kertas dibalik horizontal (duplex long-edge), sisi depan
        dan belakang tiap kartu pas & presisi sejajar saat dipotong.
    --}}
    @foreach ($cards->chunk(8) as $pageIndex => $pageCards)
        @if ($pageIndex > 0)
            <div class="page-break"></div>
        @endif

        {{-- Sisi DEPAN (Front) --}}
        <table class="grid">
            @foreach ($pageCards->chunk(2) as $row)
                <tr>
                    @foreach ($row as $item)
                        <td>
                            <div class="cut-guide">
                                @include('pdf.partials.member-card-item', ['member' => $item['member'], 'card' => $item['card'], 'barcode' => $item['barcode']])
                            </div>
                        </td>
                    @endforeach
                    @if ($row->count() < 2)
                        <td></td>
                    @endif
                </tr>
            @endforeach
        </table>

        <div class="page-break"></div>

        {{-- Sisi BELAKANG (Back) — Cermin horizontal per baris untuk Duplex Alignment --}}
        <table class="grid">
            @foreach ($pageCards->chunk(2) as $row)
                <tr>
                    @if ($row->count() < 2)
                        <td></td>
                    @endif
                    @foreach ($row->reverse() as $item)
                        <td>
                            <div class="cut-guide">
                                @include('pdf.partials.member-card-back', ['member' => $item['member'], 'card' => $item['card'], 'barcode' => $item['barcode'] ?? null])
                            </div>
                        </td>
                    @endforeach
                </tr>
            @endforeach
        </table>
    @endforeach
</body>
</html>

