<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Rekonsiliasi Konsinyasi — {{ $settlement->reference }}</title>
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
        .header-table {
            width: 100%;
            margin-bottom: 12px;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 8px;
        }
        .header-title {
            font-size: 15pt;
            font-weight: bold;
            color: #0f172a;
            margin: 0;
        }
        .header-sub {
            font-size: 8.5pt;
            color: #64748b;
            margin-top: 2px;
        }
        .ref-badge {
            text-align: right;
            vertical-align: top;
        }
        .ref-number {
            font-size: 11pt;
            font-weight: bold;
            color: #0284c7;
            font-family: 'Courier New', Courier, monospace;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            font-size: 8pt;
            font-weight: bold;
            border-radius: 4px;
            text-transform: uppercase;
            margin-top: 4px;
        }
        .status-draft { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .status-approved { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .status-paid { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
        }
        .info-table td {
            padding: 6px 10px;
            font-size: 8.5pt;
            vertical-align: top;
        }
        .info-label {
            color: #64748b;
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 2px;
        }
        .info-value {
            font-weight: 600;
            color: #1e293b;
        }

        .section-title {
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #334155;
            margin-top: 14px;
            margin-bottom: 6px;
            border-left: 3px solid #0284c7;
            padding-left: 6px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 8.5pt;
        }
        .data-table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            text-align: left;
        }
        .data-table td {
            padding: 5px 8px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .data-table tr:nth-child(even) {
            background: #f8fafc;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .bold { font-weight: bold; }

        .summary-box {
            width: 100%;
            margin-bottom: 20px;
        }
        .summary-table {
            width: 50%;
            margin-left: auto;
            border-collapse: collapse;
            font-size: 8.5pt;
        }
        .summary-table td {
            padding: 4px 8px;
        }
        .summary-table .highlight-row {
            background: #f0fdf4;
            border-top: 2px solid #22c55e;
            border-bottom: 2px solid #22c55e;
            font-weight: bold;
            font-size: 10pt;
            color: #15803d;
        }

        .signatures {
            width: 100%;
            margin-top: 30px;
            border-collapse: collapse;
        }
        .signatures td {
            width: 50%;
            text-align: center;
            vertical-align: top;
            font-size: 8.5pt;
        }
        .signature-space {
            height: 60px;
        }
        .signature-name {
            font-weight: bold;
            text-decoration: underline;
        }
        .signature-title {
            font-size: 7.5pt;
            color: #64748b;
        }

        .footer {
            margin-top: 20px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
            font-size: 7.5pt;
            color: #94a3b8;
            text-align: center;
        }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td>
                <div class="header-title">SKILLAGE MART</div>
                <div class="header-sub">SMK Skill Village Islamic School · Jonggol, Kab. Bogor</div>
                <div class="header-sub">Slip Rekonsiliasi & Penyelesaian Barang Titipan (Konsinyasi)</div>
            </td>
            <td class="ref-badge">
                <div class="ref-number">{{ $settlement->reference }}</div>
                <div>
                    @if ($settlement->status === 'paid')
                        <span class="status-badge status-paid">LUNAS</span>
                    @elseif ($settlement->status === 'approved')
                        <span class="status-badge status-approved">DISETUJUI</span>
                    @else
                        <span class="status-badge status-draft">DRAFT</span>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <table class="info-table">
        <tr>
            <td style="width: 35%;">
                <div class="info-label">Mitra / Supplier Konsinyor</div>
                <div class="info-value">{{ $settlement->supplier->name }} ({{ $settlement->supplier->code }})</div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">
                    {{ $settlement->supplier->phone ?? '-' }} · {{ $settlement->supplier->address ?? '-' }}
                </div>
            </td>
            <td style="width: 35%;">
                <div class="info-label">Periode Penjualan</div>
                <div class="info-value">
                    {{ \Carbon\Carbon::parse($settlement->period_start)->format('d M Y') }} s/d {{ \Carbon\Carbon::parse($settlement->period_end)->format('d M Y') }}
                </div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">
                    Outlet: {{ $settlement->outlet->name }}
                </div>
            </td>
            <td style="width: 30%;">
                <div class="info-label">Status & Tanggal Bayar</div>
                <div class="info-value">
                    @if ($settlement->paid_at)
                        {{ \Carbon\Carbon::parse($settlement->paid_at)->format('d M Y H:i') }}
                    @else
                        Belum Dibayarkan
                    @endif
                </div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">
                    Sumber Kas: {{ $settlement->cashAccount?->name ?? 'Kas Default Mart' }}
                </div>
            </td>
        </tr>
    </table>

    <div class="section-title">Rincian Barang Terjual</div>
    <table class="data-table">
        <thead>
            <tr>
                <th class="text-center" style="width: 4%;">No</th>
                <th style="width: 27%;">Nama Produk</th>
                <th class="text-center" style="width: 9%;">Qty Laku</th>
                <th class="text-right" style="width: 12%;">Harga Titipan</th>
                <th class="text-right" style="width: 12%;">Harga Jual</th>
                <th class="text-right" style="width: 13%;">Total Omzet</th>
                <th class="text-right" style="width: 10%;">Komisi</th>
                <th class="text-right" style="width: 13%;">Hak Pemasok</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($settlement->items as $index => $item)
                @php
                    $consignmentPrice = $item->qty_sold > 0 ? (int) round($item->payable / $item->qty_sold) : 0;
                @endphp
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>
                        <div class="bold">{{ $item->product->name }}</div>
                        <div class="font-mono" style="font-size: 7.5pt; color: #64748b;">SKU: {{ $item->product->sku }}</div>
                    </td>
                    <td class="text-center">
                        {{ number_format((float) $item->qty_sold, 0, ',', '.') }}
                        <span style="font-size: 7pt; color: #64748b;">{{ $item->product->baseUnit?->symbol ?? 'pcs' }}</span>
                    </td>
                    <td class="text-right font-mono" style="color: #059669;">Rp {{ number_format($consignmentPrice, 0, ',', '.') }}</td>
                    <td class="text-right font-mono">Rp {{ number_format($item->unit_price, 0, ',', '.') }}</td>
                    <td class="text-right font-mono">Rp {{ number_format($item->total_price, 0, ',', '.') }}</td>
                    <td class="text-right font-mono" style="color: #0284c7;">Rp {{ number_format($item->commission, 0, ',', '.') }}</td>
                    <td class="text-right font-mono bold">Rp {{ number_format($item->payable, 0, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="text-center" style="padding: 12px; color: #94a3b8;">
                        Tidak ada barang titipan yang terjual pada periode ini.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="summary-box">
        <table class="summary-table">
            <tr>
                <td>Total Penjualan Kotor (Omzet)</td>
                <td class="text-right font-mono">Rp {{ number_format($settlement->total_sold, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Potongan Komisi Mart ({{ $settlement->commission_percent }}%)</td>
                <td class="text-right font-mono" style="color: #0284c7;">- Rp {{ number_format($settlement->commission_amount, 0, ',', '.') }}</td>
            </tr>
            <tr class="highlight-row">
                <td>TOTAL BERSIH DIBAYAR</td>
                <td class="text-right font-mono">Rp {{ number_format($settlement->payable_amount, 0, ',', '.') }}</td>
            </tr>
        </table>
    </div>

    <table class="signatures">
        <tr>
            <td>
                <div>Diserahkan oleh,</div>
                <div class="signature-title">Skillage Mart</div>
                <div class="signature-space"></div>
                <div class="signature-name">{{ $settlement->approver?->name ?? $settlement->creator?->name ?? 'Pengelola Mart' }}</div>
                <div class="signature-title">Admin / Kasir / Bendahara</div>
            </td>
            <td>
                <div>Diterima oleh,</div>
                <div class="signature-title">Pemasok / Pemilik Barang</div>
                <div class="signature-space"></div>
                <div class="signature-name">{{ $settlement->supplier->contact_person ?? $settlement->supplier->name }}</div>
                <div class="signature-title">Mitra Konsinyor</div>
            </td>
        </tr>
    </table>

    <div class="footer">
        Dicetak otomatis oleh Sistem POS Skillage Mart pada {{ now()->format('d/m/Y H:i:s') }}. Dokumen ini merupakan bukti sah rekonsiliasi dan serah terima dana bagi hasil konsinyasi.
    </div>

</body>
</html>
