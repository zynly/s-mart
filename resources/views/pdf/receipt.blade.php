<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 2mm; }
        body { font-family: 'Courier New', monospace; font-size: 9pt; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 2mm 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 0; vertical-align: top; }
        .right { text-align: right; }
        .item-name { font-size: 9pt; }
        .totals td { padding-top: 1mm; }
        .small { font-size: 7.5pt; }
    </style>
</head>
<body>
    <div class="center bold">SKILLAGE MART</div>
    <div class="center small">SMK Skill Village Islamic School</div>
    <div class="center small">Jonggol, Kab. Bogor</div>
    <div class="line"></div>
    <table class="small">
        <tr><td>No</td><td>: {{ $sale->reference }}</td></tr>
        <tr><td>Kasir</td><td>: {{ $sale->user->name }}</td></tr>
        <tr><td>Tgl</td><td>: {{ $sale->sale_date->format('d/m/Y H:i') }}</td></tr>
    </table>
    <div class="line"></div>
    @foreach ($sale->items as $item)
        <div class="item-name">{{ $item->product->name }}</div>
        <table>
            <tr>
                <td>{{ rtrim(rtrim(number_format((float) $item->qty, 3), '0'), '.') }} x {{ number_format($item->unit_price, 0, ',', '.') }}</td>
                <td class="right">{{ number_format($item->subtotal, 0, ',', '.') }}</td>
            </tr>
        </table>
    @endforeach
    <div class="line"></div>
    <table class="totals">
        <tr><td>Subtotal</td><td class="right">Rp {{ number_format($sale->subtotal, 0, ',', '.') }}</td></tr>
        <tr><td>Diskon</td><td class="right">Rp {{ number_format($sale->total_discount, 0, ',', '.') }}</td></tr>
        <tr class="bold"><td>TOTAL</td><td class="right">Rp {{ number_format($sale->grand_total, 0, ',', '.') }}</td></tr>
        @foreach ($sale->payments as $payment)
            <tr>
                <td>BAYAR ({{ $payment->paymentMethod->name }})</td>
                <td class="right">Rp {{ number_format($payment->amount, 0, ',', '.') }}</td>
            </tr>
        @endforeach
        @if ($sale->change_amount > 0)
            <tr><td>KEMBALI</td><td class="right">Rp {{ number_format($sale->change_amount, 0, ',', '.') }}</td></tr>
        @endif
    </table>
    @if ($sale->member)
        <div class="line"></div>
        <div>{{ $sale->member->name }} / {{ $sale->member->class_name ?? '-' }} {{ $sale->member->major ?? '' }}</div>
        @if ($sale->payments->contains(fn ($p) => $p->paymentMethod->type === 'deposit'))
            <table class="bold">
                <tr><td>Saldo Akhir</td><td class="right">Rp {{ number_format($sale->member->fresh()->balance_cache, 0, ',', '.') }}</td></tr>
            </table>
        @endif
    @endif
    <div class="line"></div>
    <div class="center small">Terima kasih & barakallah</div>
    <div class="center small">Simpan struk sebagai bukti</div>
</body>
</html>
