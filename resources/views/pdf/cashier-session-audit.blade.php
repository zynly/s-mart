<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Audit Sesi Kasir — {{ $session->reference }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm 15mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            color: #1e293b;
            background: #fff;
            margin: 0;
            padding: 0;
        }
        .header-title {
            font-size: 14pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 2px;
        }
        .header-sub {
            font-size: 8.5pt;
            color: #64748b;
            margin-bottom: 12px;
        }
        .divider {
            border-bottom: 1.5px solid #cbd5e1;
            margin-bottom: 12px;
        }
        .section-title {
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            margin-top: 14px;
            margin-bottom: 6px;
            border-left: 3px solid #0284c7;
            padding-left: 6px;
        }
        .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
        }
        .info-grid td {
            padding: 6px 10px;
            font-size: 8.5pt;
            vertical-align: top;
        }
        .info-label {
            color: #64748b;
            font-weight: 500;
        }
        .info-value {
            color: #0f172a;
            font-weight: bold;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            margin-bottom: 10px;
        }
        table.data-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
            padding: 5px 8px;
            border: 1px solid #0f172a;
            text-align: left;
        }
        table.data-table td {
            padding: 5px 8px;
            border: 1px solid #e2e8f0;
            font-size: 8pt;
        }
        table.data-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 7.5pt;
            font-weight: bold;
        }
        .badge-success { background-color: #dcfce7; color: #166534; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .badge-danger { background-color: #fee2e2; color: #991b1b; }
        .badge-info { background-color: #e0f2fe; color: #075985; }
        .footer-note {
            margin-top: 20px;
            font-size: 7.5pt;
            color: #94a3b8;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
        }
    </style>
</head>
<body>
    <table style="width: 100%;">
        <tr>
            <td style="vertical-align: top;">
                <div class="header-title">AUDIT &amp; DETAIL SESI KASIR</div>
                <div class="header-sub">
                    No. Sesi: <strong class="font-mono" style="color: #0f172a;">{{ $session->reference }}</strong> • 
                    Outlet: <strong>{{ $session->outlet?->name ?? 'Outlet Utama' }}</strong>
                </div>
            </td>
            <td style="vertical-align: top; text-align: right;">
                <div style="font-size: 8pt; color: #64748b;">Tanggal Cetak:</div>
                <div style="font-size: 8.5pt; font-weight: bold;">{{ now()->translatedFormat('d F Y, H:i') }} WIB</div>
            </td>
        </tr>
    </table>

    <div class="divider"></div>

    <!-- Informasi Sesi -->
    <table class="info-grid">
        <tr>
            <td style="width: 25%;">
                <div class="info-label">Kasir Sesi:</div>
                <div class="info-value">{{ $session->user?->name ?? 'Kasir' }}</div>
            </td>
            <td style="width: 25%;">
                <div class="info-label">Laci Kasir:</div>
                <div class="info-value">{{ $session->cashAccount?->name ?? 'Laci Kasir' }}</div>
            </td>
            <td style="width: 25%;">
                <div class="info-label">Waktu Buka Sesi:</div>
                <div class="info-value">{{ $session->opened_at?->translatedFormat('d M Y, H:i') ?? '-' }}</div>
            </td>
            <td style="width: 25%;">
                <div class="info-label">Waktu Tutup Sesi:</div>
                <div class="info-value">
                    @if($session->closed_at)
                        {{ $session->closed_at->translatedFormat('d M Y, H:i') }}
                    @else
                        <span class="badge badge-success">Sesi Masih Buka</span>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <!-- Rincian Arus Kas -->
    <div class="section-title">Rincian Komplit Arus Kas Sesi Kasir</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 60%;">Komponen Arus Kas</th>
                <th style="width: 40%;" class="text-right">Nominal (Rp)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Modal Awal Kas</strong> (Opening Cash)</td>
                <td class="text-right font-mono font-bold">Rp {{ number_format($session->opening_cash, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>(+) Penjualan Tunai (Cash)</td>
                <td class="text-right font-mono font-bold" style="color: #166534;">+ Rp {{ number_format($session->total_sales_cash ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>(+) Penjualan Deposit Santri</td>
                <td class="text-right font-mono font-bold" style="color: #7e22ce;">+ Rp {{ number_format($session->total_sales_deposit ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>(+) Penjualan Non-Tunai (QRIS / EDC / Transfer)</td>
                <td class="text-right font-mono font-bold" style="color: #0369a1;">+ Rp {{ number_format($session->total_sales_noncash ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>(+) Penjualan Kredit / Piutang (Bon Santri)</td>
                <td class="text-right font-mono font-bold" style="color: #b45309;">+ Rp {{ number_format($session->total_sales_credit ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>(+) Topup Saldo Deposit Tunai</td>
                <td class="text-right font-mono font-bold" style="color: #166534;">+ Rp {{ number_format($session->total_topup_cash ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>(+) Pelunasan Piutang Kasir</td>
                <td class="text-right font-mono font-bold" style="color: #166534;">+ Rp {{ number_format($session->total_receivable_cash ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>(+) Kas Masuk Operasional Laci</td>
                <td class="text-right font-mono font-bold" style="color: #166534;">+ Rp {{ number_format($session->total_cash_in ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>(-) Kas Keluar Operasional / Tarik Deposit</td>
                <td class="text-right font-mono font-bold" style="color: #991b1b;">- Rp {{ number_format($session->total_cash_out ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td><strong>Expected Cash</strong> (Seharusnya di Laci)</td>
                <td class="text-right font-mono font-bold" style="font-size: 9pt;">Rp {{ number_format($session->expected_cash ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr style="background-color: #e2e8f0; font-weight: bold;">
                <td><strong>Actual Cash</strong> (Fisik Dihitung Saat Tutup)</td>
                <td class="text-right font-mono font-bold" style="font-size: 9pt;">Rp {{ number_format($session->actual_cash ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr style="background-color: {{ ($session->difference ?? 0) === 0 ? '#dcfce7' : '#fee2e2' }}; font-weight: bold;">
                <td><strong>Selisih Kas</strong> (Difference)</td>
                <td class="text-right font-mono font-bold" style="font-size: 9.5pt; color: {{ ($session->difference ?? 0) === 0 ? '#166534' : '#991b1b' }};">
                    {{ ($session->difference ?? 0) >= 0 ? '+' : '' }} Rp {{ number_format($session->difference ?? 0, 0, ',', '.') }}
                    ({{ ($session->difference ?? 0) === 0 ? '✓ Balanced' : 'Selisih' }})
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Mutasi Kas Operasional -->
    <div class="section-title">Riwayat Kas Masuk &amp; Kas Keluar Laci ({{ $session->cashTransactions->count() }} Transaksi)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 20%;">No. Referensi</th>
                <th style="width: 15%;">Waktu</th>
                <th style="width: 15%;">Jenis</th>
                <th style="width: 30%;">Kategori / Keterangan</th>
                <th style="width: 20%;" class="text-right">Nominal</th>
            </tr>
        </thead>
        <tbody>
            @forelse($session->cashTransactions as $trx)
                <tr>
                    <td class="font-mono font-bold">{{ $trx->reference }}</td>
                    <td>{{ $trx->created_at?->format('d/m/Y H:i') }}</td>
                    <td>
                        <span class="badge {{ $trx->type === 'in' ? 'badge-success' : 'badge-danger' }}">
                            {{ $trx->type === 'in' ? 'KAS MASUK' : 'KAS KELUAR' }}
                        </span>
                    </td>
                    <td>
                        <strong>{{ $trx->cashCategory?->name ?? ($trx->type === 'in' ? 'Kas Masuk' : 'Kas Keluar') }}</strong>
                        @if($trx->description)
                            <div style="color: #64748b; font-size: 7.5pt;">{{ $trx->description }}</div>
                        @endif
                    </td>
                    <td class="text-right font-mono font-bold {{ $trx->type === 'in' ? 'text-success' : 'text-danger' }}">
                        {{ $trx->type === 'in' ? '+' : '-' }} Rp {{ number_format($trx->amount, 0, ',', '.') }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="text-center" style="color: #64748b; font-style: italic; padding: 8px;">
                        Tidak ada mutasi kas masuk / keluar operasional selama sesi kasir ini.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Riwayat Nota Penjualan -->
    <div class="section-title">Riwayat Nota Penjualan ({{ $session->sales->count() }} Nota)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 20%;">No. Faktur</th>
                <th style="width: 15%;">Waktu</th>
                <th style="width: 25%;">Pelanggan / Anggota</th>
                <th style="width: 20%;">Metode Bayar</th>
                <th style="width: 20%;" class="text-right">Total Belanja</th>
            </tr>
        </thead>
        <tbody>
            @forelse($session->sales as $sale)
                <tr>
                    <td class="font-mono font-bold">{{ $sale->reference }}</td>
                    <td>{{ $sale->sale_date?->format('d/m/Y H:i') }}</td>
                    <td>
                        {{ $sale->member ? ($sale->member->name . ' (' . $sale->member->member_number . ')') : 'Pelanggan Umum' }}
                    </td>
                    <td>
                        {{ $sale->payments->map(fn($p) => $p->paymentMethod?->name ?? 'Tunai')->implode(', ') ?: 'Tunai' }}
                    </td>
                    <td class="text-right font-mono font-bold">Rp {{ number_format($sale->grand_total, 0, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="text-center" style="color: #64748b; font-style: italic; padding: 8px;">
                        Belum ada transaksi nota penjualan pada sesi kasir ini.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer-note">
        <table style="width: 100%;">
            <tr>
                <td style="width: 60%; vertical-align: top;">
                    Dokumen ini merupakan laporan audit resmi sesi kasir POS Skillage Mart.<br>
                    Sistem terenkripsi &amp; terintegrasi dengan jurnal akuntansi keuangan.
                </td>
                <td style="width: 40%; text-align: center; vertical-align: bottom;">
                    <div style="margin-bottom: 35px;">Petugas Kasir / Supervisor,</div>
                    <div style="font-weight: bold; text-decoration: underline;">( {{ $session->user?->name ?? '.......................' }} )</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
