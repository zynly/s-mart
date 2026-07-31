<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 10mm 8mm; }
        body { font-family: Helvetica, Arial, sans-serif; }
        .grid { width: 100%; border-collapse: collapse; }
        .grid td { padding: 3mm; vertical-align: top; }
        .card {
            width: 85.6mm; height: 54mm; border: 0.3mm dashed #999;
            border-radius: 2mm; overflow: hidden; position: relative;
        }
        .card-header {
            background-color: #1B3A6B; color: #fff; padding: 2mm 3mm;
            font-size: 8pt;
        }
        .card-header .brand { font-weight: bold; font-size: 10pt; }
        .card-body { padding: 2mm 3mm; }
        .card-body table { width: 100%; border-collapse: collapse; }
        .photo-cell { width: 16mm; }
        .photo-box {
            width: 14mm; height: 16mm; background-color: #DCE5F2;
            border: 0.2mm solid #B9CBE5; text-align: center; color: #2E5490;
            font-size: 7pt; vertical-align: middle;
        }
        .name { font-weight: bold; font-size: 10pt; color: #0F1B33; }
        .meta { font-size: 8pt; color: #1B2A4A; }
        .barcode-cell { text-align: center; padding-top: 2mm; }
        .barcode-cell img { height: 10mm; }
        .barcode-number { font-size: 7pt; letter-spacing: 1pt; color: #0F1B33; }
        .card-footer {
            position: absolute; bottom: 0; left: 0; right: 0;
            font-size: 6pt; text-align: center; color: #5478B0;
            padding: 1mm; border-top: 0.2mm solid #B9CBE5;
        }
    </style>
</head>
<body>
    <table class="grid">
        @foreach ($cards->chunk(2) as $row)
            <tr>
                @foreach ($row as $item)
                    <td>
                        <div class="card">
                            <div class="card-header">
                                <div class="brand">SKILLAGE MART</div>
                                <div>SMK Skill Village Islamic School</div>
                            </div>
                            <div class="card-body">
                                <table>
                                    <tr>
                                        <td class="photo-cell">
                                            <div class="photo-box">Foto</div>
                                        </td>
                                        <td>
                                            <div class="name">{{ $item['member']->name }}</div>
                                            <div class="meta">{{ $item['member']->class_name ?? '-' }} &middot; {{ $item['member']->major ?? '-' }}</div>
                                            <div class="meta">NIS: {{ $item['member']->nis ?? '-' }}</div>
                                        </td>
                                    </tr>
                                </table>
                                <div class="barcode-cell">
                                    <img src="data:image/png;base64,{{ $item['barcode'] }}" alt="barcode">
                                    <div class="barcode-number">{{ $item['card']->card_number }}</div>
                                </div>
                            </div>
                            <div class="card-footer">Berlaku selama menjadi santri</div>
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
