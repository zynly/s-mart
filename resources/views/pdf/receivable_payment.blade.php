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
        .totals td { padding-top: 0.5mm; }
        .small { font-size: 7.5pt; }
    </style>
</head>
<body>
    <div class="center bold">{{ $payment->receivable?->outlet?->name ?? 'SKILLAGE MART' }}</div>
    <div class="center small">SMK Skill Village Islamic School</div>
    <div class="center small">Jonggol, Kab. Bogor</div>
    <div class="line"></div>
    <div class="center bold">BUKTI PEMBAYARAN PIUTANG</div>
    <div class="line"></div>
    <table class="small">
        <tr><td>No Kuitansi</td><td>: {{ $payment->reference }}</td></tr>
        <tr><td>Petugas</td><td>: {{ $payment->creator?->name ?? 'Kasir' }}</td></tr>
        <tr><td>Tanggal</td><td>: {{ $payment->created_at?->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i') }}</td></tr>
    </table>
    <div class="line"></div>
    <table class="small">
        <tr><td>Anggota</td><td>: {{ $payment->receivable?->member?->name ?? '-' }}</td></tr>
        <tr><td>No. Anggota</td><td>: {{ $payment->receivable?->member?->member_number ?? '-' }}</td></tr>
        <tr><td>Tipe</td><td>: {{ strtoupper($payment->receivable?->member?->type ?? '-') }}</td></tr>
    </table>
    <div class="line"></div>
    <div class="bold small">RINCIAN ALOKASI NOTA:</div>
    <table class="small">
        <tr><td>No. Faktur</td><td class="right">{{ $payment->receivable?->sale?->reference ?? $payment->receivable?->reference }}</td></tr>
        <tr><td>Total Tagihan</td><td class="right">Rp {{ number_format($payment->receivable?->total_amount ?? 0, 0, ',', '.') }}</td></tr>
        <tr><td>Sisa Sebelum</td><td class="right">Rp {{ number_format(($payment->receivable?->remaining_amount ?? 0) + $payment->amount, 0, ',', '.') }}</td></tr>
    </table>
    <div class="line"></div>
    <table class="totals">
        <tr class="bold">
            <td>JUMLAH BAYAR</td>
            <td class="right">Rp {{ number_format($payment->amount, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td>Metode Bayar</td>
            <td class="right">{{ strtoupper($payment->payment_method) }}</td>
        </tr>
        @if ($payment->note)
            <tr>
                <td>Catatan</td>
                <td class="right">{{ $payment->note }}</td>
            </tr>
        @endif
        <tr class="bold">
            <td>SISA NOTA INI</td>
            <td class="right">Rp {{ number_format($payment->receivable?->remaining_amount ?? 0, 0, ',', '.') }}</td>
        </tr>
    </table>
    <div class="line"></div>
    <div class="center small">Simpan struk ini sebagai bukti pembayaran yang sah.</div>
    <div class="center small bold">Terima kasih atas pembayarannya.</div>
</body>
</html>
