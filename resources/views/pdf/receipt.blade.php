<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 1.5mm; size: {{ $width ?? 58 }}mm auto; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 8pt; line-height: 1.2; color: #000; background: #fff; margin: 0; padding: 0; width: 100%; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 1.5mm 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 0; vertical-align: top; }
        .right { text-align: right; }
        .item-name { font-size: 8pt; font-weight: bold; word-break: break-word; }
        .totals td { padding-top: 0.5mm; }
        .small { font-size: 7.5pt; }
    </style>
</head>
<body>
    <div class="center bold">{{ $sale->outlet?->name ?? 'SKILLAGE MART' }}</div>
    <div class="center small">SMK Skill Village Islamic School</div>
    <div class="center small">Jonggol, Kab. Bogor</div>
    <div class="line"></div>
    <table class="small">
        <tr><td>No</td><td>: {{ $sale->reference }}</td></tr>
        <tr><td>Kasir</td><td>: {{ $sale->user?->name ?? 'Kasir' }}</td></tr>
        <tr><td>Tgl</td><td>: {{ $sale->sale_date ? (is_string($sale->sale_date) ? \Carbon\Carbon::parse($sale->sale_date)->format('d/m/Y H:i') : $sale->sale_date->format('d/m/Y H:i')) : $sale->created_at?->format('d/m/Y H:i') }}</td></tr>
    </table>
    <div class="line"></div>
    @foreach ($sale->items as $item)
        <div class="item-name">{{ $item->product?->name ?? 'Produk' }}</div>
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
        @if ($sale->total_discount > 0)
            <tr><td>Diskon</td><td class="right">Rp {{ number_format($sale->total_discount, 0, ',', '.') }}</td></tr>
        @endif
        <tr class="bold"><td>TOTAL</td><td class="right">Rp {{ number_format($sale->grand_total, 0, ',', '.') }}</td></tr>
        @foreach ($sale->payments as $payment)
            <tr>
                <td>BAYAR ({{ $payment->paymentMethod?->name ?? 'Tunai' }})</td>
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
        @if ($sale->payments->contains(fn ($p) => $p->paymentMethod?->type === 'deposit'))
            <table class="bold">
                <tr><td>Saldo Akhir</td><td class="right">Rp {{ number_format($sale->member->balance_cache ?? 0, 0, ',', '.') }}</td></tr>
            </table>
        @endif
        @if ($sale->payments->contains(fn ($p) => $p->paymentMethod?->type === 'credit'))
            <table class="bold">
                <tr><td>Status Pembayaran</td><td class="right">KREDIT / TEMPO</td></tr>
            </table>
        @endif
    @endif
    <div class="line"></div>
    <div class="center small">Terima kasih & barakallah</div>
    <div class="center small">Simpan struk sebagai bukti</div>
</body>
</html>
