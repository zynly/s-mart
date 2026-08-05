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
    </style>
</head>
<body>
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
</body>
</html>
