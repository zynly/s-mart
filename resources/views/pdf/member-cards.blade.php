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
        Cetak DUPLEX-siap: halaman 1 = seluruh sisi DEPAN, halaman 2 =
        seluruh sisi BELAKANG, dalam URUTAN GRID YANG SAMA PERSIS —
        supaya saat dicetak bolak-balik (duplex) dan disusun, depan
        dan belakang tiap kartu sejajar. TIDAK diselang-seling
        depan/belakang per kartu (itu akan merusak alur potong-tempel
        operator percetakan).
    --}}
    <table class="grid">
        @foreach ($cards->chunk(2) as $row)
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

    <table class="grid">
        @foreach ($cards->chunk(2) as $row)
            <tr>
                @foreach ($row as $item)
                    <td>
                        <div class="cut-guide">
                            @include('pdf.partials.member-card-back', ['member' => $item['member'], 'card' => $item['card']])
                        </div>
                    </td>
                @endforeach
                @if ($row->count() < 2)
                    <td></td>
                @endif
            </tr>
        @endforeach
    </table>
</body>
</html>
