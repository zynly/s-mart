<?php

namespace App\Exports;

use App\Models\DepositTransaction;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/**
 * REVISI-R1-v2.md §6.2 — ekspor Riwayat Penyesuaian Saldo (permintaan
 * eksplisit "prioritas khusus" pemilik toko). Hanya baris
 * `type='adjustment'`, kolom persis sama dengan tabel di layar supaya
 * tidak ada info tambahan/berkurang antara lihat dan unduh.
 */
class DepositAdjustmentExport implements FromQuery, WithHeadings, WithMapping
{
    public function __construct(
        private readonly ?int $memberId,
        private readonly ?string $from,
        private readonly ?string $to,
    ) {}

    public function query(): Builder
    {
        return DepositTransaction::query()
            ->where('type', 'adjustment')
            ->with(['member:id,name,member_number', 'approver:id,name'])
            ->when($this->memberId, fn ($q, $id) => $q->where('member_id', $id))
            ->when($this->from, fn ($q, $from) => $q->where('created_at', '>=', $from.' 00:00:00'))
            ->when($this->to, fn ($q, $to) => $q->where('created_at', '<=', $to.' 23:59:59'))
            ->orderByDesc('created_at');
    }

    public function headings(): array
    {
        return ['Tanggal', 'No. Anggota', 'Nama Anggota', 'Jenis', 'Nominal', 'Saldo Sebelum', 'Saldo Sesudah', 'Alasan', 'Dilakukan Oleh'];
    }

    public function map($row): array
    {
        return [
            $row->created_at->format('Y-m-d H:i'),
            $row->member?->member_number,
            $row->member?->name,
            $row->amount >= 0 ? 'Tambah' : 'Kurangi',
            $row->amount,
            $row->balance_before,
            $row->balance_after,
            $row->note,
            $row->approver?->name,
        ];
    }
}
